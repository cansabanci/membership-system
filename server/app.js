const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config/env');
const sessionMiddleware = require('./middleware/session');
const { doubleCsrfProtection } = require('./middleware/csrf');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const membersRoutes = require('./routes/members.routes');
const notesRoutes = require('./routes/notes.routes');
const profileRoutes = require('./routes/profile.routes');
const photosRoutes = require('./routes/photos.routes');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '8mb' }));
  app.use(cookieParser());
  app.use(sessionMiddleware);

  // /api/auth altındaki login/register/reset-password bilerek CSRF korumasi disinda —
  // henuz bir oturum/token'i olmayan anonim kullanicilar icin, korunacak bir oturum yok.
  // Geri kalan tum mutasyon iceren route'lar (members/notes/profile) CSRF ile korunuyor.
  app.use('/api/auth', authRoutes);
  app.use('/api/members', doubleCsrfProtection, membersRoutes);
  app.use('/api/members', doubleCsrfProtection, notesRoutes);
  app.use('/api/profile', doubleCsrfProtection, profileRoutes);
  app.use('/api/photos', photosRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
