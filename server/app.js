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

  // VPS'te reverse proxy ardinda calisirken TRUST_PROXY=1 (Nginx=1 hop) set edilmeli — yoksa
  // req.ip her zaman proxy adresi olur ve rateLimit.js'teki IP-bazli limit islevsiz kalir.
  // Yerelde (proxy yokken) 0 kalir, express-rate-limit'in X-Forwarded-For hatasi vermez.
  if (config.TRUST_PROXY > 0) app.set('trust proxy', config.TRUST_PROXY);

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
  // Sadece /api altina — statik dosya isteklerine (css/js/resim) de uygulanirsa, rolling:true
  // idle timeout'u sayfa acikken arka planda gelen her kaynak istegiyle sessizce sifirlar
  // ve ozelligi anlamsizlastirirdi (Faz3 test sirasinda tespit edildi).
  app.use('/api', sessionMiddleware);

  // /api/auth altındaki login/register/reset-password bilerek CSRF korumasi disinda —
  // henuz bir oturum/token'i olmayan anonim kullanicilar icin, korunacak bir oturum yok.
  // Geri kalan tum mutasyon iceren route'lar (members/notes/profile) CSRF ile korunuyor.
  app.use('/api/auth', authRoutes);
  app.use('/api/members', doubleCsrfProtection, membersRoutes);
  app.use('/api/members', doubleCsrfProtection, notesRoutes);
  app.use('/api/profile', doubleCsrfProtection, profileRoutes);
  app.use('/api/photos', photosRoutes);

  // "/" ve "/login" icin oturum durumu sayfa GONDERILMEDEN ONCE kontrol edilir — eskiden
  // index.html once oldugu gibi yollanip, oturumsuz oldugu JS tarafinda /api/auth/me ile
  // ANLASILDIKTAN SONRA /login'e yonlendiriliyordu, bu da kisa bir an bos/yanlis ekranin
  // gorunmesine sebep oluyordu. Sadece bu iki sayfa icin sessionMiddleware kullaniliyor
  // (rolling idle timeout acisindan gercek bir sayfa ziyareti sayilmasi zaten dogru davranis —
  // arka plandaki css/js/resim istekleri gibi degil, bkz. asagidaki express.static yorumu).
  app.get('/', sessionMiddleware, (req, res) => {
    if (!req.session || !req.session.userId) return res.redirect('/login');
    res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
  });

  // Temiz URL'ler: "/login.html" yerine "/login".
  app.get('/login', sessionMiddleware, (req, res) => {
    if (req.session && req.session.userId) return res.redirect('/');
    res.sendFile(path.join(__dirname, '..', 'web', 'login.html'));
  });

  // Faz 2: web arayuzu (statik dosyalar) + paylasilan kok-dizin varliklari (images/, config/)
  app.use(express.static(path.join(__dirname, '..', 'web')));
  app.use('/images', express.static(path.join(__dirname, '..', 'images')));
  app.use('/config', express.static(path.join(__dirname, '..', 'config')));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
