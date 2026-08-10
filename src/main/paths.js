const path = require('path');
const { app } = require('electron');

// Paketlenmiş .exe'de dosyalar resourcesPath altında, geliştirme ortamında proje kökünde yaşar.
const isPackaged = app.isPackaged;
const baseDir = isPackaged ? process.resourcesPath : path.join(__dirname, '..', '..');

module.exports = {
  isPackaged,
  envPath: path.join(baseDir, '.env'),
  credentialsPath: path.join(baseDir, 'resources', 'google', 'credentials.json'),
  exportDir: path.join(baseDir, 'export'),
};
