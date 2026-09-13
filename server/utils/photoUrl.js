const path = require('path');

// toFileUrl'in (Electron/renderer'a özel file:// url'i döndüren) sunucu tarafi karsiligi —
// DB hala sadece `photos/<dosya>` relative key'i tutuyor, biz onu kimlik dogrulamali
// bir API route'una donusturuyoruz.
function toPhotoUrl(relativePath) {
  if (!relativePath) return null;
  return `/api/photos/${path.basename(relativePath)}`;
}

module.exports = { toPhotoUrl };
