var Video = require('../models/video');
var List = require('../models/bookmarklist');

const validator = require('express-validator');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
const { http, https } = require('follow-redirects');
const fs = require('fs')

var async = require('async');
var fetch = require('node-fetch');

exports.index = function(req, res) {   
    
    async.parallel({
        video_count: function(callback) {
            Video.countDocuments({}, callback); // Pass an empty object as match condition to find all documents of this collection
        },
        list_count: function(callback) {
            List.countDocuments({}, callback);
        },
        video_list: function(callback) {
            Video.find({}, 'video_url author_url author_name title date', callback)
            .sort([['date', 'descending']])
        },
        list_list: function(callback) {
            List.find({}, callback)
            .populate('videos')
            .sort([['name', 'ascending']])
        }
    },
    function(err, results) {
        res.render('index', { title: 'TikTok Favorites', error: err, data: results });
    });
};

/*exports.list_list = function(callback) {
    List.find({}, callback)
    .populate('videos')
}*/

// Display list of all books.
//exports.video_list = function(req, res, next) {      
//  };

// Display video create form on GET.
/*exports.video_create_get = function(req, res) {
    res.render('index')
    //res.send('NOT IMPLEMENTED: Video create GET');
};*/

// Handle book create on POST.
exports.video_create_post = [
    validator.body('video_url', 'Please enter a valid TikTok URL.').trim().isURL( { protocols: ['http','https'], require_protocol: true, } ).withMessage('Please enter a URL beginning with https://')
    .contains('tiktok.com', { ignoreCase: true }).withMessage('Please enter a URL from TikTok.com'),
    validator.sanitizeBody('video_url'),
    (req, res, next) => {
        const errors = validator.validationResult(req);

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
                res.render('/', { video: video, error: errors.array()});
                return;
            }
            else {
                Video.findOne({ 'title': data.title, 'author_name': data.author_name })
                .exec( function(err, found_video) {
                    if (err) { return next(err); }
                    if (found_video) {
                        res.send('Found a video with that title and author.');
                        //console.log('Found a video')
                    }
                    else {
                        video.save(function (err) {
                            if (err) {return next(err); }
                            console.log('Video added')
                            res.redirect('/')
                        });
                    }
                });
            }
            })
            .catch(function(err) {
                console.log(`Fetch error: ${err}`)
                throw new Error(err)
            })
        })        

        
    }
];

exports.video_multiadd_post = function (req, res, next) {
    if (req.file === undefined) {
        res.send('Please upload a valid "Like List.txt" file.')
    } else {
        const data = fs.readFileSync(req.file.path, 'UTF-8')
        const regexCheck = new RegExp(/[^A-z0-9\s:\-/.]/)
        // If the data includes invalid characters, send an error to the user
        if (data.match(regexCheck)) {
            fs.unlink(req.file.path)
            res.send('Your file contains invalid characters. Please upload your Like List file.')
        } else {
            // Create a for loop with regular expressions to go through each entry
            console.log(req.file)
            console.log(req.body.like_list)
            res.send('Check the console')
        }
    }
}

// Handle book delete on POST.
exports.video_delete_post = function(req, res, next) {
    const videos = req.body.deleted_video
    const videoString = videos.toString()
    const videoid = videoString.split(',')
    if (videoid === '') {
        console.log('Please select a video for deletion')
        res.send('Please select a video for deletion.')
    } else {
        Video.remove({'_id' : {$in: videoid}}, function(err) {
            if(err) { return next(err) }
            res.redirect('/')
            console.log(`Deleted ${videoid}`)
    })
    }
};

exports.video_search_post = [
    validator.body('video_search', 'Enter a search term.').trim().escape(),
    validator.sanitizeBody('video_search'),
    (req, res, next) => {
        const errors = validator.validationResult(req);
        var video_search = req.body.video_search.toString()
        if (!errors.isEmpty()) {
            res.render('/', { video_search: video_search, error: errors.array()});
            return;
        } else {
            var regex = new RegExp(video_search, 'gi')
            Video.find( { $or: [ { title: regex}, { author_name: regex } ] } )
            //( { author_name: regex } )//$or: [ { 'title': video_search }, { 'author_name': video_search } ]})
                .exec( function(err, found_video) {
                    if (err) { return next(err); }
                    if (found_video) {
                        res.render('video-search', { title: 'Search Results', error: err, found_video: found_video })
                        console.log(found_video)
                    } else {
                        res.send('Did not find a video matching that criteria')
                    }
                })
            }
        }
    ]


exports.video_sort_post = function(req, res, next) {
    const sort = req.body.video_sort
    if (sort === '') {
        console.log('No sorting method selected.')
        res.render('/')
    } else {
        async.parallel({
        video_list: function(callback) {
            Video.find({}, 'video_url author_url author_name title date', callback)
            .sort([['date', 'descending']])
        },
    })
    }
};

exports.video_move_post = function(req, res, next) {
    const videos = req.body.moved_video
    const videoString = videos.toString()
    const videoid = videoString.split(',')
    const destination = req.body.move_destination
    if (videoid === '') {
        console.log('Please select a video to move.')
        res.send('Please select a video to move.')
    } else if (destination === undefined) {
        console.log('Please select a destination list.')
        res.send('Please select a destination list.')
    } else {
        // Get the list by the ID
        List.find( { _id: destination} )
            .exec( function(err, data) {
                if (err) { return next(err); }
                if (data) {
                    const videoArray = []
                    for (let i = 0; i < videoid.length; i++) {
                        if (data[0].videos.includes(videoid[i])) {
                            console.log('Video already exists in this list.')
                        }
                        else {
                            console.log(`Queued ${videoid[i]} to add to list ${data[0].name}`)
                            videoArray.push(videoid[i])
                        }
                    }
                    console.log(videoArray)
                    List.findByIdAndUpdate(destination, { $push: { videos: videoArray } }, function(err) {
                        if(err) { return next(err) }
                        res.redirect(`../list/${destination}`)
                        console.log(`Added ${videoArray.length} video(s) to list ${destination}`)
                    })
                }
            })
    }
}
