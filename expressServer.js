const express = require('express');
const logger = require("morgan");
const bcrypt = require('bcrypt');
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');
const MONGO_URL = "mongodb://localhost:27017/mean";
const MONGO_USERNAME = "matchMaker";
const MONGO_PASSWORD = "p@ssw0rd";

mongoose.connect(MONGO_URL, {
    auth: {
        user: MONGO_USERNAME,
        password: MONGO_PASSWORD
    },
    useNewUrlParser: true,
});
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
mongoose.set('useCreateIndex', true);
const meanSchema = require('./mean_schema.js').meanSchema;
const User = mongoose.model('User', meanSchema, 'profiles');
mongoose.connection.once('open', function () {
    console.log("Open connection!");
});

const app = express();
app.use(session({
    secret: 'thisSecret',
    resave: false,
    saveUninitialized: true
}));

app.use("/", express.static('static'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/login', function(req, res){
    if(req.session.user){
        res.redirect('/profile.html');
    }else{
        res.redirect('login.html');
    }

});
app.get('/logout', function(req, res){
    req.session.destroy(function(){
        console.log('session destroyed.');
        res.redirect('/login');
    });
});
app.get('/matches', function(req, res){
    if(req.session.user){
        res.redirect('/matches.html');
    }
    else{
        res.redirect('login.html');
    }
});
app.get('/profile', function(req, res){
    if(req.session.user){
        res.redirect('/profile.html');
    }else{
        res.redirect('login.html');
    }
});
app.post('/register', (req, res)=> {
    var username = req.body.username;
    var password = req.body.password;
    console.log("post received: %s %s", username, password);
    if (!req.body.password || req.body.password.length <= 0) {
        res.writeHead(404);
        res.end("Password is required!");
        return;
    }

    bcrypt.hash(req.body.password, 10, function (err, hash) {
        console.log(req.body.password + " is hashed to: " + hash);

        var newUser = new User({
            userName: req.body.username,
            password: hash
        });
        newUser.save(function (err, doc) {
            console.log("Saving document to database.");
            if (err) {
                console.log(err);
                res.end(JSON.stringify(err));
            } else {
                console.log("\nSaved document: " + doc);
                res.redirect('/login.html');
                res.end(JSON.stringify(doc));
            }
            // mongoose.disconnect();
        });
    });
});
app.post("/login", function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    console.log("post received: %s %s", username, password);
    if (!req.body.password || req.body.password.length <= 0) {
        res.end("Password is required!");
        return;
    }
    User.findOne({userName: req.body.username}).then(function (user) {
        //USERNAME found in database
        if (!user) {
            console.log("No user found");
        } else {
            console.log("username found!");
            bcrypt.compare(req.body.password, user.password, function (err, doc) {
                if (doc == true) {
                    req.session.regenerate(function () {
                        console.log("correct pass");
                        req.session.user = username;
                        req.session.success = 'Authenticated as ' + user.name;
                        console.log('Session set.');
                        res.redirect('/profile');
                    });
                } else {
                    req.session.regenerate(function () {
                        console.log("wrong pass");
                        req.session.error = 'Authentication failed.';
                        res.redirect('/profile');
                    });
                    res.redirect('/login');
                }
            });
        }
    });
});
app.post('/profile', function(req, res){
    if (req.session.user) {
        res.redirect('/profile.html');
            console.log(req.session.user);
            User.schema.path('firstName').validate(function (value) {
                return value.length < 50;
            }, "First Name is more than 50 characters!");
            User.schema.path('lastName').validate(function (value) {
                return value.length < 50;
            }, "Last Name is more than 50 characters!");
            User.schema.path('interests').validate(function (value) {
                return value.length < 2000;
            }, "Interests is too long!");
            User.schema.path('state').validate(function (value) {
                return value.length < 52;
            }, "State Name is too long!");
            User.updateOne({userName: req.session.user},
                {
                    $set: {
                        firstName: req.body.firstName,
                        lastName: req.body.lastName,
                        interests: req.body.interests,
                        state: req.body.state
                    }
                }, {upsert: false, w: 1},
                function (err, doc) {
                    console.log("Saving document to database.");
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("\nSaved document: " + doc);
                    }
                    // mongoose.disconnect();
                });
            // res.redirect('/matches');
        } else {
        req.session.error = 'Access denied!';
        res.redirect('/login');
    }
});
app.post('/matches', function(req, res){
    if (req.session.user) {
        if (!req.body.searchData || req.body.searchData.length <= 0 || !req.body.search || req.body.search.length <= 0 ) {
            res.writeHead(412);
            res.end("Please fill out both parts of search.");
            return;
        }
        var aggregate = User.aggregate();
        console.log(req.body.search);
        if(req.body.search== "stateSearch") {
            aggregate.match({state : req.body.searchData});
            aggregate.exec(function(err, results){
                console.log("\nResults for stateSearch: ");
                console.log(results);
                res.end(JSON.stringify(results));
            });

        }
        else if(req.body.search == "interestSearch"){
            aggregate.match({interests : req.body.searchData});
            aggregate.exec(function(err, results){
                console.log("\nResults for interestSearch: ");
                console.log(results);
                res.end(JSON.stringify(results));
            });
        }
        res.redirect('/matches');
    }else{
        req.session.error = 'Access denied!';
        res.redirect('/login');
    }
});
app.listen(8080);