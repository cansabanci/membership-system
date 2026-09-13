// Kimlik bazli (email / TC Kimlik No) deneme sinirlama — brute-force'a karsi asil korunma
// (IP bazli genel limit rateLimit.js'te ayrica var). Tek process/tek VPS oldugu icin bellek-ici
// bir Map yeterli — Redis gibi ek bir bagimliliga gerek yok, process yeniden baslarsa sayaclarin
// sifirlanmasi kabul edilebilir (kalicilik gerektirmiyor, session store'un aksine).
const WINDOW_MS = parseInt(process.env.LOGIN_THROTTLE_WINDOW_MS, 10) || 15 * 60 * 1000;
const MAX_ATTEMPTS = parseInt(process.env.LOGIN_THROTTLE_MAX_ATTEMPTS, 10) || 5;

const attempts = new Map();

function checkThrottle(key) {
  const entry = attempts.get(key);
  if (!entry) return { blocked: false };

  if (Date.now() - entry.firstAttempt > WINDOW_MS) {
    attempts.delete(key);
    return { blocked: false };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (Date.now() - entry.firstAttempt)) / 1000);
    return { blocked: true, retryAfterSeconds };
  }

  return { blocked: false };
}

function recordFailure(key) {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: Date.now() });
  } else {
    entry.count += 1;
  }
}

function resetThrottle(key) {
  attempts.delete(key);
}

module.exports = { checkThrottle, recordFailure, resetThrottle };
