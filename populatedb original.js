#! /usr/bin/env node

console.log('This script populates some test books, authors, genres and bookinstances to your database. Specified database as argument - e.g.: populatedb mongodb+srv://cooluser:coolpassword@cluster0-mbdj7.mongodb.net/local_library?retryWrites=true');

// Get arguments passed on command line
var userArgs = process.argv.slice(2);
/*
if (!userArgs[0].startsWith('mongodb')) {
    console.log('ERROR: You need to specify a valid mongodb URL as the first argument');
    return
}
*/
var async = require('async')
var fetch = require('node-fetch');
var Video = require('./models/video')
var BookmarkList = require('./models/bookmarklist')


var mongoose = require('mongoose');
var mongoDB = userArgs[0];
mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var videos = []
var bookmarklists = []

function videoCreate(video_url, date, cb) {
  //videodetail = { video_url: video_url }
  fetch(`https://www.tiktok.com/oembed?url=${video_url}`)
  .then((response) => response.json())
  .then((data) => {
      videodetail = { video_url: video_url }
      videodetail.title = data.title
      videodetail.author_url = data.author_url
      videodetail.author_name = data.author_name
      videodetail.thumbnail_url = data.thumbnail_url
      if (date != false) videodetail.date = date
      var video = new Video(videodetail);
      video.save(function (err) {
        if (err) {
          cb(err, null)
          return
        }
        console.log('New Video: ' + video);
        videos.push(video)
        cb(null, video)
      }  );
  })
}

function bookmarkListCreate(name, video, cb) {
  var bookmarkList = new BookmarkList({ name: name, videos: video });
       
  bookmarkList.save(function (err) {
    if (err) {
      cb(err, null);
      return;
    }
    console.log('New Bookmark List: ' + bookmarkList);
    bookmarklists.push(bookmarkList)
    cb(null, bookmarkList);
  }   );
}

function createVideos(cb) {
    async.series([
        function(callback) {
          videoCreate('https://vm.tiktok.com/ZMJB9Tn4T/', '2020-08-30', callback);
        },
        function(callback) {
          videoCreate('https://vm.tiktok.com/ZMJB9Wkpo/', false, callback);
        },
        function(callback) {
          videoCreate('https://vm.tiktok.com/ZMJB9Gm7L/', '2020-08-29', callback);
        },
        function(callback) {
          videoCreate('https://vm.tiktok.com/ZMJB9ghLv/', '2020-08-25', callback);
        },
        function(callback) {
          videoCreate('https://vm.tiktok.com/ZMJB9XL1U/', '2020-08-22', callback);
        },
        ],
        // optional callback
        cb);
}


function createBookmarkLists(cb) {
    async.parallel([
        function(callback) {
          bookmarkListCreate('today i learned', [videos[0], videos[2],], callback);
        },
        function(callback) {
          bookmarkListCreate('funny', [videos[1],], callback);
        },
        function(callback) {
          bookmarkListCreate('random', [videos[0], videos[3], videos[4],], callback);
        }
        ],
        // optional callback
        cb);
}

async.series([
    createVideos,
    createBookmarkLists,
],
// Optional callback
function(err, results) {
    if (err) {
        console.log('FINAL ERR: '+err);
    }
    else {
        console.log('BOOKMARKLISTInstances: '+bookmarklists);
        
    }
    // All done, disconnect from database
    mongoose.connection.close();
});




