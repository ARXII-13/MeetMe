/* Passport strategies for authentication */

var bCrypt = require('bcrypt-nodejs');
var passportJWT = require('passport-jwt');
var JWTStrategy = passportJWT.Strategy;
var ExtractJWT = passportJWT.ExtractJwt;
var moment = require('moment');
var passport = require('passport');

var user = require("../models").user; //important user model
var LocalStrategy = require('passport-local').Strategy;

/* LOCAL SIGNUP */
passport.use('local-signup', new LocalStrategy({
        //Override regular required fields
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {
        //encrypts password
        var generateHash = function(password) {
            return bCrypt.hashSync(password, bCrypt.genSaltSync(8), null);
        };

        //If sequelize finds matching email in DB ...
        user.findOne({
            where: {
                email: email
            }
        }).then(function(user) {
            if (user) {
                console.log("EMAIL TAKEN");
                return done(null, false, {
                    message: 'That email is already taken'
                });
            } else {
                var userPassword = generateHash(password);
                var userData = {
                    email: email,
                    password: userPassword,
                    firstname: req.body.firstname,
                    lastname: req.body.lastname
                };
                console.log(JSON.stringify(userData));
                //Creates a new entry in the database
                user.create(userData).then(function(newuser, created) {
                    if (!newuser) {
                        return done(null, false); //failed
                    }
                    if (newuser) {
                        return done(null, newuser); //return new user object
                    }
                });
            }
        });
    }
));

/* LOCAL SIGNIN */
passport.use('local-signin', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },

    function(req, email, password, done) {
        var isValidPassword = function(userpass, password) {
            return bCrypt.compareSync(password, userpass);
        }
        //If sequelize finds matching email in DB ...
        user.findOne({
            where: {
                email: email
            }
        }).then(function(user) {
            if (!user) {
                console.log("WRONG EMAIL");
                return done(null, false, {
                    message: 'Email does not exist'
                });
            }
            if (!isValidPassword(user.password, password)) {
                console.log("WRONG PASSWORD");
                return done(null, false, {
                    message: 'Incorrect password'
                });
            }
            var userinfo = user.get();
            console.log("SUCCESSFUL LOGIN:")
            console.log(JSON.stringify(userinfo));

            //Update login time
            user.update({
                last_login: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss')
            });

            return done(null, userinfo);
        }).catch(function(err) {
            console.log("Error:", err);
            return done(null, false, {
                message: 'Something went wrong with your signin'
            });
        });
    }
));

/* JSON WEB TOKEN AUTHENTICATION */
passport.use(new JWTStrategy({
        jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
        secretOrKey: 'your_jwt_secret'
    },
    function(jwtPayload, cb) { //jwtPayload contains user info unencrypted

        //Find the user in db
        user.findOne({
                where: {
                    id: jwtPayload.id,
                    password: jwtPayload.password,
                    last_login: jwtPayload.last_login //last login time must match or token is invalid
                }
            })
            .then(function(user) {
                if (!user) { //no matching database entry - lastlogin invalid
                    return cb(null);
                }
                return cb(null, user);
            })
            .catch(function(err) { //payload is nonsense
                return cb(err);
            })
    }));
