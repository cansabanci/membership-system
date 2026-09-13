const express = require('express');
const userRepository = require('../../src/main/db/repositories/userRepository');
const { EMAIL_REGEX, passwordPolicyHatasi } = require('../services/passwordPolicy');
const asyncHandler = require('../utils/asyncHandler');
const { generateCsrfToken } = require('../middleware/csrf');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre gerekli.' });
    }

    let user;
    try {
      user = await userRepository.findByCredentials(email, password);
    } catch (err) {
      // Yanlış şifre ile veritabanına hiç ulaşamama aynı mesajı göstermesin —
      // auth.ipc.js'teki login-attempt ile birebir aynı ayrım.
      console.error('❌ Giriş hatası:', err.message);
      return res.status(503).json({
        error: 'Veritabanı sunucusuna bağlanılamadı. Sunucu bilgisayarının açık ve aynı ağda olduğundan emin olun, sonra tekrar deneyin.',
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
    }

    req.session.userId = user.id;
    req.session.rol = user.rol;
    req.session.uyeId = user.uyeId;

    const csrfToken = generateCsrfToken(req, res);
    res.json({ rol: user.rol, uyeId: user.uyeId, csrfToken });
  })
);

// Faz 3: express-rate-limit burada login route'unu sarmalayacak (art arda deneme sinirlama).

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Çıkış yapılırken bir hata oluştu.' });
    res.clearCookie('oturum_id');
    res.json({ success: true });
  });
});

router.get('/me', requireAuth, (req, res) => {
  const csrfToken = generateCsrfToken(req, res);
  res.json({ rol: req.session.rol, uyeId: req.session.uyeId, csrfToken });
});

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { tcKimlikNo, dogumTarihi, email, password } = req.body || {};
    if (!tcKimlikNo || !dogumTarihi || !email || !password) {
      return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Geçerli bir e-posta adresi girin.' });
    }
    const sifreHatasi = passwordPolicyHatasi(password);
    if (sifreHatasi) {
      return res.status(400).json({ error: sifreHatasi });
    }

    const member = await userRepository.findClaimableMember(tcKimlikNo.trim(), dogumTarihi);
    if (!member) {
      return res.status(404).json({
        error: 'T.C. Kimlik No ve doğum tarihi ile eşleşen bir üye bulunamadı, ya da bu üye için zaten bir hesap açılmış.',
      });
    }

    const emailKullaniliyor = await userRepository.emailExists(email.trim());
    if (emailKullaniliyor) {
      return res.status(409).json({ error: 'Bu e-posta adresi zaten kullanılıyor.' });
    }

    await userRepository.createAccount(member.id, email.trim(), password);
    res.json({ adsoyad: member.adsoyad, email: email.trim() });
  })
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { tcKimlikNo, dogumTarihi, password } = req.body || {};
    if (!tcKimlikNo || !dogumTarihi || !password) {
      return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }
    const sifreHatasi = passwordPolicyHatasi(password);
    if (sifreHatasi) {
      return res.status(400).json({ error: sifreHatasi });
    }

    const account = await userRepository.findAccountByIdentity(tcKimlikNo.trim(), dogumTarihi);
    if (!account) {
      return res.status(404).json({ error: 'T.C. Kimlik No ve doğum tarihi ile eşleşen bir hesap bulunamadı.' });
    }

    await userRepository.updatePassword(account.id, password);
    res.json({ adsoyad: account.adsoyad, email: account.email });
  })
);

module.exports = router;
