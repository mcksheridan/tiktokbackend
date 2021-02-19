const cors = require('cors');

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var sassMiddleware = require('node-sass-middleware');
var session = require('express-session');
var flash = require('connect-flash');
var bodyParser = require("body-parser");
var passport = require('passport');
var initializePassport = require('./passport-config')

var indexRouter = require('./routes/index');
var bookmarksRouter = require('./routes/bookmarks');

var app = express();
const dotenv = require('dotenv')
dotenv.config()

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
initializePassport(passport);

//const mongoose = require('mongoose');
const { body } = require('express-validator');
//mongoose.set('useFindAndModify', false)
//const mongoDB = process.env.ATLAS_URI;
//mongoose.connect(mongoDB, { useNewUrlParser: true , useUnifiedTopology: true});
//const db = mongoose.connection;
const db = require('./db');
const Mail = require('nodemailer/lib/mailer');
app.get('/listusers', async (req, res) => {
  //const results = await db.query('SELECT * from users')
  //const results = await db.query('SELECT * from lists where user_id = $1', [18])
  //const resultsArray = results.rows
  //console.log(resultsArray.length === 0)
  const listString = 'another testing'
  const listName = `^${listString}$`
  const text = 'SELECT * FROM lists WHERE user_id = $1 AND name ~* $2'
  const values = [5, listName]
  try {
    const videoQuery = await db.query(text, values)
    const videoQueryResults = videoQuery.rows.length
    console.log(videoQueryResults)
  } catch (error) {
    res.status(500).send(error.stack)
  }
  //console.log(results.rows.length)
  res.status(200).send('Check the console')
})
//db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(express.urlencoded({ extended: false }));
app.use(flash())
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  name: 'TikTok Favorites',
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: {maxAge: 7*24*60*60*1000},
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/bookmarks', bookmarksRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
