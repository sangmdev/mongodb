const fs = require('fs');
const http = require('http');
const url = require('url');
const ROOT_DIR = "static/";
const qs = require('querystring');

const mongoose = require("mongoose");
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

const bcrypt = require('bcrypt');

http.createServer(function (req, res) {
    var urlObj = url.parse(req.url, true, false);
    console.log(urlObj.pathname);
    if (req.method == "GET") {
        if (urlObj.pathname.slice(urlObj.pathname.indexOf(".") + 1) == "html") {
            fs.readFile(ROOT_DIR + urlObj.pathname, function (err,data) {
                sendFile(err, data, res);
            });
        } else {
            fs.readFile(urlObj.pathname.slice(1), function (err,data) {
                sendFile(err, data, res);
            });
        }
    } else if (req.method == "POST") {
        var body = '';
        req.on('data', function (data) {
            body += data;

            // Too much POST data, kill the connection!
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (body.length > 1e6) {
                req.connection.destroy();
                mongoose.disconnect();
            }
        });
        //POST REQUEST FROM register page
        if (req.url == 'html/register.html') {
            User.schema.path('userName').validate(function (v) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v)
            }, "Not in valid email format");
            req.on('end', function () {
                var post = qs.parse(body);
                console.log(post.username);
                console.log(post.password);
                /*
                Need to check if password is empty, because an empty
                password will still get hashed, so the Schema validation
                will see a hashed password and pass the required check.
                 */
                if (!post.password || post.password.length <= 0) {
                    res.writeHead(404);
                    res.end("Password is required!");
                    return;
                }

                bcrypt.hash(post.password, 10, function (err, hash) {
                    console.log(post.password + " is hashed to: " + hash);

                    var newUser = new User({
                        userName: post.username,
                        password: hash
                    });
                    newUser.save(function (err, doc) {
                        console.log("Saving document to database.");
                        if (err) {
                            console.log(err);
                            res.writeHead(412);
                            res.end(JSON.stringify(err));
                        } else {
                            console.log("\nSaved document: " + doc);
                            res.writeHead(200);
                            res.end(JSON.stringify(doc));
                        }
                        // mongoose.disconnect();
                    });
                });
            });
        }//END OF REGISTER POST REQUEST

        //POST REQUEST FROM login page
        else if (req.url == 'html/login.html') {
            req.on('end', function () {
                var post = qs.parse(body);

                if (!post.password || post.password.length <= 0) {
                    res.writeHead(404);
                    res.end("Password is required!");
                    return;
                }
                User.findOne({userName: post.username}).then(function (user) {
                    //USERNAME found in database
                    if (!user) {
                        res.writeHead(412);
                        res.end();
                        console.log("No user found");
                    } else {
                        console.log("username found!");
                        bcrypt.compare(post.password, user.password, function (err, doc) {
                            if (doc == true) {
                                console.log("correct pass");
                                res.writeHead(200);
                                res.end(JSON.stringify(doc));
                            } else {
                                console.log("wrong pass");
                                res.writeHead(412);
                                res.end(JSON.stringify(err));
                            }
                        });
                    } //END OF PASSWORD CHECK
                }); //END OF USERNAME CHECK
            });
        }// END OF LOGIN POST REQUEST
        else if (urlObj.pathname == 'html/profile.html') {
            req.on('end', function () {
                var post = qs.parse(body);
                console.log(post.username);
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
                User.updateOne({userName: post.username},
                    {
                        $set: {
                            firstName: post.firstName,
                            lastName: post.lastName,
                            interests: post.interests,
                            state: post.state
                        }
                    }, {upsert: false, w: 1},
                    function (err, doc) {
                        console.log("Saving document to database.");
                        if (err) {
                            console.log(err);
                            res.writeHead(412);
                            res.end(JSON.stringify(err));
                        } else {
                            console.log("\nSaved document: " + doc);
                            res.writeHead(200);
                            res.end(JSON.stringify(doc));
                        }
                        // mongoose.disconnect();
                    });
                res.writeHead(200);
            });
        } //ENF OF PROFILE POST REQUEST
        else if (req.url == 'html/matches.html') {
            req.on('end', function () {
                var post = qs.parse(body);

                if (!post.searchData || post.searchData.length <= 0 || !post.searchType || post.searchType.length <= 0 ) {
                res.writeHead(412);
                res.end("Please fill out both parts of search.");
                return;
            }
            var aggregate = User.aggregate();
            if(post.searchType == "stateSearch") {
                aggregate.match({state : post.searchData});
                aggregate.exec(function(err, results){
                    console.log("\nResults for stateSearch: ");
                    console.log(results);
                    res.writeHead(200);
                    res.end(JSON.stringify(results));
                });

            }
            else if(post.searchType == "interestSearch"){
                aggregate.match({interests : post.searchData});
                aggregate.exec(function(err, results){
                    console.log("\nResults for interestSearch: ");
                    console.log(results);
                    res.writeHead(200);
                    res.end(JSON.stringify(results));
                });
            }
        });
        }
    }
}).listen(8080);

function sendFile(err, data, res) {
    if (err) {
        res.writeHead(404);
        res.end(JSON.stringify(err));
        return;
    }

    res.writeHead(200);
    res.end(data);
}