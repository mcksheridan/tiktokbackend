const validator = require('express-validator')
const async = require('async')
const bcrypt = require('bcrypt')
const passport = require('passport')
const nodemailer = require('nodemailer')
const crypto = require('crypto')
const flash = require('express-flash')
const { doesNotMatch } = require('assert')
const db = require('../db')

const currentTimeInSqlFormat = () => {
    const currentTime = Date.now()
    const currentTimeObject = new Date(currentTime)
    const currentTimeFormattedForSql = currentTimeObject.toISOString()
    return currentTimeFormattedForSql
}

exports.register_get = (req, res) => res.render('register', {title: 'TikTok Favorites'})

exports.register_post = [
    validator.body('email').trim()
    .isEmail().withMessage('Please enter a valid e-mail address.')
    .isLength({min: 5, max: 256}).withMessage('Please enter an e-mail address between 5 and 256 characters.'),
    validator.body('username').trim()
    .isLength({min: 3, max: 100}).withMessage('Please enter a username between 3 and 100 characters.'),
    validator.body('password')
    .isLength({min: 6, max: 100}).withMessage('Please enter a password between 6 and 100 characters.'),
    validator.sanitizeBody('email', 'username', 'password'),
    (req, res, next) => {
        const errors = validator.validationResult(req)
        if (!errors.isEmpty()) {
            const errorMessage = `${errors['errors']['0']['msg']}.
            You entered: ${errors['errors']['0']['value']}`
            res.status(200).send(errorMessage)
        }
        async.waterfall([
            function checkForDuplicateEmails(callback) {
                const checkforDuplicateEmails = (async function() {
                    const text = 'SELECT * FROM users WHERE email = $1'
                    const values = [req.body.email]
                    try {
                        const userQuery = await db.query(text, values)
                        const userQueryLength = userQuery.rows.length
                        if (userQueryLength > 0) {
                            const foundEmailMessage = 'An account has already been registered with this email address.'
                            res.status(200).send(foundEmailMessage)
                        }
                        callback(null)
                    }
                    catch (error) {
                        const awaitError = `Unsuccessful await attempt: \n
                        Status: ${error.stack}`
                        res.status(500).send(awaitError)
                    }
                })
                checkforDuplicateEmails()
            },
            function hashPassword(callback) {
                const hashPassword = (async function() {
                    try {
                        const hashedPassword = await bcrypt.hash(req.body.password, 10)
                        callback(null, hashedPassword)
                    } catch(status) {
                        const awaitError = `Unsuccessful await attempt: \n
                        Status: ${status}`
                        res.status(500).send(awaitError)
                    }
                })
                hashPassword()
            }
        ], function(error, hashedPassword) {
            if (error) {
                return next(error)
            }
            const addUser = async () => {
                const text = 'INSERT INTO users(email, username, password) VALUES($1, $2, $3)'
                const values = [req.body.email, req.body.username, hashedPassword]
                try {
                    const query = await db.query(text, values)
                    res.redirect('/')
                }
                catch (error) {
                    const awaitError = `Unsuccessful await attempt: \n
                    Status: ${error.stack}`
                    res.status(500).send(awaitError)
                }
            }
            addUser()
        })
    }
]

exports.login_get = (req, res) => res.render('login', {title: 'Login'})

exports.login_post = [
    passport.authenticate('local', {
        session: true,
        failureRedirect: '/login',
    }), (req, res) => {
        res.redirect('/')
    }
]

exports.logout_post = (req, res) => {
    req.logout()
    res.redirect('login')
}

