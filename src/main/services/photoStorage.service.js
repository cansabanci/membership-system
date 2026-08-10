const fs = require('fs');
const path = require('path');

function savePhotoFromDataUrl(photosDir, dataUrl) {
  const match = dataUrl.match(/^data:image\/(\w+);base64,/);
  if (!match) {
    throw new Error('Geçersiz fotoğraf formatı.');
  }

  const ext = match[1];
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${ext}`;
  fs.writeFileSync(path.join(photosDir, fileName), Buffer.from(base64Data, 'base64'));

  return `photos/${fileName}`;
}

function toFileUrl(photosDir, relativePath) {
  return `file://${path.join(photosDir, path.basename(relativePath))}`;
}

function deletePhotoFile(photosDir, relativePath) {
  const filePath = path.join(photosDir, path.basename(relativePath));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = { savePhotoFromDataUrl, toFileUrl, deletePhotoFile };
