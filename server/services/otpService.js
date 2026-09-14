// Hesap olusturma / sifre sifirlama icin e-posta OTP'si — bellek-ici bir Map (loginThrottle.js
// ile ayni desen): tek process/tek VPS icin yeterli, process yeniden baslarsa bekleyen bir
// OTP'nin sifirlanmasi kabul edilebilir (kullanici sadece "kod gonder"i tekrar tiklar).
const TTL_MS = parseInt(process.env.OTP_TTL_MS, 10) || 10 * 60 * 1000; // 10 dk
const MAX_ATTEMPTS = 5;

const otps = new Map();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createOtp(key, email) {
  const code = generateCode();
  otps.set(key, { code, email, expiresAt: Date.now() + TTL_MS, attempts: 0 });
  return code;
}

// Donus: { valid: boolean, reason?: 'not_found' | 'expired' | 'too_many_attempts' | 'mismatch' }
function verifyOtp(key, code) {
  const entry = otps.get(key);
  if (!entry) return { valid: false, reason: 'not_found' };

  if (Date.now() > entry.expiresAt) {
    otps.delete(key);
    return { valid: false, reason: 'expired' };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    otps.delete(key);
    return { valid: false, reason: 'too_many_attempts' };
  }

  if (entry.code !== String(code).trim()) {
    entry.attempts += 1;
    return { valid: false, reason: 'mismatch' };
  }

  otps.delete(key);
  return { valid: true };
}

function clearOtp(key) {
  otps.delete(key);
}

module.exports = { createOtp, verifyOtp, clearOtp };
