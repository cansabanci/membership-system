const fs = require('fs');
const config = require('./config/env');
const db = require('../src/main/db/pool');
const { runMigrations } = require('../src/main/db/migrate');
const createApp = require('./app');

async function main() {
  fs.mkdirSync(config.PHOTOS_DIR, { recursive: true });

  try {
    await db.connect();
    await runMigrations();
  } catch (err) {
    // DB'ye baslangicta ulasilamasa bile sunucu ayakta kalir — login vb. route'lar
    // getPool()'un firlattigi hatayi yakalayip kullaniciya "veritabanina ulasilamadi"
    // seklinde 503 donuyor, tum process cokmuyor.
    console.error('⚠️ Veritabanına başlangıçta bağlanılamadı, sunucu yine de ayağa kalkacak:', err.message);
  }

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    console.log(`✅ API sunucusu http://localhost:${config.PORT} adresinde çalışıyor.`);
  });

  return server;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Sunucu başlatılamadı:', err.message);
    process.exit(1);
  });
}

module.exports = main;
