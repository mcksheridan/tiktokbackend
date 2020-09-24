var mongoose = require('mongoose');

var Video = require('../models/video');
var List = require('../models/bookmarklist');

const validator = require('express-validator');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
const { http, https } = require('follow-redirects');
var async = require('async')
var fetch = require('node-fetch');

// Display list of all bookmark lists.
//exports.list_list = function(req, res, next) {
/*    List.find()
    .populate('videos')
    .exec(function (err, list_lists) {
        if (err) {return next(err); }
        res.render('list_list', { title: 'List of Lists',list_list: list_lists})
    })*/
//};

// Display detail page for a specific bookmark list.
exports.list_detail = function(req, res, next) {
    //res.send('NOT IMPLEMENTED: List detail: ' + req.params.id);
    var id = mongoose.Types.ObjectId(req.params.id);  
    async.parallel({
        list_list: function(callback) {
            List.find({'_id': {$ne: id}}, callback)
            .sort([['name', 'ascending']])
        },
        list: function(callback) {
            List.findById(id)
            .populate('videos')
            .exec(callback);
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.list==null) { // No results.
            var err = new Error('List not found');
            err.status = 404;
            return next(err);
        }
        res.render('list_detail', { title: `TikTok Favorites: ${results.list.name}`, list: results.list, list_list: results.list_list, })
    })
};

// Handle List create on POST.
exports.list_create_post = [
    validator.body('list_name', 'Please enter a valid name.').trim().escape()
    .isLength( {min: 1, max: 100} ).withMessage('Please enter a name between 1 and 100 characters.'),
    validator.sanitizeBody('list_name'),
    (req, res, next) => {
        const errors = validator.validationResult(req);
        let listname = { name: req.body.list_name }
        var list = new List(listname)
        if (!errors.isEmpty()) {
            res.render('/', { list: list, error: errors.array()});
            return;
        }
        else {
            List.findOne({ 'name': req.body.list_name })
            .exec( function(err, found_list) {
                if(err) { return next(err); }
                if (found_list) {
                    console.log('Found a list with that name')
                    res.redirect(found_list._id)
                }
                else {
                    list.save(function (err) {
                        if (err) { return next(err); }
                        console.log('List added')
                        res.redirect(list._id)
                    })
                }
            })
        }
    }
];

exports.list_delete_video_post = function(req, res, next) {
    //mongoose.Types.ObjectId(req.params.id);  
    const videos = req.body.deleted_video
    const referer = req.header('referer')
    const refererArray = referer.split('/')
    const refererLength = refererArray.length
    const id = refererArray[refererLength - 1].toString()
    const videoString = videos.toString()
    const videoid = videoString.split(',')
    if (videoid === '') {
        console.log('Please select a video for deletion')
        res.send('Please select a video for deletion.')
    } else {
        List.findByIdAndUpdate( { _id: id }, { $pull: { videos: { $in: videoid } } }, function(err) {
            if(err) { return next(err) }
            res.redirect(id)
            console.log(`Deleted ${videoid.length} video(s) to list ${id}`)
        })
    }
}

