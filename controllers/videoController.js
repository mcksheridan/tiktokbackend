/* eslint-disable func-names */
/* eslint-disable no-shadow */
/* eslint-disable no-await-in-loop */

const validator = require('express-validator');
const { https } = require('follow-redirects');
const fs = require('fs');
const BigNumber = require('big-number');

const express = require('express');

const app = express();

const async = require('async');
const fetch = require('node-fetch');

const Rollbar = require('rollbar');

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_KEY,
  captureUncaught: true,
  captureUnhandledRejections: true,
});

const logErrors = (level, info, ...params) => {
  rollbar[level](info, ...params);
};

const db = require('../db');

const {
  checkFileData, extractLikeListData, createVideoDateObjects, removeNullVideoDateEntries,
} = require('./handleLikeList');
const { getTiktokId, getDateAddedFromTikTokId } = require('./handleTikTokId');

const utilVariables = require('./util/variables');

app.locals.videoLimitPerPage = 15;
const { videoLimitPerPage } = app.locals;

exports.index = (req, res) => {
  logErrors('error', 'Testing the log error function', { testParameter: 'This is a test' }, { testParamterTwo: 'This is also a test. ' });
  const page = parseInt(req.params.page, 10);
  const values = [req.user.user_id];
  async.parallel({
    pagination: (callback) => {
      const pagination = {
        current_page: page,
        video_limit: videoLimitPerPage,
      };
      callback(null, pagination);
    },
    get_lists: (callback) => {
      const listLists = async () => {
        const text = 'SELECT * FROM lists WHERE user_id = $1 ORDER BY lower(name)';
        try {
          const listQuery = await db.query(text, values);
          const listQueryResults = listQuery.rows;
          callback(null, listQueryResults);
        } catch (error) {
          res.status(500).send(error.stack);
        }
      };
      listLists();
    },
    get_videos: (callback) => {
      const getSortOption = (userInput) => {
        if (userInput === undefined) {
          return 'date_bookmarked DESC';
        }
        return userInput;
      };
      const getVideos = async (text) => {
        try {
          const videoQuery = await db.query(text, values);
          const videoQueryResults = videoQuery.rows;
          callback(null, videoQueryResults);
        } catch (error) {
          res.status(500).send(error.stack);
        }
      };
      const getVideosCaseInsensitive = () => {
        const text = `SELECT users_videos.video_id, url, title, author_url, author_name, date_added, date_bookmarked FROM users_videos
              INNER JOIN videos
              ON videos.video_id = users_videos.video_id
              WHERE users_videos.user_id = $1
              ORDER BY ${getSortOption(app.locals.sortVideoOption)}
              LIMIT ${videoLimitPerPage}
              OFFSET ${videoLimitPerPage * (page - 1)}`;
        getVideos(text);
      };
      const getVideosCaseSensitive = (column, direction) => {
        const text = `SELECT users_videos.video_id, url, title, author_url, author_name, date_added, date_bookmarked FROM users_videos
              INNER JOIN videos
              ON videos.video_id = users_videos.video_id
              WHERE users_videos.user_id = $1
              ORDER BY lower(${column}) ${direction}
              LIMIT ${videoLimitPerPage}
              OFFSET ${videoLimitPerPage * (page - 1)}`;
        getVideos(text);
      };
      const checkCaseSensitivity = () => {
        const startsWithDate = (getSortOption(app.locals.sortVideoOption)).startsWith('date');
        if (startsWithDate) {
          getVideosCaseInsensitive();
        } else {
          const sortOptionArray = app.locals.sortVideoOption.split(' ');
          const sortColumn = sortOptionArray[0];
          const sortDirection = sortOptionArray[1];
          getVideosCaseSensitive(sortColumn, sortDirection);
        }
      };
      checkCaseSensitivity();
    },
    count_videos: (callback) => {
      const countVideos = async () => {
        const text = 'SELECT * FROM users_videos WHERE user_id = $1';
        try {
          const videoQuery = await db.query(text, values);
          const videoQueryResults = videoQuery.rows.length;
          callback(null, videoQueryResults);
        } catch (error) {
          res.status(500).send(error.stack);
        }
      };
      countVideos();
    },
    get_user_info: (callback) => {
      const getUserInfo = async () => {
        const text = 'SELECT * FROM users WHERE user_id = $1';
        try {
          const userQuery = await db.query(text, values);
          const userQueryResults = userQuery.rows[0];
          callback(null, userQueryResults);
        } catch (error) {
          res.status(500).send(error.stack);
        }
      };
      getUserInfo();
    },
  },
  (err, results) => {
    res.render('index', { title: 'TikTok Favorites', error: err, data: results });
  });
};

