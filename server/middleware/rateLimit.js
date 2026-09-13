const rateLimit = require('express-rate-limit');

// IP bazli genel limit — kimlik bazli (loginThrottle.js) sinirlamanin ikinci katmani.
// Tek bir IP'den farkli email/TC no'larla yapilan dagitik deneme saldirilarini yakalar.
const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  limit: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin.' });
  },
});

module.exports = { authRateLimiter };