// Add a video to a specific list POST
exports.list_add_video_post = [
    validator.body('video_url', 'Please enter a valid TikTok URL.').trim().isURL( { protocols: ['http','https'], require_protocol: true, } ).withMessage('Please enter a URL beginning with https://')
    .contains('tiktok.com', { ignoreCase: true }).withMessage('Please enter a URL from TikTok.com'),
    validator.sanitizeBody('video_url'),
    (req, res, next) => {
        const errors = validator.validationResult(req);
        const referer = req.header('referer')
        const refererArray = referer.split('/')
        const refererLength = refererArray.length
        const id = refererArray[refererLength - 1].toString()
        https.get(req.body.video_url, response => {
            const redirectedUrl = response.responseUrl
            fetch(`https://www.tiktok.com/oembed?url=${redirectedUrl}`)
            .then((fetchResponse) => fetchResponse.json())
            .then((data) => {
              let videodetail = { video_url: redirectedUrl }
              videodetail.title = data.title
              videodetail.author_url = data.author_url
              videodetail.author_name = data.author_name
              if (req.body.date !== false) videodetail.date = req.body.date
              var video = new Video(videodetail);
              if (!errors.isEmpty()) {
                res.render(id, { video: video, error: errors.array()});
                return;
            } else {
                // Does this video exist in the current list?
                // Get the titles and authors of the current videos in the list
                // Compare against the new video
                List.findById(id)
                .populate('videos')
                .exec(function (err, list) {
                    if(err) { return next(err) }
                    else {
                        for (let i = 0; i < list['videos'].length; i++) {
                            if (list['videos'][i].author_name === video.author_name) {
                                if (list['videos'][i].author_name === video.author_name) {
                                    console.log('A video with that name and author exists in this list.')
                                    res.redirect(list._id)
                                    return
                                }
                            }
                        }
                        // Does this video exist in the list of videos?
                        Video.findOne( { title: videodetail.title, author_name: videodetail.author_name } )
                        .exec( function(err, found_video) {
                            if (err) { return next(err); }
                            if (found_video) {
                                console.log('Found a video with that title and author')
                                const videoArray = found_video._id
                                List.findByIdAndUpdate(list._id, { $push: { videos: videoArray } }, function(err) {
                                    if(err) { return next(err) }
                                    res.redirect(list._id)
                                    console.log(`Added video by ${found_video.author_name} to list ${list.name}
                                    ${typeof list['videos'][0].author_name} and ${typeof video.author_name}
                                    length: ${list.length} or possibly ${list['videos'].length}`)
                                })     
                            }
                            else {
                                video.save(function (err) {
                                    if (err) {return next(err)}
                                    console.log('Video added to main list')
                                    List.findByIdAndUpdate(list._id, { $push: { videos: video._id } }, function(err) {
                                        if(err) { return next(err) }
                                        res.redirect(list._id)
                                        console.log(`Added ${video.title} to list ${list.name}, details: ${list[0]}`)
                                    })  
                                })
                            }
                        })
                    }
                })
            }
            })
            .catch(function(err) {
                console.log(`Fetch error: ${err}`)
                throw new Error(err)
            })
        })        

        
    }
];

// Handle List delete on POST.
exports.list_delete_post = function(req, res, next) {
    const list = req.body.list_delete
    List.deleteOne({'_id' : list}, function(err) {
            if(err) { return next(err) }
            res.redirect('/')
            console.log(`Deleted ${list}`)
    })
};

// Display List update form on GET.
/* exports.list_update_get = function(req, res) {
    res.send('NOT IMPLEMENTED: List update GET');
}; */

// Handle List update on POST.
exports.list_update_post = [
    validator.body('list_update', 'Please enter a valid name.').trim().escape()
    .isLength( {min: 1, max: 100} ).withMessage('Please enter a name between 1 and 100 characters.'),
    validator.sanitizeBody('list_update'),
    (req, res, next) => {
        const errors = validator.validationResult(req);
        const listname = req.body.list_update
        const id = req.body.list_id
        if (!errors.isEmpty()) {
            res.render(id, { error: errors.array()});
            return;
        } else {
        // Is there already a list with this name?
        List.findOne({ 'name': listname })
        .exec( function(err, found_list) {
            if(err) { return next(err) }
            if (found_list) {
                console.log('Found a list with that name')
                res.redirect(`../${found_list._id}`)
            }
            else {
                List.findByIdAndUpdate(id, { name: listname }, function(err) {
                    if(err) { return next(err) }
                    res.redirect(`../${id}`)
                    console.log(`Changed list name to ${listname}`)
                })
            }
        })
        // If not, find the list ID and change its name.
        // let listname = { name: req.body.list_name }
    }}
<<<<<<< HEAD
];
=======
];
>>>>>>> 0ff2056f8fb7058d6b73d4e196048b71aec729cf
