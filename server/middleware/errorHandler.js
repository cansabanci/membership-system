function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Bulunamadı.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('❌ API hatası:', err.message);
  const status = err.status || err.statusCode || 500;
  // 5xx = beklenmeyen hata (ör. ham MSSQL sürücü hatası) — client'a asla err.message olarak
  // sızdırılmaz (tablo/kolon/constraint adları, hatta bazen çakışan değerin kendisi içerebilir).
  // Gerçek mesaj yukarıda zaten loglandı. 4xx'ler ise bilerek fırlatılan, güvenli, kullanıcıya
  // gösterilmesi amaçlanan mesajlardır (ör. "Bu üye için geri alınacak bir değişiklik yok").
  let message;
  if (err.type === 'entity.too.large') {
    // body-parser'ın "request entity too large" İngilizce mesajı yerine — fotoğraf sıkıştırma
    // devreye girmeden önce (eski istemci/tarayıcı önbelleği) buraya düşerse diye ek güvence.
    message = 'Yüklemeye çalıştığınız fotoğraf çok büyük. Lütfen daha küçük bir fotoğraf seçin.';
  } else {
    message = status >= 500 ? 'Sunucuda beklenmeyen bir hata oluştu.' : err.message || 'Bir hata oluştu.';
  }
  res.status(status).json({ error: message });
}

module.exports = { notFoundHandler, errorHandler };
