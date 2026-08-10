const sql = require('mssql');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config({
    path: process.env.NODE_ENV === 'production'
      ? path.join(process.resourcesPath, '.env')
      : path.join(__dirname, '..', '.env')
  });
  

const exportFolder = path.join(__dirname, '../export');

// 📌 Veritabanını Excel'e aktar ve Google Drive'a yükle
async function exportToExcelAndUpload() {
    // MSSQL bağlantı ayarları
    const dbConfig = {
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        server: process.env.DB_HOST,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT),
        options: {
            trustServerCertificate: true,
            enableArithAbort: true
        }
    };

    try {
        // Veritabanına bağlan
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT * FROM uyeler");
        const rows = result.recordset;

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Uyeler');

        sheet.columns = [
            { header: 'Ad Soyad', key: 'adsoyad' },
            { header: 'Bölüm', key: 'bolum' },
            { header: 'Mezuniyet', key: 'mezuniyet' },
            { header: 'Burs Miktar', key: 'bursMiktar' },
            { header: 'Burs Tip', key: 'bursTip' },
            { header: 'Email', key: 'email' },
            { header: 'Telefon', key: 'telefon' },
            { header: 'İşyeri', key: 'isyeri' },
            { header: 'Meslek', key: 'meslek' },
            { header: 'Pozisyon', key: 'pozisyon' },
            { header: 'Şehir', key: 'sehir' },
            { header: 'Üyelik Giriş', key: 'uyelikGiris' },
            { header: 'Üyelik Çıkış', key: 'uyelikCikis' }
        ];

        rows.forEach(row => sheet.addRow(row));

        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
        const fileName = `uyeler_${formattedDate}.xlsx`;
        const filePath = path.join(exportFolder, fileName);

        await workbook.xlsx.writeFile(filePath);

        await uploadToDrive(filePath, fileName);
        console.log("✅ Excel dosyası başarıyla oluşturuldu ve Google Drive'a yüklendi:", fileName);

    } catch (err) {
        console.error("❌ Veritabanı veya Excel yedekleme hatası:", err.message);
    }
}

// 📤 Google Drive'a dosya yükleme fonksiyonu
async function uploadToDrive(filePath, fileName) {
    const auth = new google.auth.GoogleAuth({
        keyFile: process.env.NODE_ENV === 'production'
          ? path.join(process.resourcesPath, 'google', 'credentials.json')
          : path.join(__dirname, 'credentials.json'),
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
      
    const drive = google.drive({ version: 'v3', auth });

    const folderId = '15cQAlJ_iJobSO_II52Kd9alXBZJElfV-'; // Kendi klasör ID'in

    const fileMetadata = {
        name: fileName,
        parents: [folderId]
    };

    const media = {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: fs.createReadStream(filePath)
    };

    await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
    });
}

module.exports = { exportToExcelAndUpload };
