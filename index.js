// yeah, let's start with that :)
function die(msg, code) {
    console.log(msg);
    if (code === undefined) {
        code = -1;
    }

    process.exit(code);
}

// input
const AUTHORIZATION_URL = process.env.AUTHORIZATION_URL || die("Missing 'AUTHORIZATION_URL' environment variable.");
const TOKEN_URL = process.env.TOKEN_URL || die("Missing 'TOKEN_URL' environment variable.");
const TYPEFORM_API_URL = process.env.TYPEFORM_API_URL || die("Missing 'TYPEFORM_API_URL' environment variable.");
const CLIENT_ID = process.env.CLIENT_ID || die("Missing 'CLIENT_ID' environment variable.");
const CLIENT_SECRET = process.env.CLIENT_SECRET || die("Missing 'CLIENT_SECRET' environment variable.");
const REDIRECT_URI_BASE = process.env.REDIRECT_URI_BASE || die("Missing 'REDIRECT_URI_BASE' environment variable.");
const DEFAULT_FORM_ID = process.env.DEFAULT_FORM_ID;


const MY_HOST = '0.0.0.0';
const MY_PORT = process.env.PORT || 3000;
const MY_ADDR = `${MY_HOST}:${MY_PORT}`


// import express
const url = require('url');
const express = require('express');
const session = require('express-session')({
    secret: 'top_secret',
    resave: true,
    saveUninitialized: true,
})


// import passport library
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');

console.log(AUTHORIZATION_URL);
console.log(TOKEN_URL);
// setup passport
passport.use(new OAuth2Strategy({
        authorizationURL: AUTHORIZATION_URL,
        tokenURL: TOKEN_URL,
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: REDIRECT_URI_BASE + "/callback",
        scope: ["offline", "profile:read", "results:read"],
    },
    (accessToken, refreshToken, profile, cb) => {
        console.log(accessToken, refreshToken, profile);
        cb(null, {"access_token": accessToken});
    }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));


// initialize app
const app = express();
const handlers = new (require('./handlers'))(TYPEFORM_API_URL, DEFAULT_FORM_ID);

app.use(session);
app.use(passport.initialize());
app.use(passport.session());

const authenticator = passport.authenticate('oauth2', {
    failureRedirect: '/login',
    successReturnToOrRedirect: '/'
})

const require_authentication = function(req, res, next) {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.url;
        return res.redirect('/login');
    }

    next();
}

// setup handlers
app.get('/login', authenticator);
app.get('/callback', authenticator);
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.get('/', handlers.indexHandler);
app.get('/results/:id', require_authentication, handlers.displayResultsHandler);

app.listen(MY_PORT, MY_HOST, function () {
    console.log(`Running on http://${MY_ADDR}`);
})