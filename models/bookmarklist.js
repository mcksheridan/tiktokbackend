const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const bookmarkListSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Please use 100 or fewer numbers and letters to enter a name for this list'],
        maxlength: 100,
        match: /\w*/
    },
    videos: [{
        type: Schema.Types.ObjectId,
        ref: 'Video'
    }]
});

bookmarkListSchema
.virtual('url')
.get(function () {
  return '/list/' + this._id;
});

const BookmarkList = mongoose.model('Bookmarks', bookmarkListSchema)

module.exports = BookmarkList;
