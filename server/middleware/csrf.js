const { doubleCsrf } = require('csrf-csrf');
const config = require('../config/env');

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => config.SESSION_SECRET,
  getSessionIdentifier: (req) => req.session.id,
  cookieName: 'csrf_token',
  cookieOptions: {
    sameSite: 'lax',
    secure: config.COOKIE_SECURE,
    path: '/',
  },
});

module.exports = { generateCsrfToken, doubleCsrfProtection };
