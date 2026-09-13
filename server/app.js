const path = require('path');
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

  // Faz 2 web arayuzu mevcut HTML'i (inline onclick="..." vb.) minimal degisiklikle
  // yeniden kullaniyor — helmet'in varsayilan CSP'si script-src-attr'i 'none' yapip
  // bunlarin hepsini sessizce engelliyordu, o yuzden sadece bu directive'i gevsetiyoruz.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src-attr': ["'unsafe-inline'"],
        },
      },
    })
  );
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

  // Faz 2: web arayuzu (statik dosyalar) + paylasilan kok-dizin varliklari (images/, config/)
  app.use(express.static(path.join(__dirname, '..', 'web')));
  app.use('/images', express.static(path.join(__dirname, '..', 'images')));
  app.use('/config', express.static(path.join(__dirname, '..', 'config')));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
