const session = require('express-session');
const config = require('../config/env');
const MssqlSessionStore = require('../session/mssqlSessionStore');

module.exports = session({
  store: new MssqlSessionStore(),
  secret: config.SESSION_SECRET,
  name: 'oturum_id',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.COOKIE_SECURE,
    maxAge: 1000 * 60 * 60 * 24, // 1 gun
  },
});
