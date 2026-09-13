const userRepository = require('../../src/main/db/repositories/userRepository');

// "Client'tan gelen id'ye asla guvenme" pattern'i — profile.ipc.js'teki getOwnUyeId ile
// ayni prensip: rol/userId/uyeId HER ZAMAN req.session'dan okunur, req.body/req.params'tan degil.
//
// Hesap silindikten sonra da (ya da test/temizlik sirasinda oldugu gibi) o hesaba ait eski
// bir oturum hala DB'de/cerezde kalabiliyor — boyle bir "hayalet" oturumla gelen istek,
// downstream'de (ornegin uye_gecmisi INSERT'inde) anlasilmasi zor bir FK hatasi olarak
// patlamak yerine burada temiz bir 401'e cevrilip oturum yok ediliyor.
async function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Oturum gerekli.' });
  }

  let exists;
  try {
    exists = await userRepository.userExists(req.session.userId);
  } catch (err) {
    return next(err);
  }

  if (!exists) {
    return req.session.destroy(() => {
      res.status(401).json({ error: 'Oturumunuz artık geçerli değil. Lütfen tekrar giriş yapın.' });
    });
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
