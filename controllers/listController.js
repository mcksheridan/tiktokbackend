const validator = require('express-validator')
const { https } = require('follow-redirects')
var async = require('async')
var fetch = require('node-fetch')

const express = require('express')
const db = require('../db')
const app = express()

const BigNumber = require('big-number')

app.locals.videoLimitPerPage = 15
const videoLimitPerPage = app.locals.videoLimitPerPage

exports.list_detail = function(req, res, next) {
    const currentListId = parseInt(req.params.id)
    const page = parseInt(req.params.page)
    async.parallel({
        pagination: (callback) => {
            const previousPage = () => {
                const refererPage = req.header('referer')
                if (refererPage === undefined) {
                    return undefined
                } else {
                    const bookmarkPage = new RegExp(/http:\/\/localhost:3000\/bookmarks\/\d+/)
                    if (refererPage.match(bookmarkPage)) {
                        return refererPage
                    } else {
                        return undefined
                    }
                }
            }
            const pagination = {
                'current_page': page,
                'previous_page': previousPage(),
                'video_limit': videoLimitPerPage,
            }
            callback(null, pagination)
        },
        current_list: (callback) => {
            const currentList = {
                'id': currentListId
            }
            const getListName = async() => {
                const text = 'SELECT name FROM lists WHERE list_id = $1'
                const values = [currentListId]
                try {
                    const listQuery = await db.query(text, values)
                    const listName = listQuery.rows[0]['name']
                    currentList.name = listName
                } catch(error) {
                    res.status(500).send(error.stack)
                }
            }
            getListName()
            callback(null, currentList)
        },
        get_lists: (callback) => {
            const listLists = async () => {
                const text =
                `SELECT * FROM lists WHERE user_id = $1
                AND list_id != $2 ORDER BY lower(name)`
                const values = [req.user.user_id, currentListId]
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
            const values = [currentListId]
            const getSortOption = (userInput) => {
                if (userInput === undefined) {
                    return 'lists_videos.date_added DESC'
                }
                return userInput
            }
            const checkCaseSensitivity = () => {
                const startsWithLists = (getSortOption(app.locals.sortListOption)).startsWith('lists')
                const startsWithVideos = (getSortOption(app.locals.sortListOption)).startsWith('videos')
                if (startsWithLists || startsWithVideos) {
                    getVideosCaseInsensitive()
                } else {
                    const sortOptionArray = app.locals.sortListOption.split(' ')
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
                const text = `SELECT lists_videos.video_id, lists_videos.date_added,
                url, title, author_url, author_name, videos.date_added
                FROM lists_videos
                INNER JOIN videos
                ON videos.video_id = lists_videos.video_id
                WHERE lists_videos.list_id = $1
                ORDER BY ${getSortOption(app.locals.sortListOption)}
                LIMIT ${videoLimitPerPage}
                OFFSET ${videoLimitPerPage * (page - 1)}`
                getVideos(text)
            }
            const getVideosCaseSensitive = (column, direction) => {
                const text = `SELECT lists_videos.video_id, lists_videos.date_added,
                url, title, author_url, author_name, videos.date_added
                FROM lists_videos
                INNER JOIN videos
                ON videos.video_id = lists_videos.video_id
                WHERE lists_videos.list_id = $1
                ORDER BY lower(${column}) ${direction}
                LIMIT ${videoLimitPerPage}
                OFFSET ${videoLimitPerPage * (page - 1)}`
                getVideos(text)
            }
            checkCaseSensitivity()
        },
        count_videos: (callback) => {
            const countVideos = async () => {
                const text = 'SELECT * FROM lists_videos WHERE list_id = $1'
                const values = [currentListId]
                try {
                    const listQuery = await db.query(text, values)
                    const listQueryResults = listQuery.rows
                    const videoCount = listQueryResults.length
                    callback(null, videoCount)
                } catch(error) {
                    res.status(500).send(error.stack)
                }
            }
            countVideos()
        }
    }, function(error, results) {
        if (error) {
            res.status(500).send(error.stack)
        }
        res.render('list_detail', { title: `TikTok Favorites: ${results.current_list['name']}`, data: results})
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
        if (!errors.isEmpty()) {
            const errorMessage = `${errors['errors']['0']['msg']}.
            You entered: ${errors['errors']['0']['value']}`
            res.status(200).send(errorMessage)
        }
        const checkExistingLists = async() => {
            const listName = `^${req.body.list_name}$`
            const text = 'SELECT * FROM lists WHERE user_id = $1 AND name ~* $2'
            const values = [req.user.user_id, listName]
            try {
                const listQuery = await db.query(text, values)
                const listResults = listQuery.rows
                if (listResults.length > 0) {
                    res.status(200).send('A list with that name already exists.')
                } else {
                addNewList()
                }
            } catch (error) {
                res.status(500).send(error.stack)
            }
        }
        const addNewList = async() => {
            const text = 'INSERT INTO lists (user_id, name) VALUES ($1, $2) RETURNING list_id'
            const values = [req.user.user_id, req.body.list_name]
            try {
                const newListQuery = await db.query(text, values)
                const newListId = newListQuery.rows[0]['list_id']
                res.redirect(newListId)
            } catch(error) {
                res.status(500).send(error.stack)
            }
        }
        checkExistingLists()
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
    const deleteVideo = async () => {
        try {
            await db.query('BEGIN')
            const videoIdsToDelete = videoIds.length
            let arrayPosition = 0
            while (arrayPosition < videoIdsToDelete) {
                await db.query('DELETE FROM lists_videos WHERE list_id = $1 AND video_id = $2',
                [listId, videoIds[arrayPosition]])
                arrayPosition++
            }
            await db.query('COMMIT')
            res.redirect(referer)
        } catch(error) {
            res.status(500).send(error.stack)
        }
    }
    deleteVideo()
}

exports.list_add_video_post = [
    validator.body('video_url', 'Please enter a valid TikTok URL.').trim()
    .isURL( { protocols: ['https'], require_protocol: true, } )
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
            // Check Current List for Duplicate
            function checkListForDuplicates (newVideo, tiktokId, callback) {
                const checkListForDuplicates = async () => {
                    const text = 'SELECT * FROM lists_videos WHERE list_id = $1 AND video_id = $2'
                    const values = [listId, tiktokId]
                    try {
                        const videoQuery = await db.query(text, values)
                        const videoQueryResults = videoQuery.rows
                        if (videoQueryResults.length > 0) {
                            const foundVideoMessage = `A video with id ${tiktokId} already exists in this list.`
                            // Note: Change to a flash message!
                            res.status(200).send(foundVideoMessage)
                        }
                        callback(null, newVideo, tiktokId)
                    } catch (error) {
                        res.status(500).send(error.stack)
                    }
                }
                checkListForDuplicates()
            },
            function checkUsersVideosForDuplicates (newVideo, tiktokId, callback) {
                const checkUsersVideosForDuplicates = async () => {
                    const text = 'SELECT * FROM users_videos WHERE user_id = $1 AND video_id = $2'
                    const values = [req.user.user_id, tiktokId]
                    try {
                        const videoQuery = await db.query(text, values)
                        const videoQueryResults = videoQuery.rows
                        if (videoQueryResults.length > 0) {
                            const text = 'INSERT INTO lists_videos VALUES($1, $2)'
                            const values = [listId, tiktokId]
                            await db.query(text, values)
                            res.redirect(listId)
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
                                    await db.query('BEGIN')
                                    await db.query('INSERT INTO users_videos VALUES($1, $2)',
                                    [req.user.user_id, tiktokId])
                                    await db.query('INSERT INTO lists_videos VALUES($1, $2)',
                                    [listId, tiktokId])
                                    await db.query('COMMIT')
                                    res.redirect(listId)
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
                        callback(null, newVideo)
                    }
                    catch(error) {
                        await db.query('ROLLBACK')
                        res.send(500).status(error)
                    }
                }
                addVideo()
            },
            function addVideoToList (newVideo, callback) {
                const addVideoToList = async () => {
                    try {
                        await db.query('INSERT INTO lists_videos VALUES($1, $2)',
                        [listId, newVideo.id])
                        res.redirect(listId)
                    } catch(error) {
                        res.send(500).status(error.stack)
                    }
                }
                addVideoToList()
            }
        ])
    }
]

exports.list_delete_post = function(req, res, next) {
    const list = req.body.list_delete
    const deleteList = async () => {
        const text = 'DELETE FROM lists WHERE list_id = $1'
        const values = [list]
        try {
            await db.query(text, values)
            res.redirect('/')
        } catch (error) {
            res.status(500).send(error.stack)
        }
    }
    deleteList()
}

exports.list_update_post = [
    validator.body('list_update').trim().escape()
    .isLength( {min: 1, max: 100} ).withMessage('Please enter a name between 1 and 100 characters.'),
    (req, res, next) => {
        const errors = validator.validationResult(req)
        const listName = req.body.list_update
        const listId = req.body.list_id
        if (!errors.isEmpty()) {
            const errorMessage = `${errors['errors']['0']['msg']}.
            You entered: ${errors['errors']['0']['value']}`
            res.status(200).send(errorMessage)
        }
        const checkCurrentListSimilarity = async () => {
            try {
                const listQuery = await db.query('SELECT * FROM lists WHERE list_id = $1', [listId])
                const currentListName = listQuery.rows[0]['name']
                const newListNameRegexPattern = `^${listName}$`
                const newListNameRegex = new RegExp(newListNameRegexPattern, 'i')
                if (newListNameRegex.test(currentListName)) {
                    changeListName()
                }
                else {
                    checkDuplicateLists()
                }
            } catch(error) {
                res.status(500).send(error.stack)
            }
        }
        const changeListName = async () => {
            const text = 'UPDATE lists SET name = $1 WHERE list_id = $2'
            const values = [listName, listId]
            try {
                await db.query(text, values)
                const previousPage = req.header('referer')
                res.redirect(previousPage)
            } catch (error) {
                res.status(500).send(error.stack)
            }
        }
        const checkDuplicateLists = async () => {
            const listNameRegex = `^${listName}$`
            const text = 'SELECT * FROM lists WHERE user_id = $1 AND name ~* $2'
            const values = [req.user.user_id, listNameRegex]
            try {
                const listQuery = await db.query(text, values)
                const duplicateList = listQuery.rows
                if (duplicateList.length > 0) {
                    const duplicateListId = duplicateList[0]['list_id']
                    res.redirect(`../${duplicateListId}`)
                } else {
                    changeListName()
                }
            } catch (error) {
                res.status(500).send(error.stack)
            }
        }
        checkCurrentListSimilarity()
    }
]
