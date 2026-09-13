const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const REQUIRED = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME', 'SESSION_SECRET'];
const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Eksik ortam değişkenleri: ${missing.join(', ')}. .env dosyasını kontrol edin.`);
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SESSION_SECRET: process.env.SESSION_SECRET,
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  PHOTOS_DIR: process.env.PHOTOS_DIR || path.join(__dirname, '..', 'uploads', 'photos'),
};
