var express = require('express');
var router = express.Router();
const multer  = require('multer')
const upload = multer({ dest: 'uploads/',
    limits: { fileSize: 1000000},
    fileFilter: function(req, file, cb) {
        if ((file['originalname'] === 'Like List.txt') &&
        (file['mimetype'] === 'text/plain')) {
            return cb(null, true)
        }
        cb(null, false)
} })

// Require controller modules.
var video_controller = require('../controllers/videoController');
var list_controller = require('../controllers/listController');

/// BOOK ROUTES ///

// GET catalog home page.
router.get('/', [video_controller.index]);

router.post('/', video_controller.video_sort_post);

router.post('/video/add', video_controller.video_create_post)

/*// GET request for creating a Book. NOTE This must come before routes that display Book (uses id).
router.get('/video/create', video_controller.video_create_get);

// POST request for creating Book.
router.post('/video/create', video_controller.video_create_post);
*/

// POST request for adding multiple videos.
router.post('/video/multi-add', upload.single('like_list'), video_controller.video_multiadd_post);

// POST request to delete Video.
router.post('/video/delete', video_controller.video_delete_post);

// POST request to search videos.
router.post('/video/search', [video_controller.video_search_post, list_controller.list_detail]);

// POST request to move videos.
router.post('/video/move', [video_controller.video_move_post])

// POST request to sort videos.
router.post('/video/sort', [video_controller.video_sort_post])

/// AUTHOR ROUTES ///

// GET request for creating Author. NOTE This must come before route for id (i.e. display author).
// router.get('/list/create', list_controller.list_create_get);

// POST request for creating List.
router.post('/list/create', list_controller.list_create_post);

// Delete a video from a list
router.post('/list/delete-video', list_controller.list_delete_video_post);

// Add a video to a list
router.post('/list/add-video', list_controller.list_add_video_post)

// POST request to delete a list.
router.post('/list/:id/delete', list_controller.list_delete_post);

// GET request to update Author.
// router.get('/list/:id/update', list_controller.list_update_get);

// POST request to update Author.
router.post('/list/:id/update', list_controller.list_update_post);

// GET request for one Author.
router.get('/list/:id', list_controller.list_detail);

router.post('/list/:id', list_controller.list_sort)

// GET request for list of all Authors.
// router.get('/lists', list_controller.list_list);

module.exports = router;
