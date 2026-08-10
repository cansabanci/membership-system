const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'veritabani/uyeler.db');

if (!fs.existsSync(dbPath)) {
  console.log('❌ uyeler.db dosyası bulunamadı:', dbPath);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Veritabanı açılamadı:', err.message);
    return;
  }
  console.log('✅ Veritabanı bağlantısı başarılı.');
});

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
      console.error('❌ Tablo listesi alınamadı:', err.message);
      return;
    }

    const tableNames = rows.map(row => row.name);
    console.log('📄 Veritabanındaki tablolar:', tableNames);

    if (tableNames.includes('uyeler')) {
      console.log('✅ "uyeler" tablosu mevcut.');
    } else {
      console.log('❌ "uyeler" tablosu BULUNMUYOR.');
    }

    db.close();
  });
});
