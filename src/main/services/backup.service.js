const { buildAndSaveWorkbook } = require('./excelExport.service');
const { uploadToDrive } = require('./driveUpload.service');

async function runBackup() {
  const { filePath, fileName } = await buildAndSaveWorkbook();
  await uploadToDrive(filePath, fileName);
  console.log("✅ Excel dosyası oluşturuldu ve Google Drive'a yüklendi:", fileName);
}

module.exports = { runBackup };
