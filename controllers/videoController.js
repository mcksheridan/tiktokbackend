var Video = require('../models/video');
var List = require('../models/bookmarklist');

const validator = require('express-validator');
const { https } = require('follow-redirects');
const fs = require('fs')

const express = require('express')
const app = express()

const async = require('async');
const fetch = require('node-fetch');

app.locals.videoLimitPerPage = 15
const videoLimitPerPage = app.locals.videoLimitPerPage

exports.index = function(req, res) { 
    const page = req.params.page  
    async.parallel({
        video_count: function(callback) {
            Video.countDocuments({}, callback);
        },
        list_count: function(callback) {
            List.countDocuments({}, callback);
        },
        video_list: function(callback) {
            Video.find({}, 'video_url author_url author_name title date', callback)
            .limit(videoLimitPerPage)
            .skip(videoLimitPerPage * (page - 1))
            .sort(app.locals.sortVideoOption)
        },
        current_page: function(callback) {
            callback(null, page)
        },
        video_limit: function(callback) {
            callback(null, videoLimitPerPage)
        },
        list_list: function(callback) {
            List.find({}, 'name', callback)
            .collation({locale: "en" })
            .sort([['name', 'ascending']])
        }
    },
    function(err, results) {
        res.render('index', { title: 'TikTok Favorites', error: err, data: results })
    })
}

exports.video_create_post = [
    validator.body('video_url').trim()
    .isURL( { protocols: ['https'], require_protocol: true, } )
    .withMessage('Please enter a valid TikTok URL beginning with https://')
    .contains('tiktok.com', { ignoreCase: true })
    .withMessage('Please enter a URL from TikTok.com'),
    validator.sanitizeBody('video_url'),
    (req, res, next) => {
        const errors = validator.validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessage = `${errors['errors']['0']['msg']}.
            You entered: ${errors['errors']['0']['value']}`
            res.status(200).send(errorMessage)
        }
        https.get(req.body.video_url, response => {
            const redirectedUrl = response.responseUrl
            const addOneVideo = (async function() {
                    const tiktokResponse = await fetch(`https://www.tiktok.com/oembed?url=${redirectedUrl}`)
                    if (tiktokResponse.status >= 200 && tiktokResponse.status <= 299) {
                        const tiktokData = await tiktokResponse.json()
                        if (tiktokData.title === undefined) {
                            const videoUnavailableMessage = 'This video is unavailable. It may have been deleted.'
                            res.status(200).send(videoUnavailableMessage)
                        } else {
                            let videodetail = { video_url: redirectedUrl }
                            videodetail.title = tiktokData.title
                            videodetail.author_url = tiktokData.author_url
                            videodetail.author_name = tiktokData.author_name
                            const video = new Video(videodetail)
                            Video.findOne( {'title': videodetail.title, 'author_name': videodetail.author_name })
                            .exec(function (error, found_video) {
                                if (error) {
                                    return next(error)
                                }
                                if (found_video) {
                                    const foundVideoMessage = `A video by ${videodetail.author_name}
                                    called ${videodetail.title} already exists.`
                                    res.status('200').send(foundVideoMessage)
                                } else {
                                    video.save(function (error) {
                                        if (error) {
                                            return next(error)
                                        }
                                        console.log(`Video by ${videodetail.author_name}
                                        called ${videodetail.title} added!`)
                                        res.redirect('/')
                                    })
                                }
                            })
                        }    
                    } else {
                        const fetchError = `Unsuccessful fetch response: \n
                        Status: ${tiktokResponse.status} \n
                        ${tiktokResponse.statusText}`
                        res.status(500).send(fetchError)
                    }
            })()
        }).on('error', error => {
            const getError = `Unsuccessful get request: ${error}`
            res.status(500).send(getError)
        })        
    }
]

