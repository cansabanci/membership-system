const { runBackup } = require('./backup.service');

// Uygulama kapanışta zaten yedek alıyor; bu zamanlayıcı çökme/elektrik kesintisi
// gibi düzgün kapanmayan durumlarda veri kaybını önlemek için periyodik yedek alır.
const INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 saat

let timer = null;

function startBackupScheduler() {
  if (timer) return;
  timer = setInterval(() => {
    runBackup().catch((err) => console.error('❌ Zamanlanmış yedekleme hatası:', err.message));
  }, INTERVAL_MS);
}

function stopBackupScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { startBackupScheduler, stopBackupScheduler };
