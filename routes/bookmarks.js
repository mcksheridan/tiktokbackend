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

const video_controller = require('../controllers/videoController')
const list_controller = require('../controllers/listController')
const user_controller = require('../controllers/userController')

router.use(user_controller.checkAuthentication)

// Videos

router.get('/:page', video_controller.index)
router.post('/:page', video_controller.video_sort_post)

//Post to just video and combine with multi-add
router.post('/video/add', video_controller.video_create_post)
router.post('/video/multi-add', upload.single('like_list'), video_controller.video_multiadd_post)

//Delete to just video
router.post('/video/delete', video_controller.video_delete_post)

router.get('/video/search/:page', video_controller.video_search_get)
router.post('/video/search/:page', video_controller.video_search_post)

router.post('/video/move', [video_controller.video_move_post])
router.post('/video/sort', [video_controller.video_sort_post])

// User

//Update?
router.post('/user/change-username', user_controller.change_username_post)
//Update?
router.post('/user/change-password', user_controller.change_password_post)
//Delete
router.post('/user/delete-account', user_controller.delete_user_post)

// Lists

//Post to just list
router.post('/list/create', list_controller.list_create_post)
//Delete to just list
router.post('/list/delete-video', list_controller.list_delete_video_post)
//
router.post('/list/add-video', list_controller.list_add_video_post)

router.post('/list/:id/delete', list_controller.list_delete_post)

router.post('/list/:id/update', list_controller.list_update_post)

router.get('/list/:id',
function(req, res) {
    const id = req.params.id
    res.redirect(`/bookmarks/list/${id}/1`)
})
router.get('/list/:id/:page', list_controller.list_detail)//(req, res) => res.send('Yo!!'))
router.post('/list/:id', list_controller.list_sort)

module.exports = router;
