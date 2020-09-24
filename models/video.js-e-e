const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const videoSchema = new Schema({
    video_url: {
        type: String,
        required: [true, 'Please enter a valid TikTok URL'],
        match: /tiktok.com\//i
    },
    title: {type: String},
    author_url: {type: String},
    author_name: {type: String},
    date: {
        type: Date,
        default: Date.now
    }
});

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
