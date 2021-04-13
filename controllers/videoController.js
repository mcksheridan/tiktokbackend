//const Video = require('../models/video')
//const List = require('../models/bookmarklist')
//const User = require('../models/users')
const db = require('../db')

const validator = require('express-validator')
const { https } = require('follow-redirects')
const fs = require('fs')
const BigNumber = require('big-number')

const express = require('express')
const app = express()

const async = require('async')
const fetch = require('node-fetch')

const { checkFileData, extractLikeListData, createVideoDateObjects } = require('./handleLikeList');
const {
  getTiktokId, getBinaryIdArray, getThirtyTwoLeftBits, getDecimalFromBits, getDateAdded,
} = require('./handleTikTokId');

app.locals.videoLimitPerPage = 15
const videoLimitPerPage = app.locals.videoLimitPerPage

exports.index = (req, res) => {
    const page = parseInt(req.params.page)
    const values = [req.user.user_id]
    async.parallel({
        pagination: (callback) => {
            const pagination = {
                'current_page': page,
                'video_limit': videoLimitPerPage,
            }
            callback(null, pagination)
        },
        get_lists: (callback) => {
            const listLists = async () => {
                const text = 'SELECT * FROM lists WHERE user_id = $1 ORDER BY lower(name)'
                try {
                    const listQuery = await db.query(text, values)
                    const listQueryResults = listQuery.rows
                    callback(null, listQueryResults)
                } catch(error) {
                    res.status(500).send(error.stack)
                }
            }
            listLists()
        },
        get_videos: (callback) => {
            const getSortOption = (userInput) => {
                if (userInput === undefined) {
                    return 'date_bookmarked DESC'
                }
                return userInput
            }
            const checkCaseSensitivity = () => {
                const startsWithDate = (getSortOption(app.locals.sortVideoOption)).startsWith('date')
                if (startsWithDate) {
                    getVideosCaseInsensitive()
                } else {
                    const sortOptionArray = app.locals.sortVideoOption.split(' ')
                    const sortColumn = sortOptionArray[0]
                    const sortDirection = sortOptionArray[1]
                    getVideosCaseSensitive(sortColumn, sortDirection)
                }
            }
            const getVideos = async (text) => {
                try {
                    const videoQuery = await db.query(text, values)
                    const videoQueryResults = videoQuery.rows
                    callback(null, videoQueryResults)
                } catch(error) {
                    res.status(500).send(error.stack)
                }
            }
            const getVideosCaseInsensitive = () => {
                const text = `SELECT users_videos.video_id, url, title, author_url, author_name, date_added, date_bookmarked FROM users_videos
                INNER JOIN videos
                ON videos.video_id = users_videos.video_id
                WHERE users_videos.user_id = $1
                ORDER BY ${getSortOption(app.locals.sortVideoOption)}
                LIMIT ${videoLimitPerPage}
                OFFSET ${videoLimitPerPage * (page - 1)}`
                getVideos(text)
            }
            const getVideosCaseSensitive = (column, direction) => {
                const text = `SELECT users_videos.video_id, url, title, author_url, author_name, date_added, date_bookmarked FROM users_videos
                INNER JOIN videos
                ON videos.video_id = users_videos.video_id
                WHERE users_videos.user_id = $1
                ORDER BY lower(${column}) ${direction}
                LIMIT ${videoLimitPerPage}
                OFFSET ${videoLimitPerPage * (page - 1)}`
                getVideos(text)
            }
            checkCaseSensitivity()
        },
        count_videos: (callback) => {
            const countVideos = async () => {
                const text = 'SELECT * FROM users_videos WHERE user_id = $1'
                try {
                    const videoQuery = await db.query(text, values)
                    const videoQueryResults = videoQuery.rows.length
                    callback(null, videoQueryResults)
                } catch(error) {
                    res.status(500).send(error.stack)
                }
            }
            countVideos()
        },
        get_user_info: (callback) => {
            const getUserInfo = async () => {
                const text = 'SELECT * FROM users WHERE user_id = $1'
                try {
                    const userQuery = await db.query(text, values)
                    const userQueryResults = userQuery.rows[0]
                    callback(null, userQueryResults)
                }
                catch(error) {
                    res.status(500).send(error.stack)
                }
            }
            getUserInfo()
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
    validator.body('video_url'),
    (req, res, next) => {
        const errors = validator.validationResult(req)
        if (!errors.isEmpty()) {
            const errorMessage = `${errors['errors']['0']['msg']}.
            You entered: ${errors['errors']['0']['value']}`
            res.status(200).send(errorMessage)
        }
        async.waterfall([
            function getRedirect (callback) {
                https.get(req.body.video_url, response => {
                    const redirectedUrl = response.responseUrl
                    callback(null, redirectedUrl)
                })
            },
            function (redirectedUrl, callback) {
                const getTiktokData = (async () => {
                    const tiktokResponse = await fetch(`https://www.tiktok.com/oembed?url=${redirectedUrl}`)
                    if (tiktokResponse.status >= 200 && tiktokResponse.status <= 299) {
                        const tiktokData = await tiktokResponse.json()
                        callback(null, redirectedUrl, tiktokData)
                    } else {
                        // NOTE: Change to a flash message!!
                        const fetchError = `Unsuccessful fetch response: \n
                        Status: ${tiktokResponse.status} \n
                        ${tiktokResponse.statusText}`
                        res.status(500).send(fetchError)
                    }
                })
                getTiktokData()
            },
            function checkDataValidity (redirectedUrl, tiktokData, callback) {
                if (tiktokData.title === undefined) {
                    // NOTE: Change to a flash message!
                    const videoUnavailableMessage = 'This video is unavailable. It may have been deleted.'
                    res.status(200).send(videoUnavailableMessage)
                } else {
                    callback(null, redirectedUrl, tiktokData)
                }
            },
            function saveValidatedData (redirectedUrl, tiktokData, callback) {
                const newVideo = {
                    url:  redirectedUrl,
                    title: tiktokData.title,
                    authorUrl: tiktokData.author_url,
                    authorName: tiktokData.author_name
                }
                callback(null, redirectedUrl, newVideo)
            },
            function getTiktokId (redirectedUrl, newVideo, callback) {
                const idRegexPattern = new RegExp(/\d+/)
                if (redirectedUrl.startsWith('https://m')) {
                    const tiktokIdArray = redirectedUrl.match(idRegexPattern)
                    const tiktokId = tiktokIdArray[0]
                    callback(null, newVideo, tiktokId)
                }
                if (redirectedUrl.startsWith('https://www')) {
                    const videoRegexPattern = new RegExp(/video\/\d+/)
                    const tiktokVideoPattern = redirectedUrl.match(videoRegexPattern)
                    const tiktokVideoString = tiktokVideoPattern.toString()
                    const tiktokIdArray = tiktokVideoString.match(idRegexPattern)
                    const tiktokId = tiktokIdArray[0]
                    callback(null, newVideo, tiktokId)
                }
            },
            function checkUsersVideosForDuplicates (newVideo, tiktokId, callback) {
                const checkUsersVideosForDuplicates = async () => {
                    const text = 'SELECT * FROM users_videos WHERE user_id = $1 AND video_id = $2'
                    const values = [req.user.user_id, tiktokId]
                    try {
                        const videoQuery = await db.query(text, values)
                        const videoQueryResults = videoQuery.rows
                        if (videoQueryResults.length > 0) {
                            const foundVideoMessage = `A video with id ${tiktokId} already exists in this account.`
                            // Note: Change to a flash message!
                            res.status(200).send(foundVideoMessage)
                        }
                        callback(null, newVideo, tiktokId)
                    } catch (error) {
                        res.status(500).send(error.stack)
                    }
                }
                checkUsersVideosForDuplicates()
            },
            function checkAllVideosForDuplicates (newVideo, tiktokId, callback) {
                const checkAllVideosForDuplicates = async () => {
                    const text = 'SELECT * FROM videos WHERE video_id = $1'
                    const values = [tiktokId]
                    try {
                        const videoQuery = await db.query(text, values)
                        const videoQueryResults = videoQuery.rows
                        if (videoQueryResults.length > 0) {
                            const addVideoToUsersVideos = async () => {
                                try {
                                    await db.query('INSERT INTO users_videos VALUES($1, $2)',
                                    [req.user.user_id, tiktokId])
                                    res.redirect('/')
                                } catch(error) {
                                    res.status(500).send(error.stack)
                                }
                            }
                            addVideoToUsersVideos()
                        }
                        callback(null, newVideo, tiktokId)
                    } catch(error) {
                        res.status(500).send(error.stack)
                    }
                }
                checkAllVideosForDuplicates()
            },
            function getBinaryId (newVideo, tiktokId, callback) {
                const tiktokIdBigIntBinaryArray = []
                const tiktokIdInteger = BigNumber(tiktokId)
                let currentInteger = tiktokIdInteger
                while (currentInteger > BigNumber(0)) {
                    let remainder = BigNumber(currentInteger).mod(2)
                    let remainderString = remainder.toString()
                    tiktokIdBigIntBinaryArray.unshift(remainderString)
                    currentInteger = BigNumber(currentInteger).div(2)
                    if (currentInteger == 0) {
                        const currentIntegerString = currentInteger.toString()
                        tiktokIdBigIntBinaryArray.unshift(currentIntegerString)
                    }
                }
                callback(null, newVideo, tiktokId, tiktokIdBigIntBinaryArray)
            },
            function getThirtyTwoLeftBits (newVideo, tiktokId, tiktokIdBigIntBinaryArray, callback) {
                const tiktokIdBinaryArray = tiktokIdBigIntBinaryArray.map(number => parseInt(number))
                const tiktokIdBinaryString = tiktokIdBinaryArray.join('')
                const thirtyTwoLeftBits = tiktokIdBinaryString.slice(0,32)
                callback(null, newVideo, tiktokId, thirtyTwoLeftBits)
            },
            function getDecimalFromBits (newVideo, tiktokId, thirtyTwoLeftBits, callback) {
                const decimalArray = []
                let arrayPlace = 0
                let previousValue = 0
                while (arrayPlace < 32) {
                    let valueTotal = previousValue * 2
                    let bitAsInteger = parseInt(thirtyTwoLeftBits[arrayPlace])
                    let newTotal = bitAsInteger + valueTotal
                    decimalArray[0] = newTotal
                    previousValue = newTotal
                    arrayPlace += 1
                }
                const decimal = decimalArray.toString()
                callback(null, newVideo, tiktokId, decimal)
            },
            function getDateAdded (newVideo, tiktokId, decimal, callback) {
                const dateAdded = new Date(decimal * 1000)
                console.log('Data from get date added:')
                console.log(newVideo)
                callback(null, newVideo, tiktokId, dateAdded)
            },
            function saveIdAndDateAdded (newVideo, tiktokId, dateAdded, callback) {
                newVideo.id = tiktokId
                newVideo.dateAdded = dateAdded
                callback(null, newVideo)
            },
            function addVideo (newVideo, callback) {
                const addVideo = async () => {
                    try {
                        await db.query('BEGIN')
                        const insertVideoText = 'INSERT INTO videos VALUES($1, $2, $3, $4, $5, $6)'
                        const insertVideoValues = [newVideo.id, newVideo.url, newVideo.title,
                            newVideo.authorUrl, newVideo.authorName, newVideo.dateAdded]
                        await db.query(insertVideoText, insertVideoValues)
                        const insertReferenceText = 'INSERT INTO users_videos VALUES($1, $2)'
                        const insertReferenceValues = [req.user.user_id, newVideo.id]
                        await db.query(insertReferenceText, insertReferenceValues)
                        await db.query('COMMIT')
                        res.redirect('/')
                    }
                    catch(error) {
                        await db.query('ROLLBACK')
                        res.send(500).status(error)
                    }
                }
                addVideo()
            }
        ])
    }
]

exports.video_multiadd_post = function (req, res, next) {

  const checkFileValidity = () => {
    if (req.file === undefined) {
      res.send('Please upload a valid Like List.txt file');
    };
    if (req.file !== undefined) {
      const likeList = fs.readFileSync(req.file.path, 'UTF-8');
      fs.unlinkSync(req.file.path);
      return likeList;
    };
  };

  const fileData = checkFileValidity();

  const likeList = checkFileData(fileData);

  const likeListDateVideoArray = extractLikeListData(likeList);

  const allVideosAndDates = createVideoDateObjects(likeListDateVideoArray);

  const getRedirectedUrl = async (url) => {
    const response = await fetch(url);
    const redirectedUrl = await response.url;
    return redirectedUrl;
  };

  const getTikTokApiData = async (url) => {
    const redirectedUrl = await getRedirectedUrl(url)
    const tiktokResponse = await fetch(`https://www.tiktok.com/oembed?url=${redirectedUrl}`)
    try {
      const tiktokData = await tiktokResponse.json()
      return tiktokData
    } catch (error) {
      console.error(error.message)
      const errorMessageForUser = 'There was an error getting information from TikTok'
      return errorMessageForUser
    }
  }

  const isApiDataAvailable = (data) => {
    /* A video that has been removed from TikTok will still have a successful API response.
    Its JSON data will look like this: { status_msg: 'Something went wrong' } */
   if (data.status_msg) {
     return false
   }
   if (!data.status_msg) {
     return true
   }
  }

  const getVideoDataObject = async (data, videoDateArray) => {
    const video = {
      url: videoDateArray.video,
      title: await data.title,
      authorUrl: await data.author_url,
      authorName: await data.author_name,
      dateBookmarked: videoDateArray.date,
    }
    return video
  }

  const allVideosAndDatesLength = allVideosAndDates.length

  let queuePosition = 0

  const processVideos = (queueRemaining, videoDateArray) => {
    setTimeout(async() =>
    {
     if (queueRemaining > 0) {
       const tiktokData = await getTikTokApiData(videoDateArray[queuePosition].video)
       if (isApiDataAvailable(tiktokData)) {
         const newVideo = await getVideoDataObject(tiktokData, videoDateArray[queuePosition])
         newVideo.id = getTiktokId(videoDateArray[queuePosition].video)
         newVideo.dateAdded = getDateAdded(getDecimalFromBits(getThirtyTwoLeftBits(getBinaryIdArray(newVideo.id))));
       }
       queuePosition++
       queueRemaining--
       console.log(`There are ${queueRemaining} videos remaining`)
       processVideos(queueRemaining, videoDateArray)
     }
    }, 500)
  }

  processVideos(allVideosAndDatesLength, allVideosAndDates)

  res.send('');
//     async.waterfall([
//         function addAllVideos (likeList, callback) {
//                 setTimeout(() => {
//                     try {
//                         if (videosProcessed < totalVideoNumber) {
//                             async.waterfall([
// /*                                 function checkForDuplicateVideos (newVideo, tiktokId, callback) {
//                                     User.findOne( { $and: [ { email: req.user.email }, { 'videos.id': tiktokId } ] } )
//                                     .exec((error, found_video) => {
//                                         if (error) {
//                                         return next(error)
//                                         }
//                                         if (found_video) {
//                                             const foundVideoMessage = `A video with id ${tiktokId} already exists.`
//                                             console.log(foundVideoMessage)
//                                             availableVideosAllAdded()
//                                         }
//                                         if (!found_video) {
//                                         callback(null, newVideo, tiktokId)
//                                         }
//                                     })
//                                 }, */
//                                 function checkUsersVideosForDuplicates (newVideo, tiktokId, callback) {
//                                     const checkUsersVideosForDuplicates = async () => {
//                                         const text = 'SELECT * FROM users_videos WHERE user_id = $1 AND video_id = $2'
//                                         const values = [req.user.user_id, tiktokId]
//                                         try {
//                                             const videoQuery = await db.query(text, values)
//                                             const videoQueryResults = videoQuery.rows
//                                             if (videoQueryResults.length > 0) {
//                                                 const foundVideoMessage = `A video with id ${tiktokId} already exists in this account.`
//                                                 console.log(foundVideoMessage)
//                                                 availableVideosAllAdded()
//                                             } else {
//                                             callback(null, newVideo, tiktokId)
//                                             }
//                                         } catch (error) {
//                                             res.status(500).send(error.stack)
//                                         }
//                                     }
//                                     checkUsersVideosForDuplicates()
//                                 },
//                                 function checkAllVideosForDuplicates (newVideo, tiktokId, callback) {
//                                     const checkAllVideosForDuplicates = async () => {
//                                         const text = 'SELECT * FROM videos WHERE video_id = $1'
//                                         const values = [tiktokId]
//                                         try {
//                                             const videoQuery = await db.query(text, values)
//                                             const videoQueryResults = videoQuery.rows
//                                             if (videoQueryResults.length > 0) {
//                                                 const addVideoToUsersVideos = async () => {
//                                                     try {
//                                                         await db.query('INSERT INTO users_videos VALUES($1, $2)',
//                                                         [req.user.user_id, tiktokId])
//                                                         availableVideosAllAdded()
//                                                     } catch(error) {
//                                                         res.status(500).send(error.stack)
//                                                     }
//                                                 }
//                                                 addVideoToUsersVideos()
//                                             } else {
//                                                 callback(null, newVideo, tiktokId)
//                                             }
//                                         } catch(error) {
//                                             res.status(500).send(error.stack)
//                                         }
//                                     }
//                                     checkAllVideosForDuplicates()
//                                 },
// /*                                 function addVideo (newVideo, callback) {
//                                     User.findOne({ 'email' : req.user.email })
//                                     .exec((error, user) => {
//                                         if (error) {
//                                             return next(error)
//                                         }
//                                         user.videos.push(newVideo)
//                                         user.save((error) => {
//                                             if (error) {
//                                                 return next(error)
//                                             }
//                                             console.log('Video added!')
//                                             availableVideosAllAdded()
//                                         })
//                                     })
//                                 }, */
//                                 function addVideo (newVideo, callback) {
//                                     const addVideo = async () => {
//                                         try {
//                                             await db.query('BEGIN')
//                                             const insertVideoText = 'INSERT INTO videos VALUES($1, $2, $3, $4, $5, $6)'
//                                             const insertVideoValues = [newVideo.id, newVideo.url, newVideo.title,
//                                                 newVideo.authorUrl, newVideo.authorName, newVideo.dateAdded]
//                                             await db.query(insertVideoText, insertVideoValues)
//                                             const insertReferenceText = 'INSERT INTO users_videos VALUES($1, $2)'
//                                             const insertReferenceValues = [req.user.user_id, newVideo.id]
//                                             await db.query(insertReferenceText, insertReferenceValues)
//                                             await db.query('COMMIT')
//                                             console.log('Video added!')
//                                             availableVideosAllAdded()
//                                         }
//                                         catch(error) {
//                                             await db.query('ROLLBACK')
//                                             res.send(500).status(error)
//                                         }
//                                     }
//                                     addVideo()
//                                 }
//                             ])
//                         } else {
//                             return
//                         }
//                     } catch(status) {
//                         const awaitError = `Unsuccessful await attempt: \n
//                         Status: ${status}`
//                         res.status(500).send(awaitError)
//                     }
//                 }, 500)
//             }
//             res.redirect('/')
//         }
//     ])
}

exports.video_delete_post = function(req, res, next) {
    const videos = req.body.deleted_video
    const deleteVideo = async () => {
        try {
            await db.query('BEGIN')
            const videoIdsToDelete = videos.length
            let arrayPosition = 0
            while (arrayPosition < videoIdsToDelete) {
                if (typeof(videos) === 'string') {
                    await db.query(`DELETE FROM lists_videos USING users_videos
                    WHERE lists_videos.video_id = users_videos.video_id AND user_id = $1 AND
                    lists_videos.video_id = $2`,
                    [req.user.user_id, videos])
                    await db.query('DELETE FROM users_videos WHERE user_id = $1 AND video_id = $2',
                [req.user.user_id, videos])
                }
                await db.query(`DELETE FROM lists_videos USING users_videos
                WHERE lists_videos.video_id = users_videos.video_id AND user_id = $1 AND
                lists_videos.video_id = $2`,
                [req.user.user_id, videos[arrayPosition]])
                await db.query('DELETE FROM users_videos WHERE user_id = $1 AND video_id = $2',
                [req.user.user_id, videos[arrayPosition]])
                arrayPosition++
            }
            await db.query('COMMIT')
            res.redirect('/')
        }
        catch(error) {
            await db.query('ROLLBACK')
            res.status(500).send(error.stack)
        }
    }
    deleteVideo()
}

exports.video_search_post = [
    validator.body('video_search').trim().escape()
    .isLength( {min: 1} ).withMessage('Please enter a search term.'),
    validator.body('video_search'),
    (req, res) => {
        const errors = validator.validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessage = `${errors['errors']['0']['msg']}
            You entered: ${errors['errors']['0']['value']}`
            res.status(200).send(errorMessage)
        }
        const page = req.params.page
        const videoQuery = req.body.video_search.toString()
        app.locals.searchQuery = videoQuery
        res.redirect(page)
    }
]

exports.video_search_get = function(req, res, next) {
    const page = req.params.page
    const previousPage = req.header('referer')
    async.parallel({
        pagination: (callback) => {
            const pagination = {
                'current_page': page,
                'previous_page': previousPage,
                'video_limit': videoLimitPerPage,
            }
            callback(null, pagination)
        },
        get_videos: function(callback) {
            const getVideos = async () => {
                const text = `SELECT users_videos.video_id, url, title, author_url, author_name, date_added, date_bookmarked FROM users_videos
                INNER JOIN videos
                ON videos.video_id = users_videos.video_id
                WHERE users_videos.user_id = $1
                AND (videos.title ~* $2 OR videos.author_name ~* $2)
                ORDER BY date_bookmarked ASC
                LIMIT ${videoLimitPerPage}
                OFFSET ${videoLimitPerPage * (page - 1)}`
                const values = [req.user.user_id, app.locals.searchQuery]
                try {
                    const videoQuery = await db.query(text, values)
                    const videoQueryResults = videoQuery.rows
                    console.log(app.locals.searchQuery)
                    callback(null, videoQueryResults)
                } catch(error) {
                    res.status(500).send(error.stack)
                }
            }
            getVideos()
        },
        count_videos: (callback) => {
            const countVideos = async () => {
                const text = `SELECT users_videos.video_id, url, title, author_url, author_name, date_added, date_bookmarked FROM users_videos
                INNER JOIN videos
                ON videos.video_id = users_videos.video_id
                WHERE users_videos.user_id = $1
                AND (videos.title ~* $2 OR videos.author_name ~* $2)`
                const values = [req.user.user_id, app.locals.searchQuery]
                try {
                    const videoQuery = await db.query(text, values)
                    const videoQueryResults = videoQuery.rows.length
                    callback(null, videoQueryResults)
                } catch(error) {
                    res.send(500).status(error.stack)
                }
            }
            countVideos()
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
    const destinationList = parseInt(req.body.move_destination)
    async.waterfall([
        function checkListForDuplicates (callback) {
            const checkListForDuplicates = async () => {
                console.log('Checking for duplicates in list '+destinationList+' for video(s) '+videoIds)
                const text = 'SELECT video_id FROM lists_videos WHERE list_id = $1 AND video_id = ANY($2)'
                const values = [destinationList, videoIds]
                try {
                    const videoQuery = await db.query(text, values)
                    const videosInList = videoQuery.rows
                    console.group('Query results:')
                    console.log(videosInList)
                    console.log('Length: '+videosInList.length)
                    console.groupEnd()
                    callback(null, videosInList)
                } catch(error) {
                    res.status(500).send(error.stack)
                }
            }
            checkListForDuplicates()
        },
        function skipDuplicates (videosInList, callback) {
                const queryDuplicatesFiltered = videosInList.map(video => video['video_id'])
                const videosToAdd = videoIds.filter(video => queryDuplicatesFiltered.includes(video) === false)
                if (videosToAdd.length === 0) {
                    res.status(200).send('All videos selected already exist in this list.')
                }
                callback(null, videosToAdd)
        },
        function addVideosToList (videosToAdd, callback) {
            const addVideosToList = async () => {
                try {
                    await db.query('BEGIN')
                    const videoIdsToAdd = videosToAdd.length
                    let arrayPosition = 0
                    while (arrayPosition < videoIdsToAdd) {
                        console.log('Adding video to list!')
                        const text = 'INSERT INTO lists_videos VALUES($1, $2)'
                        const values = [destinationList, videosToAdd[arrayPosition]]
                        await db.query(text, values)
                        arrayPosition++
                    }
                    await db.query('COMMIT')
                } catch(error) {
                    res.status(500).send(error.stack)
                }
            }
            addVideosToList()
            res.redirect(`../list/${destinationList}`)
        }
    ])
}
