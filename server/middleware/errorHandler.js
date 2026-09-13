function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Bulunamadı.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('❌ API hatası:', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Sunucuda beklenmeyen bir hata oluştu.' });
}

module.exports = { notFoundHandler, errorHandler };
