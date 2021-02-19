const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const passport = require('passport')
const db = require('./db')

function initializePassport() {
    passport.use(new LocalStrategy({
        usernameField: 'email',
        session: true,
    },
    function(username, password, done) {
        const findUser = async () => {
            const text = 'SELECT * FROM users WHERE EMAIL = $1'
            const values = [username]
            try {
                const userQuery = await db.query(text, values)
                const user = userQuery.rows[0]
                if (!user) {
                    return done(null, false, { message: 'Email not found.' })
                }
                try {
                    if (await bcrypt.compare(password, user.password)) {
                        return done(null, user)
                    } else {
                        return done(null, false, { message: 'Incorrect password.' })
                    }
                }
                catch(error) {
                    console.log(error)
                    return done(error)
                }
            }
            catch(error) {
                console.log(error)
                return done(error)
            }
        }
        findUser()
    }))
    passport.serializeUser((user, done) => {
        done(null, user.user_id)
    })
    passport.deserializeUser((id, done) => {
        const findUser = async () => {
            const text = 'SELECT user_id FROM users WHERE user_id = $1'
            const values = [id]
            try {
                const userQuery = await db.query(text, values)
                const user = userQuery.rows[0]
                done(null, user)
            } catch(error) {
                done(null, false, {error: error})
            }
        }
        findUser()
    })
}

module.exports = initializePassport