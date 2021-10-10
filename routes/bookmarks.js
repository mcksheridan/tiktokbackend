const express = require('express');

const router = express.Router();
const multer = require('multer');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 1000000 },
  fileFilter(req, file, cb) {
    if ((file.originalname === 'Like List.txt')
        && (file.mimetype === 'text/plain')) {
      return cb(null, true);
    }
    return cb(null, false);
  },
});

const videoController = require('../controllers/videoController');
const listController = require('../controllers/listController');
const userController = require('../controllers/userController');

router.use(userController.checkAuthentication);

// Videos

router.get('/:page', videoController.index);
router.post('/:page', videoController.video_sort_post);

// Post to just video and combine with multi-add
router.post('/video/add', videoController.video_create_post);
router.post('/video/multi-add', upload.single('like_list'), videoController.video_multiadd_post);

// Delete to just video
router.post('/video/delete', videoController.video_delete_post);

router.get('/video/search/:page', videoController.video_search_get);
router.post('/video/search/:page', videoController.video_search_post);

router.post('/video/move', [videoController.video_move_post]);
router.post('/video/sort', [videoController.video_sort_post]);

// User

// Update?
router.post('/user/change-username', userController.change_username_post);
// Update?
router.post('/user/change-password', userController.change_password_post);
// Delete
router.post('/user/delete-account', userController.delete_user_post);

// Lists

// Post to just list
router.post('/list/create', listController.list_create_post);
// Delete to just list
router.post('/list/delete-video', listController.list_delete_video_post);
//
router.post('/list/add-video', listController.list_add_video_post);

router.post('/list/:id/delete', listController.list_delete_post);

router.post('/list/:id/update', listController.list_update_post);

router.get('/list/:id',
  (req, res) => {
    const { id } = req.params;
    res.redirect(`/bookmarks/list/${id}/1`);
  });
router.get('/list/:id/:page', listController.list_detail);// (req, res) => res.send('Yo!!'))
router.post('/list/:id', listController.list_sort);

module.exports = router;
