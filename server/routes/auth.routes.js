const express = require('express');
const userRepository = require('../../src/main/db/repositories/userRepository');
const { passwordPolicyHatasi } = require('../services/passwordPolicy');
const otpService = require('../services/otpService');
const { sendOtpEmail } = require('../services/emailService');
const asyncHandler = require('../utils/asyncHandler');
const { generateCsrfToken } = require('../middleware/csrf');
const { requireAuth } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimit');
const { checkThrottle, recordFailure, resetThrottle } = require('../middleware/loginThrottle');

const router = express.Router();

router.use(authRateLimiter);

// Kullaniciya "kodu su adrese gonderdik" derken tam e-postayi degil, maskelenmis halini gosterir.
function maskEmail(email) {
  const atIndex = email.indexOf('@');
  if (atIndex <= 1) return email;
  const user = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  const middleLength = Math.max(user.length - 2, 1);
  const masked = user.length > 1 ? `${user[0]}${'*'.repeat(middleLength)}${user[user.length - 1]}` : user;
  return `${masked}${domain}`;
}

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre gerekli.' });
    }

    // Kimlik bazli deneme sinirlama — brute-force'a karsi asil korunma (IP bazli genel
    // limit yukarida authRateLimiter'da ayrica var). Bloktaysa DB'ye hic gidilmez.
    const throttleKey = `login:${email.trim().toLowerCase()}`;
    const throttle = checkThrottle(throttleKey);
    if (throttle.blocked) {
      return res.status(429).json({
        error: `Çok fazla başarısız deneme. Lütfen ${Math.ceil(throttle.retryAfterSeconds / 60)} dakika sonra tekrar deneyin.`,
      });
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
      recordFailure(throttleKey);
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
    }
    resetThrottle(throttleKey);

    req.session.userId = user.id;
    req.session.rol = user.rol;
    req.session.uyeId = user.uyeId;

    const csrfToken = generateCsrfToken(req, res);
    res.json({ rol: user.rol, uyeId: user.uyeId, csrfToken });
  })
);

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

// ---------- Hesap oluşturma: T.C. no + doğum tarihi sadece kaydı bulur, asıl güvenlik sınırı
// üyenin derneğe kayıtlı e-postasına (uyeler.email) gönderilen OTP'dir. ----------

router.post(
  '/register/request-otp',
  asyncHandler(async (req, res) => {
    const { tcKimlikNo, dogumTarihi } = req.body || {};
    if (!tcKimlikNo || !dogumTarihi) {
      return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }

    const throttleKey = `register:${tcKimlikNo.trim()}`;
    const throttle = checkThrottle(throttleKey);
    if (throttle.blocked) {
      return res.status(429).json({
        error: `Çok fazla deneme. Lütfen ${Math.ceil(throttle.retryAfterSeconds / 60)} dakika sonra tekrar deneyin.`,
      });
    }

    const member = await userRepository.findClaimableMember(tcKimlikNo.trim(), dogumTarihi);
    if (!member) {
      recordFailure(throttleKey);
      return res.status(404).json({
        error: 'T.C. Kimlik No ve doğum tarihi ile eşleşen bir üye bulunamadı, ya da bu üye için zaten bir hesap açılmış.',
      });
    }
    if (!member.email) {
      return res.status(400).json({ error: 'Sisteme kayıtlı bir e-postanız yok, lütfen derneğe başvurun.' });
    }

    const code = otpService.createOtp(throttleKey, member.email);
    try {
      await sendOtpEmail(member.email, code);
    } catch (err) {
      console.error('❌ OTP e-posta gönderim hatası:', err.message);
      return res.status(503).json({ error: 'Doğrulama kodu gönderilemedi. Lütfen daha sonra tekrar deneyin.' });
    }

    res.json({ email: maskEmail(member.email) });
  })
);