exports.video_create_post = [
  validator.body('video_url').trim()
    .isURL({ protocols: ['https'], require_protocol: true })
    .withMessage('Please enter a valid TikTok URL beginning with https://')
    .contains('tiktok.com', { ignoreCase: true })
    .withMessage('Please enter a URL from TikTok.com'),
  validator.body('video_url'),
  (req, res) => {
    const errors = validator.validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessage = `${errors.errors['0'].msg}.
            You entered: ${errors.errors['0'].value}`;
      res.status(200).send(errorMessage);
    }
    async.waterfall([
      function getRedirect(callback) {
        https.get(req.body.video_url, (response) => {
          const redirectedUrl = response.responseUrl;
          callback(null, redirectedUrl);
        });
      },
      function (redirectedUrl, callback) {
        const getTiktokData = (async () => {
          const tiktokResponse = await fetch(`https://www.tiktok.com/oembed?url=${redirectedUrl}`);
          if (tiktokResponse.status >= 200 && tiktokResponse.status <= 299) {
            const tiktokData = await tiktokResponse.json();
            callback(null, redirectedUrl, tiktokData);
          } else {
            // NOTE: Change to a flash message!!
            const fetchError = `Unsuccessful fetch response: \n
                        Status: ${tiktokResponse.status} \n
                        ${tiktokResponse.statusText}`;
            res.status(500).send(fetchError);
          }
        });
        getTiktokData();
      },
      function checkDataValidity(redirectedUrl, tiktokData, callback) {
        if (tiktokData.title === undefined) {
          // NOTE: Change to a flash message!
          const videoUnavailableMessage = 'This video is unavailable. It may have been deleted.';
          res.status(200).send(videoUnavailableMessage);
        } else {
          callback(null, redirectedUrl, tiktokData);
        }
      },
      function saveValidatedData(redirectedUrl, tiktokData, callback) {
        const newVideo = {
          url: redirectedUrl,
          title: tiktokData.title,
          authorUrl: tiktokData.author_url,
          authorName: tiktokData.author_name,
        };
        callback(null, redirectedUrl, newVideo);
      },
      function getTiktokId(redirectedUrl, newVideo, callback) {
        const idRegexPattern = new RegExp(/\d+/);
        if (redirectedUrl.startsWith('https://m')) {
          const tiktokIdArray = redirectedUrl.match(idRegexPattern);
          const tiktokId = tiktokIdArray[0];
          callback(null, newVideo, tiktokId);
        }
        if (redirectedUrl.startsWith('https://www')) {
          const videoRegexPattern = new RegExp(/video\/\d+/);
          const tiktokVideoPattern = redirectedUrl.match(videoRegexPattern);
          const tiktokVideoString = tiktokVideoPattern.toString();
          const tiktokIdArray = tiktokVideoString.match(idRegexPattern);
          const tiktokId = tiktokIdArray[0];
          callback(null, newVideo, tiktokId);
        }
      },
      function checkUsersVideosForDuplicates(newVideo, tiktokId, callback) {
        const checkUsersVideosForDuplicates = async () => {
          const text = 'SELECT * FROM users_videos WHERE user_id = $1 AND video_id = $2';
          const values = [req.user.user_id, tiktokId];
          try {
            const videoQuery = await db.query(text, values);
            const videoQueryResults = videoQuery.rows;
            if (videoQueryResults.length > 0) {
              const foundVideoMessage = `A video with id ${tiktokId} already exists in this account.`;
              // Note: Change to a flash message!
              res.status(200).send(foundVideoMessage);
            }
            callback(null, newVideo, tiktokId);
          } catch (error) {
            res.status(500).send(error.stack);
          }
        };
        checkUsersVideosForDuplicates();
      },
      function checkAllVideosForDuplicates(newVideo, tiktokId, callback) {
        const checkAllVideosForDuplicates = async () => {
          const text = 'SELECT * FROM videos WHERE video_id = $1';
          const values = [tiktokId];
          try {
            const videoQuery = await db.query(text, values);
            const videoQueryResults = videoQuery.rows;
            if (videoQueryResults.length > 0) {
              const addVideoToUsersVideos = async () => {
                try {
                  await db.query('INSERT INTO users_videos VALUES($1, $2)',
                    [req.user.user_id, tiktokId]);
                  res.redirect('/');
                } catch (error) {
                  res.status(500).send(error.stack);
                }
              };
              addVideoToUsersVideos();
            }
            callback(null, newVideo, tiktokId);
          } catch (error) {
            res.status(500).send(error.stack);
          }
        };
        checkAllVideosForDuplicates();
      },
      function getBinaryId(newVideo, tiktokId, callback) {
        const tiktokIdBigIntBinaryArray = [];
        const tiktokIdInteger = BigNumber(tiktokId);
        let currentInteger = tiktokIdInteger;
        while (currentInteger > BigNumber(0)) {
          const remainder = BigNumber(currentInteger).mod(2);
          const remainderString = remainder.toString();
          tiktokIdBigIntBinaryArray.unshift(remainderString);
          currentInteger = BigNumber(currentInteger).div(2);
          // eslint-disable-next-line eqeqeq
          if (currentInteger == 0) {
            const currentIntegerString = currentInteger.toString();
            tiktokIdBigIntBinaryArray.unshift(currentIntegerString);
          }
        }
        callback(null, newVideo, tiktokId, tiktokIdBigIntBinaryArray);
      },
      function getThirtyTwoLeftBits(newVideo, tiktokId, tiktokIdBigIntBinaryArray, callback) {
        const tiktokIdBinaryArray = tiktokIdBigIntBinaryArray.map((number) => parseInt(number, 10));
        const tiktokIdBinaryString = tiktokIdBinaryArray.join('');
        const thirtyTwoLeftBits = tiktokIdBinaryString.slice(0, 32);
        callback(null, newVideo, tiktokId, thirtyTwoLeftBits);
      },
      function getDecimalFromBits(newVideo, tiktokId, thirtyTwoLeftBits, callback) {
        const decimalArray = [];
        let arrayPlace = 0;
        let previousValue = 0;
        while (arrayPlace < 32) {
          const valueTotal = previousValue * 2;
          const bitAsInteger = parseInt(thirtyTwoLeftBits[arrayPlace], 10);
          const newTotal = bitAsInteger + valueTotal;
          decimalArray[0] = newTotal;
          previousValue = newTotal;
          arrayPlace += 1;
        }
        const decimal = decimalArray.toString();
        callback(null, newVideo, tiktokId, decimal);
      },
      function getDateAdded(newVideo, tiktokId, decimal, callback) {
        const dateAdded = new Date(decimal * 1000);
        console.log('Data from get date added:');
        console.log(newVideo);
        callback(null, newVideo, tiktokId, dateAdded);
      },
      function saveIdAndDateAdded(newVideo, tiktokId, dateAdded, callback) {
        // eslint-disable-next-line no-param-reassign
        newVideo.id = tiktokId;
        // eslint-disable-next-line no-param-reassign
        newVideo.dateAdded = dateAdded;
        callback(null, newVideo);
      },
      function addVideo(newVideo) {
        const addVideo = async () => {
          try {
            await db.query('BEGIN');
            const insertVideoText = 'INSERT INTO videos VALUES($1, $2, $3, $4, $5, $6)';
            const insertVideoValues = [newVideo.id, newVideo.url, newVideo.title,
              newVideo.authorUrl, newVideo.authorName, newVideo.dateAdded];
            await db.query(insertVideoText, insertVideoValues);
            const insertReferenceText = 'INSERT INTO users_videos VALUES($1, $2)';
            const insertReferenceValues = [req.user.user_id, newVideo.id];
            await db.query(insertReferenceText, insertReferenceValues);
            await db.query('COMMIT');
            res.redirect('/');
          } catch (error) {
            await db.query('ROLLBACK');
            res.send(500).status(error);
          }
        };
        addVideo();
      },
    ]);
  },
];