exports.forgot_password_post = (req, res, next) => {
    async.waterfall([
        function(callback) {
            const checkUserExists = async () => {
                try {
                    const userQuery = await db.query('SELECT email FROM users WHERE email = $1', [req.body.email])
                    const userQueryLength = userQuery.rows.length
                    if (userQueryLength > 0) {
                        const userEmail = userQuery.rows[0].email
                        callback(null, userEmail)
                    } else {
                        req.flash('info', 'No account with that email address found.')
                        res.redirect('forgot-password')
                    }
                } catch (error) {
                    res.status(500).send(error.stack)
                }
            }
            checkUserExists()
        },
        function(userEmail, callback) {
            const generatePasswordToken = () => {
                crypto.randomBytes(20, (error, buffer) => {
                    const resetPasswordToken = buffer.toString('hex')
                    callback(null, userEmail, resetPasswordToken)
                })
            }
            generatePasswordToken()
        },
        function(userEmail, resetPasswordToken, callback) {
            const generatePasswordTokenExpirationDate = () => {
                const ONE_HOUR = 3600000
                const expirationDate = Date.now() + ONE_HOUR
                const expirationDateReadyForSqlFormatting = new Date(expirationDate)
                const expirationDateInSqlFormat = expirationDateReadyForSqlFormatting.toISOString().slice(0, 19).replace('T', ' ')
                return expirationDateInSqlFormat
            }
            const assignUserPasswordTokenAndTokenExpiration = async () => {
                try {
                    await db.query
                    ('UPDATE users SET reset_password_token = $1, reset_password_token_expiration = $2 WHERE email = $3',
                    [resetPasswordToken, generatePasswordTokenExpirationDate(), userEmail])
                } catch (error) {
                    res.status(500).send(error.stack)
                }
            }
            assignUserPasswordTokenAndTokenExpiration()
            callback(null, userEmail, resetPasswordToken)
        },
        function(userEmail, resetPasswordToken, callback) {
            const emailTransporter = nodemailer.createTransport({
                pool: true,
                host: 'mcksheridan.com',
                port: 465,
                secure: true,
                auth: {
                    user: 'forgot-password@mcksheridan.com',
                    pass: process.env.FORGOT_PASSWORD_EMAIL
                },
            })
            const mailOptions = {
                to: userEmail,
                from: 'forgot-password@mcksheridan.com',
                subject: 'TikTok Favorites Password Reset Request',
                text: `We received a request to reset your password. \n
                Please visit the following link to reset your password: \n
                http://${req.headers.host}/reset/${resetPasswordToken} \n\n
                If you do not want to change your password, please ignore this email.
                Your password will remain unchanged.`
            }
            emailTransporter.sendMail(mailOptions, (error) => {
                req.flash('info', `An email has been sent to ${userEmail} with further instructions.`)
                callback(error, callback)
            })
        }
    ], function(error) {
        if (error) {
            return next (error)
        }
        res.redirect('/')
    })
}

exports.reset_password_get = async (req, res) => {
    try {
        const userWithUnexpiredTokenQuery = await db.query
        ('SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_token_expiration > $2',
        [req.params.token, currentTimeInSqlFormat()])
        const usersFound = userWithUnexpiredTokenQuery.rows.length
        if (usersFound === 0) {
            req.flash('error', 'Invalid or expired reset link.')
            return res.redirect('/../forgot-password')
        } else {
            res.render('reset-password', { user: req.user , title: 'Reset Password' })
        }
    } catch (error) {
        res.status(500).send(error.stack)
    }
}

exports.reset_password_post = [
    validator.body('password')
    .isLength({min: 6, max: 100}).withMessage('Please enter a password between 6 and 100 characters.'),
    validator.sanitizeBody('email', 'username', 'password'),
    (req, res, next) => {
        const errors = validator.validationResult(req)
        if (!errors.isEmpty()) {
            const errorMessage = `${errors['errors']['0']['msg']}.
            You entered: ${errors['errors']['0']['value']}`
            res.status(200).send(errorMessage)
        }
        async.waterfall([
            function (callback) {
                const hashPassword = async () => {
                    try {
                        const hashedPassword = await bcrypt.hash(req.body.password, 10)
                        callback(null, hashedPassword)
                    } catch(error) {
                        res.status(500).send(error.stack)
                    }
                }
                hashPassword()
            },
            function (hashedPassword, callback) {
                const verifyUserTokenExpiration = async () => {
                    try {
                        const userTokenQuery = await db.query
                        ('SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_token_expiration > $2',
                        [req.params.token, currentTimeInSqlFormat()])
                        const userTokenQueryLength = userTokenQuery.rows.length
                        if (userTokenQueryLength === 0) {
                            req.flash('info', 'Reset link is invalid or expired')
                            res.redirect('/forgot-password')
                        } else {
                           const userEmail = userTokenQuery.rows[0].email
                           callback(null, hashedPassword, userEmail)
                        }
                    } catch (error) {
                        res.status(500).send(error.stack)
                    }
                }
                verifyUserTokenExpiration()
            },
            function (hashedPassword, userEmail, callback) {
                const changePassword = async () => {
                    try {
                        await db.query(`UPDATE users SET password = $1,
                        reset_password_token = $2, reset_password_token_expiration = $3
                        WHERE email = $4`,
                        [hashedPassword, null, null, userEmail])
                        callback(null, userEmail)
                    } catch (error) {
                        res.status(500).send(error.stack)
                    }
                }
                changePassword()
            },
            function (userEmail, callback) {
                const logUserIn = async () => {
                    try {
                        const userQuery = await db.query
                        ('SELECT * FROM users WHERE email = $1', [userEmail])
                        const foundUser = userQuery.rows[0]
                        req.logIn(foundUser, function(error) {
                            res.redirect('/')
                            callback(error, foundUser)
                        })
                    } catch (error) {
                        res.status(500).send(error.stack)
                    }
                }
                logUserIn()
            }
        ])
    }
]

