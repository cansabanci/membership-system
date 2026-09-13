const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const memberRepository = require('../db/repositories/memberRepository');
const { exportDir } = require('../paths');

// Diskin sınırsız büyümemesi için en fazla bu kadar yedek dosyası saklanır.
const RETENTION_COUNT = 60;

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

function cleanupOldBackups() {
  if (!fs.existsSync(exportDir)) return;

  const files = fs
    .readdirSync(exportDir)
    .filter((f) => /^uyeler_.*\.xlsx$/i.test(f))
    .map((f) => ({ name: f, time: fs.statSync(path.join(exportDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  files.slice(RETENTION_COUNT).forEach((f) => fs.unlinkSync(path.join(exportDir, f.name)));
}

async function buildAndSaveWorkbook() {
  const rows = await memberRepository.getAllMembers();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Uyeler');
  sheet.columns = [
    { header: 'Ad Soyad', key: 'adsoyad' },
    { header: 'T.C. Kimlik No', key: 'tcKimlikNo' },
    { header: 'Cinsiyet', key: 'cinsiyet' },
    { header: 'Doğum Tarihi', key: 'dogumTarihi' },
    { header: 'Bölüm', key: 'bolum' },
    { header: 'Mezuniyet', key: 'mezuniyet' },
    { header: 'Öğrenim Durumu', key: 'ogrenimDurumu' },
    { header: 'Burs Miktar', key: 'bursMiktar' },
    { header: 'Burs Tip', key: 'bursTip' },
    { header: 'Email', key: 'email' },
    { header: 'Telefon', key: 'telefon' },
    { header: 'İşyeri', key: 'isyeri' },
    { header: 'Meslek', key: 'meslek' },
    { header: 'Şehir', key: 'sehir' },
    { header: 'Üye Niteliği', key: 'uyeNiteligi' },
    { header: 'Üye Türü', key: 'uyeTur' },
    { header: 'Onursal Üye', key: 'onursalUye' },
    { header: 'Durum', key: 'durum' },
    { header: 'Yönetim Kurulu Karar Tarihi', key: 'yonetimKuruluKararTarihi' },
    { header: 'Üyelik Giriş', key: 'uyelikGiris' },
    { header: 'Üyelik Çıkış', key: 'uyelikCikis' },
    { header: 'Pasif Olma Nedeni', key: 'pasifOlmaNedeni' },
    { header: 'Pasif Olma Bildirim Tarihi', key: 'pasifOlmaBildirimTarihi' },
  ];
  rows.forEach((row) => sheet.addRow(row));

  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const fileName = `uyeler_${formatTimestamp(new Date())}.xlsx`;
  const filePath = path.join(exportDir, fileName);
  await workbook.xlsx.writeFile(filePath);

  cleanupOldBackups();

  return { filePath, fileName };
}

module.exports = { buildAndSaveWorkbook };
