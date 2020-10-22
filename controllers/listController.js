var mongoose = require('mongoose')

var Video = require('../models/video')
var List = require('../models/bookmarklist')

const validator = require('express-validator')
const { https } = require('follow-redirects')
var async = require('async')
var fetch = require('node-fetch')

const express = require('express')
const app = express()

app.locals.videoLimitPerPage = 15
const videoLimitPerPage = app.locals.videoLimitPerPage

exports.list_detail = function(req, res, next) {
    const id = mongoose.Types.ObjectId(req.params.id)
    const page = req.params.page
    async.parallel({
        list_lists: function(callback) {
            List.find({'_id': {$ne: id}}, callback)
            .collation({locale: "en" })
            .sort([['name', 'ascending']])
        },
        current_list: function(callback) {
            List.findById(id)
            .populate({
                path: 'videos',
                options: { limit: videoLimitPerPage,
                    skip: videoLimitPerPage * (page - 1),
                    sort: app.locals.sortListOption,
                    collation: ( { locale: 'en', strength: 1 } )}
            })
            .exec(callback)
        },
        video_count: function(callback) {
            List.findById(id)
            .populate('videos')
            .exec(callback)
        },
        current_page: function(callback) {
            callback(null, page)
        },
        video_limit: function(callback) {
            callback(null, videoLimitPerPage)
        },
        previous_page: function(callback) {
            const previousPage = req.header('referer')
            if (previousPage === undefined) {
                callback(null, undefined)
            } else {
                const bookmarkPage = new RegExp(/http:\/\/localhost:3000\/bookmarks\/\d+/)
                if (previousPage.match(bookmarkPage)) {
                    callback(null, previousPage)
                } else {
                    callback(null, undefined)
                }
            }
        }
    }, function(error, results) {
        if (error) {
            return next(error)
        }
        res.render('list_detail', { title: `TikTok Favorites: ${results.current_list.name}`, data: results})
    })
}

exports.list_sort = function(req, res) {
    const sortOption = req.body.list_sort
    app.locals.sortListOption = sortOption
    const listId = req.body.list_sort_id
    res.redirect(listId)
}

exports.list_create_post = [
    validator.body('list_name', 'Please enter a valid name.').trim().escape()
    .isLength( {min: 1, max: 100} ).withMessage('Please enter a name between 1 and 100 characters.'),
    (req, res, next) => {
        const errors = validator.validationResult(req)
        let listname = { name: req.body.list_name }
        var list = new List(listname)
        if (!errors.isEmpty()) {
            const errorMessage = `${errors['errors']['0']['msg']}.
            You entered: ${errors['errors']['0']['value']}`
            res.status(200).send(errorMessage)
        }
        else {
            List.findOne({ 'name': req.body.list_name })
            .collation( { locale: 'en', strength: 1 } )
            .exec( function(error, found_list) {
                if(error) {
                    return next(error)
                }
                if (found_list) {
                    console.log('Found a list with that name')
                    res.redirect(found_list._id)
                }
                else {
                    list.save(function (error) {
                        if (error) {
                            return next(error)
                        }
                        console.log('List added')
                        res.redirect(list._id)
                    })
                }
            })
        }
    }
]

exports.list_delete_video_post = function(req, res, next) {
    const videos = req.body.deleted_video
    const referer = req.header('referer')
    const refererArray = referer.split('/')
    const refererLength = refererArray.length
    const listId = refererArray[refererLength - 2].toString()
    const videoString = videos.toString()
    const videoIds = videoString.split(',')
    List.findByIdAndUpdate( { _id: listId },
        { $pull: { videos: { $in: videoIds } } },
        function(error) {
        if(error) {
            return next(error)
        }
        console.log(`Deleted ${videoIds.length} video(s) from list ${listId}`)
        res.redirect(listId)
    })
}