exports.video_multiadd_post = function (req, res) {
  const checkFileValidity = () => {
    if (!req.file) {
      res.send(utilVariables.ERROR_MSG.invalidFile.type);
      return undefined;
    }
    const likeList = fs.readFileSync(req.file.path, 'UTF-8');
    fs.unlinkSync(req.file.path);
    return likeList;
  };

  const handleFileData = (file) => {
    const fileDataCheck = checkFileData(file);
    const fileStatus = fileDataCheck.status;
    if (fileStatus === 'Empty') {
      res.send(utilVariables.ERROR_MSG.invalidFile.empty);
      return undefined;
    }
    if (fileStatus === 'Invalid') {
      res.send(utilVariables.ERROR_MSG.invalidFile.characters);
      return undefined;
    }
    return fileDataCheck.data;
  };

  const parseList = () => {
    const fileData = checkFileValidity();
    const likeList = handleFileData(fileData);
    const likeListDateVideoArray = extractLikeListData(likeList);
    const unfilteredVideoDateObjectArray = createVideoDateObjects(likeListDateVideoArray);
    const allVideosAndDates = removeNullVideoDateEntries(unfilteredVideoDateObjectArray);
    return allVideosAndDates;
  };

  const parsedList = parseList();

  const getRedirectedUrl = async (url) => {
    try {
      const response = await fetch(url);
      const redirectedUrl = await response.url;
      return redirectedUrl;
    } catch (error) {
      console.error(error.message);
    }
    return undefined;
  };

  const getTikTokApiData = async (url) => {
    const redirectedUrl = await getRedirectedUrl(url);
    const tiktokResponse = await fetch(`${utilVariables.TIKTOK_API}${redirectedUrl}`);
    try {
      const tiktokData = await tiktokResponse.json();
      return tiktokData;
    } catch (error) {
      console.error(error.message);
      return utilVariables.ERROR_MSG.api.tiktok;
    }
  };

  const isApiDataAvailable = (data) => {
    /* A video that has been removed from TikTok will still have a successful API response.
    Its JSON data will look like this: { status_msg: 'Something went wrong' } */
    if (data.status_msg) {
      return false;
    }
    return true;
  };

  const getVideoDataObject = async (data, videoDateArray) => {
    const video = {
      title: await data.title,
      authorUrl: await data.author_url,
      authorName: await data.author_name,
      dateBookmarked: videoDateArray.date,
    };
    return video;
  };

  const allVideosAndDatesLength = parsedList.length;
  const checkUsersVideosForDuplicates = async (userId, videoId) => {
    const text = 'SELECT * FROM users_videos WHERE user_id = $1 AND video_id = $2';
    const values = [userId, videoId];
    try {
      const query = await db.query(text, values);
      const results = query.rows;
      return results.length > 0;
    } catch (error) {
      console.error(error.stack);
      res.status(500).send(utilVariables.ERROR_MSG.database.read);
    }
    return true;
  };

  const checkAllVideosForDuplicates = async (videoId) => {
    const text = 'SELECT * FROM videos WHERE video_id = $1';
    const values = [videoId];
    try {
      const query = await db.query(text, values);
      const results = query.rows;
      if (results.length > 0) {
        return true;
      }
      return false;
    } catch (error) {
      console.error(error.stack);
      res.status(500).send(utilVariables.ERROR_MSG.database.read);
    }
    return true;
  };

  const addVideoToAllVideos = async (video) => {
    const text = 'INSERT INTO videos VALUES($1, $2, $3, $4, $5, $6)';
    const values = [video.id, video.url, video.title, video.authorUrl,
      video.authorName, video.dateAdded];
    try {
      await db.query(text, values);
      console.log('Video added to all videos');
    } catch (error) {
      console.error(error.stack);
      res.status(500).send(utilVariables.ERROR_MSG.database.write);
    }
  };

  const addVideoToUsersVideos = async (userId, video) => {
    const text = 'INSERT INTO users_videos VALUES($1, $2, $3)';
    const values = [userId, video.id, video.dateBookmarked];
    try {
      await db.query(text, values);
      console.log('Video added to user\'s videos!');
    } catch (error) {
      console.error(error.stack);
      res.status(500).send(utilVariables.ERROR_MSG.database.write);
    }
  };

  const addVideo = async (isUsersVideosDuplicate, isAllVideosDuplicate, video, userId) => {
    if (!isUsersVideosDuplicate) {
      if (!isAllVideosDuplicate) {
        console.log('This video should be added to the general database');
        try {
          await addVideoToAllVideos(video);
        } catch (error) {
          console.error(error.stack);
        }
      }
      console.log('This video should be added to the user\'s videos');
      try {
        await addVideoToUsersVideos(userId, video);
        return;
      } catch (error) {
        console.error(error.stack);
      }
    }
    const videoExistsInDatabaseMessage = 'This video already exists in the database';
    console.log(videoExistsInDatabaseMessage);
    return videoExistsInDatabaseMessage;
  };

  let queuePosition = 0;

  const processVideos = (queueRemaining, videoDateArray) => {
    setTimeout(async () => {
      if (queueRemaining > 0) {
        const tiktokData = await getTikTokApiData(videoDateArray[queuePosition].video);
        if (isApiDataAvailable(tiktokData)) {
          const newVideo = await getVideoDataObject(tiktokData, videoDateArray[queuePosition]);
          newVideo.id = getTiktokId(videoDateArray[queuePosition].video);
          newVideo.url = `${newVideo.authorUrl}/video/${newVideo.id}`;
          newVideo.dateAdded = getDateAddedFromTikTokId(newVideo.id);
          console.log(`Video ${queuePosition} processed: ${newVideo.url}`);
          const isUsersVideosDuplicate = checkUsersVideosForDuplicates(req.user.user_id,
            newVideo.id);
          const isAllVideosDuplicate = checkAllVideosForDuplicates(newVideo.id);
          addVideo(isUsersVideosDuplicate, isAllVideosDuplicate, newVideo, req.user.user_id);
        }
        queuePosition += 1;
        const queueRemainingVariable = queueRemaining - 1;
        console.log(`There are ${queueRemainingVariable} videos remaining`);
        processVideos(queueRemainingVariable, videoDateArray);
      }
    }, 500);
  };

  processVideos(allVideosAndDatesLength, parsedList);

  res.redirect('/');
};

