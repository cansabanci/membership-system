// "Client'tan gelen id'ye asla guvenme" pattern'i — profile.ipc.js'teki getOwnUyeId ile
// ayni prensip: rol/userId/uyeId HER ZAMAN req.session'dan okunur, req.body/req.params'tan degil.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Oturum gerekli.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.session.rol !== 'admin') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    next();
  });
}

// profile.ipc.js'teki getOwnUyeId'nin HTTP karsiligi.
function getSelfUyeId(req, res) {
  const uyeId = req.session && req.session.uyeId;
  if (!uyeId) {
    res.status(404).json({ error: 'Hesabınıza bağlı bir üye kaydı bulunamadı.' });
    return null;
  }
  return uyeId;
}

module.exports = { requireAuth, requireAdmin, getSelfUyeId };