exports.video_multiadd_post = function (req, res, next) {
    if (req.file === undefined) {
        res.send('Please upload a valid "Like List.txt" file.')
    } else {
        const data = fs.readFileSync(req.file.path, 'UTF-8')
        fs.unlinkSync(req.file.path)
        const regexCheck = new RegExp(/[^A-z0-9\s:\-/.]/)
        // If the data includes invalid characters, send an error to the user
        if (data.match(regexCheck)) {
            res.send('Your file contains invalid characters. Please upload your Like List file.')
        }
        else if (data === '') {
            res.send('Your Like List is empty.')
        } else {
            // Create a for loop with regular expressions to go through each entry
            const regexSort = new RegExp(/Date: \d{4}-\d\d-\d\d\s\d\d:\d\d:\d\d\sVideo Link: https:\/\/www.tiktokv.com\/share\/video\/\d*\//, 'g')
            const dateVideoArray = data.match(regexSort)
            const dateMatch = new RegExp(/\d{4}-\d\d-\d\d\s\d\d:\d\d:\d\d/)
            const videoMatch = new RegExp(/https:\/\/www.tiktokv.com\/share\/video\/\d*\//)
            const arrayLength = dateVideoArray.length
            let videoCount = 0
            function delay(times) {
                if (times < 1) {
                    console.log('All available, non-duplicate videos added.')
                }
                setTimeout(() => {
                    try {
                    if (videoCount < arrayLength) {
                    const dateVideo = dateVideoArray[videoCount]
                    const videoArray = dateVideo.match(videoMatch)
                    const dateArray = dateVideo.match(dateMatch)
                    const newVideo = videoArray.toString()
                    const newVideoPath = newVideo.slice(23, newVideo.length).toString()
                    const newDate = dateArray.toString()
                    const options = {
                        host: 'www.tiktokv.com',
                        path: newVideoPath,
                        port: 443,
                        family: 4,
                        method: 'GET',
                        timeout: 3000,
                    }
                    https.get(options, response => {
                        const redirectedUrl = response.responseUrl
                        const addOneVideo = (async function() {
                            try {
                                const tiktokResponse = await fetch(`https://www.tiktok.com/oembed?url=${redirectedUrl}`)
                                if (tiktokResponse.status >= 200 && tiktokResponse.status <= 299) {
                                    const tiktokData = await tiktokResponse.json()
                                    if (tiktokData.title === undefined) {
                                        console.log('This video is unavailable. It may have been deleted.')
                                    } else {
                                        let videodetail = { video_url: redirectedUrl }
                                        videodetail.title = tiktokData.title
                                        videodetail.author_url = tiktokData.author_url
                                        videodetail.author_name = tiktokData.author_name
                                        videodetail.date = newDate
                                        const video = new Video(videodetail)
                                        Video.findOne( {'title': videodetail.title, 'author_name': videodetail.author_name })
                                        .exec(function (error, found_video) {
                                            if (error) {
                                                return next(error)
                                            }
                                            if (found_video) {
                                                console.log(`A video by ${videodetail.author_name}
                                                called ${videodetail.title} already exists.`)
                                            } else {
                                                video.save(function (error) {
                                                    if (error) {
                                                        return next(error)
                                                    }
                                                    console.log(`Video by ${videodetail.author_name}
                                                    called ${videodetail.title} added!`)
                                                })
                                            }
                                        })
                                    }    
                                } else {
                                    const fetchError = `Unsuccessful fetch response: \n
                                    Status: ${tiktokResponse.status} \n
                                    ${tiktokResponse.statusText}`
                                    res.status(500).send(fetchError)
                                }
                            }
                            catch(status) {
                                const awaitError = `Unsuccessful await attempt: \n
                                Status: ${status}`
                                res.status(500).send(awaitError)
                            }
                        })()
                    }).on('error', error => {
                        const getError = `Unsuccessful get request: ${error}`
                        res.status(500).send(getError)
                    })
                    delay(times-1)
                    videoCount += 1
                } else {
                    return
                }} catch(error) {
                    const timeoutError = `Unsuccessful timeout attempt: \n
                    Status: ${error}`
                    res.status(500).send(timeoutError)
                }
                }, 500)
            } delay(arrayLength)
            res.redirect('/')
        }
    }
}

exports.video_delete_post = function(req, res, next) {
    const videos = req.body.deleted_video
    const videoString = videos.toString()
    const videoIds = videoString.split(',')
    Video.remove({'_id' : {$in: videoIds}},
    function(error) {
        if (error) {
            return next(error)
        }
        const previousPage = req.header('referer')
        res.redirect(previousPage)
        console.log(`Deleted ${videoIds}`)
    })
}

exports.video_search_post = [
    validator.body('video_search').trim().escape()
    .isLength( {min: 1} ).withMessage('Please enter a search term.'),
    validator.sanitizeBody('video_search'),
    (req, res) => {
        const errors = validator.validationResult(req);
        if (!errors.isEmpty()) {
            console.error(errors)
            const errorMessage = `${errors['errors']['0']['msg']}
            You entered: ${errors['errors']['0']['value']}`
            res.status(200).send(errorMessage)
        }
        const page = req.params.page
        const videoQuery = req.body.video_search.toString()
        const regexQuery = new RegExp(videoQuery, 'gi')
        app.locals.searchQuery = regexQuery
        res.redirect(page)
    }
]

exports.video_search_get = function(req, res, next) {
    const page = req.params.page
    const previousPage = req.header('referer')
    async.parallel({
        found_video: function(callback) {
            Video.find( { $or: [ { title: app.locals.searchQuery},
                { author_name: app.locals.searchQuery } ] } )
            .collation( { locale: 'en', strength: 1 } )
            .limit(videoLimitPerPage)
            .skip(videoLimitPerPage * (page - 1))
            .exec(callback)
        },
        video_count: function(callback) {
            Video.find( { $or: [ { title: app.locals.searchQuery},
                { author_name: app.locals.searchQuery } ] } )
            .collation( { locale: 'en', strength: 1 } )
            .countDocuments({}, callback)
        },
        previous_page: function(callback) {
            callback(null, previousPage)
        },
        current_page: function(callback) {
            callback(null, page)
        },
        video_limit: function(callback) {
            callback(null, videoLimitPerPage)
        },
    }, function (error, results) {
        if (error) {
            return next(error)
        }
        res.render('video-search', { title: 'Search Results', error: error, data: results})
    })
}


exports.video_sort_post = function(req, res) {
    const sortOption = req.body.video_sort
    app.locals.sortVideoOption = sortOption
    res.redirect('/')
}

exports.video_move_post = function(req, res, next) {
    const videos = req.body.moved_video
    const videoString = videos.toString()
    const videoIds = videoString.split(',')
    const destinationList = req.body.move_destination
    List.find( { _id: destinationList} )
        .exec( function(error, listData) {
            if (error) {
                return next(error)
            }
            if (listData) {
                const videosInList = listData[0].videos
                const addedVideos = videoIds.filter(video => ((videosInList.includes(video)) === false))
                List.findByIdAndUpdate(destinationList,
                    { $push: { videos: addedVideos } },
                    function(error) {
                        if (error) {
                            return next(error)
                        }
                    res.redirect(`../list/${destinationList}`)
                    console.log(`Added ${addedVideos.length} video(s) to list ${destinationList}`)
                })
            }
        })
}