exports.video_delete_post = function (req, res) {
  const videos = req.body.deleted_video;
  const deleteVideo = async () => {
    try {
      await db.query('BEGIN');
      const videoIdsToDelete = videos.length;
      let arrayPosition = 0;
      while (arrayPosition < videoIdsToDelete) {
        if (typeof (videos) === 'string') {
          await db.query(`DELETE FROM lists_videos USING users_videos
                    WHERE lists_videos.video_id = users_videos.video_id AND user_id = $1 AND
                    lists_videos.video_id = $2`,
          [req.user.user_id, videos]);
          await db.query('DELETE FROM users_videos WHERE user_id = $1 AND video_id = $2',
            [req.user.user_id, videos]);
        }
        await db.query(`DELETE FROM lists_videos USING users_videos
                WHERE lists_videos.video_id = users_videos.video_id AND user_id = $1 AND
                lists_videos.video_id = $2`,
        [req.user.user_id, videos[arrayPosition]]);
        await db.query('DELETE FROM users_videos WHERE user_id = $1 AND video_id = $2',
          [req.user.user_id, videos[arrayPosition]]);
        arrayPosition += 1;
      }
      await db.query('COMMIT');
      res.redirect('/');
    } catch (error) {
      await db.query('ROLLBACK');
      res.status(500).send(error.stack);
    }
  };
  deleteVideo();
};