exports.change_username_post = [
    validator.body('new_username').trim()
    .isLength({min: 1, max: 100}).withMessage('Please enter a username between 3 and 100 characters.'),
    validator.sanitizeBody('new_username'),
    (req, res) => {
        const errors = validator.validationResult(req)
        if (!errors.isEmpty()) {
            const errorMessage = `${errors['errors']['0']['msg']}.
            You entered: ${errors['errors']['0']['value']}`
            res.status(200).send(errorMessage)
        }
        const changeUsername = async () => {
            try {
                const text = 'UPDATE users SET username = $1 WHERE user_id = $2'
                const values = [req.body.new_username, req.user.user_id]
                await db.query(text, values)
                res.redirect('/')
            } catch(error) {
                res.status(500).send(error.stack)
            }
        }
        changeUsername()
    }

]

exports.change_password_post = [
    validator.body('new_password')
    .isLength({min: 6, max: 100}).withMessage('Please enter a new password between 6 and 100 characters.'),
    validator.sanitizeBody('new_password'),
    (req, res, next) => {
        async.waterfall([
            function (callback) {
                const hashNewPassword = (async () => {
                    try {
                        const hashedNewPassword = await bcrypt.hash(req.body.new_password, 10)
                        callback(null, hashedNewPassword)
                    } catch(status) {
                        const awaitError = `Unsuccessful await attempt: \n
                        Status: ${status}`
                        res.status(500).send(awaitError)
                    }
                })
                hashNewPassword()
            },
            function(hashedNewPassword, callback) {
                const existingUserPassword = async () => {
                    try {
                        const passwordQuery = await db.query
                        ('SELECT password FROM users WHERE user_id = $1', [req.user.user_id])
                        const userPassword = passwordQuery.rows[0].password
                        const result = userPassword.toString()
                        return result
                    } catch (error) {
                        res.status(500).send(error.stack)
                    }
                }
                const existingPasswordMatch = async () => {
                    try {
                        const result = await bcrypt.compare(req.body.old_password, await existingUserPassword())
                        return result
                    } catch (error) {
                        console.error('Something went wrong with the password comparison!')
                        res.status(500).send(error.stack)
                    }
                }
                const updatePassword = async () => {
                    try {
                        if (existingPasswordMatch()) {
                            await db.query('UPDATE users SET password = $1 WHERE user_id = $2',
                            [hashedNewPassword, req.user.user_id])
                            res.redirect('/')
                        }
                        if (!existingPasswordMatch()) {
                            res.send('Passwords don\'t match')
                        }
                    } catch (error) {
                        console.error('Something went wrong with the password update!')
                        res.status(500).send(error.stack)
                    }
                }
                updatePassword()
            }
        ])
    }
]

exports.delete_user_post = (req, res, next) => {
    if (req.body.email === req.user.email) {
        const deleteUser = async () => {
            try {
                await db.query('DELETE FROM users WHERE user_id = $1', [req.user.user_id])
                res.redirect('/register')
            } catch(error) {
                res.status(500).send(error.stack)
            }
        }
        deleteUser()
    } else {
        // Change to a flash message!!
        res.send('Please enter the email address associated with your account.')
    }
}

exports.checkAuthentication = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next()
    }
    res.redirect('/login')
}

exports.checkNotAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        res.redirect('/')
    }
    next()
}
