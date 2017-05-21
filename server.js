'use strict';

const express     = require('express');
const bodyParser  = require('body-parser');
const fccTesting  = require('./freeCodeCamp/fcctesting.js');
const dotenv = require('dotenv').load();
const session = require('express-session');
const passport = require('passport');

const ObjectID = require('mongodb').ObjectID;
const mongo = require('mongodb').MongoClient;

const LocalStrategy = require('passport-local');

var theDB;

mongo.connect(process.env.DATABASE, (err, db) => {
  if(err) {
    console.log('Database error: ' + err);
  } else {
    console.log('Successful database connection');
    theDB = db;

    //serialization and app.listen
    passport.serializeUser((user, done) => {
      done(null, user._id);
    });

    passport.deserializeUser((id, done) => {
      db.collection('users').findOne({ _id: new ObjectID(id) }, (err, doc) => {
        done(null, doc);
      });
    });

    // Authentication Strategies
    passport.use(new LocalStrategy(
      function(username, password, done) {
        db.collection('users').findOne({ username: username }, function (err, user) {
          console.log('User '+ username +' attempted to log in.');
          if (err) { return done(err); }
          if (!user) { return done(null, false); }
          if (password !== user.password) { return done(null, false); }
          return done(null, user);
        });
      }
    ));

    app.listen(process.env.PORT || 3000, () => {
      console.log("Listening on port " + process.env.PORT);
    });
  }
});

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'pug');

const pageVars = {
  title: 'Hello',
  message: 'Please login',
  showLogin: true,
  showRegistration: true
};

app.route('/')
  .get((req, res) => {
    res.render(process.cwd() + '/views/pug/index.pug', pageVars);
});

app.route('/logout')
  .get((req, res) => {
      req.logout();
      res.redirect('/');
  });

// creating the middleware function ensureAuthenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  }
  res.redirect('/');
};

app.route('/profile')
  .get(ensureAuthenticated, (req,res) => {
       res.render(process.cwd() + '/views/pug/profile', { username: req.user.username });
  });


app.post('/login', passport.authenticate('local', { failureRedirect: '/' }),
  function(req, res){
    res.redirect('/profile');
  }
);

app.route('/register')
  .post((req, res, next) => {
      theDB.collection('users').findOne({ username: req.body.username }, function (err, user) {
          if(err) {
              next(err);
          } else if (user) {
              res.redirect('/');
          } else {
              theDB.collection('users').insertOne(
                {username: req.body.username,
                 password: req.body.password},
                (err, doc) => {
                    if(err) {
                        res.redirect('/');
                    } else {
                        next(null, user);
                    }
                }
              )
          }
      })},
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res, next) => {
        res.redirect('/profile');
    }
);


app.use((req, res, next) => {
  res.status(404)
    .type('text')
    .send('Not Found');
});