router.post(
  '/register/verify',
  asyncHandler(async (req, res) => {
    const { tcKimlikNo, dogumTarihi, otp, password } = req.body || {};
    if (!tcKimlikNo || !dogumTarihi || !otp || !password) {
      return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }
    const sifreHatasi = passwordPolicyHatasi(password);
    if (sifreHatasi) {
      return res.status(400).json({ error: sifreHatasi });
    }

    const throttleKey = `register:${tcKimlikNo.trim()}`;
    const throttle = checkThrottle(throttleKey);
    if (throttle.blocked) {
      return res.status(429).json({
        error: `Çok fazla deneme. Lütfen ${Math.ceil(throttle.retryAfterSeconds / 60)} dakika sonra tekrar deneyin.`,
      });
    }

    const member = await userRepository.findClaimableMember(tcKimlikNo.trim(), dogumTarihi);
    if (!member) {
      recordFailure(throttleKey);
      return res.status(404).json({
        error: 'T.C. Kimlik No ve doğum tarihi ile eşleşen bir üye bulunamadı, ya da bu üye için zaten bir hesap açılmış.',
      });
    }

    const result = otpService.verifyOtp(throttleKey, otp);
    if (!result.valid) {
      recordFailure(throttleKey);
      return res.status(400).json({ error: 'Kod hatalı ya da süresi dolmuş. Lütfen kodu tekrar isteyin.' });
    }

    const emailKullaniliyor = await userRepository.emailExists(member.email);
    if (emailKullaniliyor) {
      return res.status(409).json({ error: 'Bu e-posta adresi zaten kullanılıyor.' });
    }

    resetThrottle(throttleKey);
    await userRepository.createAccount(member.id, member.email, password);
    res.json({ adsoyad: member.adsoyad, email: member.email });
  })
);

// ---------- Şifre sıfırlama: aynı iki-adımlı desen, hesabın MEVCUT giriş e-postasına gönderilir. ----------

router.post(
  '/reset-password/request-otp',
  asyncHandler(async (req, res) => {
    const { tcKimlikNo, dogumTarihi } = req.body || {};
    if (!tcKimlikNo || !dogumTarihi) {
      return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }

    const throttleKey = `reset:${tcKimlikNo.trim()}`;
    const throttle = checkThrottle(throttleKey);
    if (throttle.blocked) {
      return res.status(429).json({
        error: `Çok fazla deneme. Lütfen ${Math.ceil(throttle.retryAfterSeconds / 60)} dakika sonra tekrar deneyin.`,
      });
    }

    const account = await userRepository.findAccountByIdentity(tcKimlikNo.trim(), dogumTarihi);
    if (!account) {
      recordFailure(throttleKey);
      return res.status(404).json({ error: 'T.C. Kimlik No ve doğum tarihi ile eşleşen bir hesap bulunamadı.' });
    }

    const code = otpService.createOtp(throttleKey, account.email);
    try {
      await sendOtpEmail(account.email, code);
    } catch (err) {
      console.error('❌ OTP e-posta gönderim hatası:', err.message);
      return res.status(503).json({ error: 'Doğrulama kodu gönderilemedi. Lütfen daha sonra tekrar deneyin.' });
    }

    res.json({ email: maskEmail(account.email) });
  })
);

router.post(
  '/reset-password/verify',
  asyncHandler(async (req, res) => {
    const { tcKimlikNo, dogumTarihi, otp, password } = req.body || {};
    if (!tcKimlikNo || !dogumTarihi || !otp || !password) {
      return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }
    const sifreHatasi = passwordPolicyHatasi(password);
    if (sifreHatasi) {
      return res.status(400).json({ error: sifreHatasi });
    }

    const throttleKey = `reset:${tcKimlikNo.trim()}`;
    const throttle = checkThrottle(throttleKey);
    if (throttle.blocked) {
      return res.status(429).json({
        error: `Çok fazla deneme. Lütfen ${Math.ceil(throttle.retryAfterSeconds / 60)} dakika sonra tekrar deneyin.`,
      });
    }

    const account = await userRepository.findAccountByIdentity(tcKimlikNo.trim(), dogumTarihi);
    if (!account) {
      recordFailure(throttleKey);
      return res.status(404).json({ error: 'T.C. Kimlik No ve doğum tarihi ile eşleşen bir hesap bulunamadı.' });
    }

    const result = otpService.verifyOtp(throttleKey, otp);
    if (!result.valid) {
      recordFailure(throttleKey);
      return res.status(400).json({ error: 'Kod hatalı ya da süresi dolmuş. Lütfen kodu tekrar isteyin.' });
    }
    resetThrottle(throttleKey);

    await userRepository.updatePassword(account.id, password);
    res.json({ adsoyad: account.adsoyad, email: account.email });
  })
);

module.exports = router;
