const express = require('express')
const router = express.Router()

const user_controller = require('../controllers/userController')

router.get('/', user_controller.checkAuthentication, function(req, res) {
  res.redirect('/bookmarks/1');
});

router.get('/register', user_controller.checkNotAuthenticated, user_controller.register_get)

router.post('/register', user_controller.register_post)

router.get('/login', user_controller.checkNotAuthenticated, user_controller.login_get)

router.post('/login', user_controller.login_post)

router.get('/logout', user_controller.logout_post)

router.get('/forgot-password', (req, res) => res.render('forgot-password', { title: 'Forgotten Password' }))

router.post('/forgot-password', user_controller.checkNotAuthenticated, user_controller.forgot_password_post)

router.get('/reset/:token', user_controller.reset_password_get)

router.post('/reset/:token', user_controller.reset_password_post)

module.exports = router;