exports.list_add_video_post = [
    validator.body('video_url', 'Please enter a valid TikTok URL.').trim()
    .isURL( { protocols: ['http','https'], require_protocol: true, } )
    .withMessage('Please enter a URL beginning with https://')
    .contains('tiktok.com', { ignoreCase: true })
    .withMessage('Please enter a URL from TikTok.com'),
    validator.sanitizeBody('video_url'),
    (req, res, next) => {
        const errors = validator.validationResult(req)
        if (!errors.isEmpty()) {
            const errorMessage = `${errors['errors']['0']['msg']}.
            You entered: ${errors['errors']['0']['value']}`
            res.status(200).send(errorMessage)
        }
        const referer = req.header('referer')
        const refererArray = referer.split('/')
        const refererLength = refererArray.length
        const listId = refererArray[refererLength - 2].toString()
        https.get(req.body.video_url, response => {
            const redirectedUrl = response.responseUrl
            const addOneVideo = (async function() {
                try{
                    const tiktokResponse = await fetch(`https://www.tiktok.com/oembed?url=${redirectedUrl}`)
                    if (tiktokResponse.status >= 200 && tiktokResponse.status <= 299) {
                        const tiktokData = await tiktokResponse.json()
                        if (tiktokData.title === undefined) {
                            const videoUnavailableMessage = 'This video is unavailable. It may have been deleted.'
                            res.status(200).send(videoUnavailableMessage)
                        }
                            let videodetail = { video_url: redirectedUrl }
                            videodetail.title = tiktokData.title
                            videodetail.author_url = tiktokData.author_url
                            videodetail.author_name = tiktokData.author_name
                            const video = new Video(videodetail)
                            List.findById(listId)
                            .populate('videos')
                            .exec(function (error, list) {
                                if(error) {
                                    return next(error)
                                }
                                const videosInList = list.videos
                                for (const videoInList of videosInList) {
                                    if (videoInList.author_name === video.author_name) {
                                        if (videoInList.title === video.title) {
                                            const foundVideoMessage = 'A video with that name and author exists in this list.'
                                            res.status(200).send(foundVideoMessage)
                                        }
                                    }
                                }
                                    Video.findOne( { title: videodetail.title, author_name: videodetail.author_name } )
                                    .exec( function(error, found_video) {
                                        if (error) {
                                            return next(error)
                                        }
                                        if (found_video) {
                                            console.log(`Found a video with that title and author in the master list.
                                            Adding video to list.`)
                                            const videoArray = found_video._id
                                            List.findByIdAndUpdate(list._id, { $push: { videos: videoArray } }, function(error) {
                                                if(error) {
                                                    return next(error)
                                                }
                                                res.redirect(list._id)
                                            })     
                                        }
                                        else {
                                            video.save(function (error) {
                                                if (error) {
                                                    return next(error)
                                                }
                                                List.findByIdAndUpdate(list._id, { $push: { videos: video._id } }, function(error) {
                                                    if(error) {
                                                        return next(error)
                                                    }
                                                    console.log('Video added to main list')
                                                    res.redirect(list._id)
                                                })  
                                            })
                                        }
                                    })
                            })  
                    } else {
                        const fetchError = `Unsuccessful fetch response: \n
                        Status: ${tiktokResponse.status} \n
                        ${tiktokResponse.statusText}`
                        res.status(500).send(fetchError)
                    }
                }catch(status) {
                    const awaitError = `Unsuccessful await attempt: \n
                    Status: ${status}`
                    res.status(500).send(awaitError)
                }
            })()
        }).on('error', error => {
            const getError = `Unsuccessful get request: ${error}`
            res.status(500).send(getError)
        })        
    }
]

exports.list_delete_post = function(req, res, next) {
    const list = req.body.list_delete
    List.deleteOne({'_id' : list}, function(error) {
            if(error) {
                return next(error)
            }
            res.redirect('/')
            console.log(`Deleted ${list}`)
    })
}

exports.list_update_post = [
    validator.body('list_update').trim().escape()
    .isLength( {min: 1, max: 100} ).withMessage('Please enter a name between 1 and 100 characters.'),
    (req, res, next) => {
        const errors = validator.validationResult(req)
        const listName = req.body.list_update
        const id = req.body.list_id
        if (!errors.isEmpty()) {
            const errorMessage = `${errors['errors']['0']['msg']}.
            You entered: ${errors['errors']['0']['value']}`
            res.status(200).send(errorMessage)
        }
        List.findOne({ 'name': listName })
        .exec( function(error, found_list) {
            if(error) {
                return next(error)
            }
            if (found_list) {
                console.log('A list with that name already exists.')
                res.redirect(`../${found_list._id}`)
            }
            else {
                List.findByIdAndUpdate(id, { name: listName }, function(error) {
                    if(error) {
                        return next(error)
                    }
                    const previousPage = req.header('referer')
                    res.redirect(previousPage)
                    console.log(`Changed list name to ${listName}`)
                })
            }
        })
    }
]
