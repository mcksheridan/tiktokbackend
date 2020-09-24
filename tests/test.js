console.log('Testy tests!')

var assert = require('assert');

var userArgs = process.argv.slice(2);

var mongoose = require('mongoose');
var mongoDB = userArgs[0];
mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var Video = require('../models/video.js')

describe('Array', function () {
  describe('#indexOf()', function () {
    it('should return -1 when the value is not present', function () {
      assert.equal([1, 2, 3].indexOf(4), -1);
    });
  });
});

describe('Video', function() {
    it('create two video entries, save, get data from the videos, change the link for the second video', function () {
        var test_instance_1 = new Video({ video_url: 'https://vm.tiktok.com/ZMJBAJ5G4/' });
        test_instance_1.save(function (err) {
            if (err) return (err);
        });
        console.log(test_instance_1);
        Video.create({ video_url: 'https://vm.tiktok.com/ZMJBSCfBt/' }, function (err, test_instance_2) {
            if (err) return (err);
        });
        console.log('First video: ' + test_instance_1);
        var query = Video.findOne({ video_url: 'https://vm.tiktok.com/ZMJBSCfBt/'});
        console.log('Second video: ' + query);
        // Change link for second video
        test_instance_1.video_url = 'https://vm.tiktok.com/ZMJBAJHtG/';
        test_instance_1.save(function (err) {
            if (err) return (err);
        })
        console.log(test_instance_1);
})
})
