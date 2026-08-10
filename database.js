// database.js
require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// MSSQL bağlantısı kurma
sql.connect(config, async (err) => {
  if (err) {
    console.error('❌ MSSQL bağlantı hatası:', err.message);
    return;
  }
  console.log('✅ MSSQL veritabanına bağlanıldı.');

  try {
    const request = new sql.Request();

    // 'uyeler' tablosunu oluştur
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uyeler' AND xtype='U')
      CREATE TABLE uyeler (
        id INT IDENTITY(1,1) PRIMARY KEY,
        adsoyad NVARCHAR(255) NOT NULL,
        bolum NVARCHAR(255) NOT NULL,
        mezuniyet NVARCHAR(255) NOT NULL,
        bursMiktar INT DEFAULT 0,
        bursTip NVARCHAR(255) DEFAULT 'Aylık',
        photo NVARCHAR(MAX) DEFAULT NULL,
        email NVARCHAR(MAX),
        telefon NVARCHAR(MAX),
        isyeri NVARCHAR(MAX),
        meslek NVARCHAR(MAX),
        pozisyon NVARCHAR(MAX),
        sehir NVARCHAR(MAX),
        uyelikGiris NVARCHAR(MAX),
        uyelikCikis NVARCHAR(MAX)
      )
    `);
    console.log("✅ 'uyeler' tablosu hazır.");

    // 'aidatlar' tablosunu oluştur
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='aidatlar' AND xtype='U')
      CREATE TABLE aidatlar (
        id INT IDENTITY(1,1) PRIMARY KEY,
        uye_id INT NOT NULL,
        donem NVARCHAR(255) NOT NULL,
        odendi INT DEFAULT 0,
        FOREIGN KEY (uye_id) REFERENCES uyeler(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ 'aidatlar' tablosu hazır.");
  } catch (err) {
    console.error('❌ Tablo oluşturulurken hata:', err.message);
  }
});

module.exports = sql;
