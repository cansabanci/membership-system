const session = require('express-session');
const config = require('../config/env');
const MssqlSessionStore = require('../session/mssqlSessionStore');

// Idle timeout (Faz3): rolling:true + kisa bir maxAge sayesinde her istek suresi sifirdan
// baslatiyor — kullanici aktifse oturum hic dusmuyor, hareketsiz kalirsa otomatik dusuyor.
// Test icin COOKIE_MAX_AGE_MS ile gecici olarak kisaltilabilir (bkz. plan/dogrulama).
const COOKIE_MAX_AGE_MS = parseInt(process.env.COOKIE_MAX_AGE_MS, 10) || 1000 * 60 * 30; // 30 dk

module.exports = session({
  store: new MssqlSessionStore(),
  secret: config.SESSION_SECRET,
  name: 'oturum_id',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.COOKIE_SECURE,
    maxAge: COOKIE_MAX_AGE_MS,
  },
});
