require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
// const _ = require("lodash");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passportlocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: "Our little secret. ",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// console.log(process.env.API_key);
const db = 'mongodb://localhost:27017/userDB';

mongoose.set('strictQuery', true);

main().catch(err => console.log(err));

async function main() {
    await mongoose.connect(db);

}

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportlocalMongoose);
// userSchema.plugin(encrypt, { secret: process.env.secret, encryptedFields: ['password'] });
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);


passport.use(User.createStrategy());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new GoogleStrategy({
    clientID: process.env.Client_ID,
    clientSecret: process.env.client_Secret,
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


app.get('/', function (req, res) {
    res.render("home");
});
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        res.redirect('/secrets');
    });
app.get('/login', function (req, res) {
    res.render("login");
});
app.get('/register', function (req, res) {
    res.render("register");
});
app.get('/logout', function (req, res) {
    req.logout(function (err) {
        if (err) {
            console.log(err);
        }
        else {
            res.redirect('/');
        }
    });

});

app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
      if (err){
        console.log(err);
      } else {
        if (foundUsers) {
          res.render("secrets",{usersWithSecrets: foundUsers});
        }
      }
    });
  });

app.get('/submit', function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    }
    else {
        res.render("login");
    }
});

app.post('/submit', function (req, res) {
    const submittedSecret = req.body.secret;
    // console.log(req.user);
    User.findById(req.user.id, function (err, founduser) {
        if (err) {
            console.log(err);
        }
        if (founduser) {
            founduser.secret = submittedSecret;
            founduser.save(function () {
                res.redirect("/secrets");
            });
        }
    })
});

app.post('/register', function (req, res) {


    // when we using salting ..........    
    // bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
    //     const newuser = new users({
    //         email: req.body.username,
    //         password: hash
    //     });

    //     newuser.save(function (err) {
    //         if (err) {
    //             console.log(err);
    //         }
    //         else
    //             res.render("secrets");
    //     })

    // });

    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        }
        else {
            passport.authenticate('local')(req, res,
                function () {
                    res.render("secrets");
                });
        }
    });


})


app.post("/login", function (req, res) {

    // when we using salting ..........    
    // const username = req.body.username;
    // const password = req.body.password;

    // users.findOne({ email: username }, function (err, founduser) {
    //     if (err) {
    //         console.log(err);
    //     }
    //     else {
    //         if (founduser) {

    //             bcrypt.compare(password, founduser.password, function (err, result) {
    //                 if (result === true)
    //                     res.render("secrets");
    //             });
    //         }
    //     }
    // });

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err)
        }
        else {
            passport.authenticate('local')(req, res,
                function () {
                    res.render("secrets");
                });
        }
    })
});

app.listen(3000, function () {
    console.log("Server started on port 3000");
});