exports.video_search_post = [
  validator.body('video_search').trim().escape()
    .isLength({ min: 1 })
    .withMessage('Please enter a search term.'),
  validator.body('video_search'),
  (req, res) => {
    const errors = validator.validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessage = `${errors.errors['0'].msg}
            You entered: ${errors.errors['0'].value}`;
      res.status(200).send(errorMessage);
    }
    const { page } = req.params;
    const videoQuery = req.body.video_search.toString();
    app.locals.searchQuery = videoQuery;
    res.redirect(page);
  },
];

exports.video_search_get = function (req, res, next) {
  const { page } = req.params;
  const previousPage = req.header('referer');
  async.parallel({
    pagination: (callback) => {
      const pagination = {
        current_page: page,
        previous_page: previousPage,
        video_limit: videoLimitPerPage,
      };
      callback(null, pagination);
    },
    get_videos(callback) {
      const getVideos = async () => {
        const text = `SELECT users_videos.video_id, url, title, author_url, author_name, date_added, date_bookmarked FROM users_videos
                INNER JOIN videos
                ON videos.video_id = users_videos.video_id
                WHERE users_videos.user_id = $1
                AND (videos.title ~* $2 OR videos.author_name ~* $2)
                ORDER BY date_bookmarked ASC
                LIMIT ${videoLimitPerPage}
                OFFSET ${videoLimitPerPage * (page - 1)}`;
        const values = [req.user.user_id, app.locals.searchQuery];
        try {
          const videoQuery = await db.query(text, values);
          const videoQueryResults = videoQuery.rows;
          console.log(app.locals.searchQuery);
          callback(null, videoQueryResults);
        } catch (error) {
          res.status(500).send(error.stack);
        }
      };
      getVideos();
    },
    count_videos: (callback) => {
      const countVideos = async () => {
        const text = `SELECT users_videos.video_id, url, title, author_url, author_name, date_added, date_bookmarked FROM users_videos
                INNER JOIN videos
                ON videos.video_id = users_videos.video_id
                WHERE users_videos.user_id = $1
                AND (videos.title ~* $2 OR videos.author_name ~* $2)`;
        const values = [req.user.user_id, app.locals.searchQuery];
        try {
          const videoQuery = await db.query(text, values);
          const videoQueryResults = videoQuery.rows.length;
          callback(null, videoQueryResults);
        } catch (error) {
          res.send(500).status(error.stack);
        }
      };
      countVideos();
    },
  }, (error, results) => {
    if (error) {
      next(error);
    }
    res.render('video-search', { title: 'Search Results', error, data: results });
  });
};

exports.video_sort_post = function (req, res) {
  const sortOption = req.body.video_sort;
  app.locals.sortVideoOption = sortOption;
  res.redirect('/');
};

exports.video_move_post = function (req, res) {
  const videos = req.body.moved_video;
  const videoString = videos.toString();
  const videoIds = videoString.split(',');
  const destinationList = parseInt(req.body.move_destination, 10);
  async.waterfall([
    function checkListForDuplicates(callback) {
      const checkListForDuplicates = async () => {
        console.log(`Checking for duplicates in list ${destinationList} for video(s) ${videoIds}`);
        const text = 'SELECT video_id FROM lists_videos WHERE list_id = $1 AND video_id = ANY($2)';
        const values = [destinationList, videoIds];
        try {
          const videoQuery = await db.query(text, values);
          const videosInList = videoQuery.rows;
          console.group('Query results:');
          console.log(videosInList);
          console.log(`Length: ${videosInList.length}`);
          console.groupEnd();
          callback(null, videosInList);
        } catch (error) {
          res.status(500).send(error.stack);
        }
      };
      checkListForDuplicates();
    },
    function skipDuplicates(videosInList, callback) {
      const queryDuplicatesFiltered = videosInList.map((video) => video.video_id);
      // eslint-disable-next-line max-len
      const videosToAdd = videoIds.filter((video) => queryDuplicatesFiltered.includes(video) === false);
      if (videosToAdd.length === 0) {
        res.status(200).send('All videos selected already exist in this list.');
      }
      callback(null, videosToAdd);
    },
    function addVideosToList(videosToAdd) {
      const addVideosToList = async () => {
        try {
          await db.query('BEGIN');
          const videoIdsToAdd = videosToAdd.length;
          let arrayPosition = 0;
          while (arrayPosition < videoIdsToAdd) {
            console.log('Adding video to list!');
            const text = 'INSERT INTO lists_videos VALUES($1, $2)';
            const values = [destinationList, videosToAdd[arrayPosition]];
            await db.query(text, values);
            arrayPosition += 1;
          }
          await db.query('COMMIT');
        } catch (error) {
          res.status(500).send(error.stack);
        }
      };
      addVideosToList();
      res.redirect(`../list/${destinationList}`);
    },
  ]);
};
