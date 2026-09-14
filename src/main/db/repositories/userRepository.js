const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../pool');

async function findByCredentials(email, password) {
  const pool = getPool();
  const result = await pool
    .request()
    .input('email', sql.NVarChar, email)
    .query('SELECT id, email, rol, password, uye_id FROM kullanicilar WHERE email=@email');

  const user = result.recordset[0];
  if (!user) return null;

  const gecerli = await bcrypt.compare(password, user.password);
  if (!gecerli) return null;

  return { id: user.id, email: user.email, rol: user.rol, uyeId: user.uye_id };
}

// T.C. Kimlik No + Doğum Tarihi ile eşleşen, henüz hesap açılmamış bir üye bulur.
async function findClaimableMember(tcKimlikNo, dogumTarihi) {
  const pool = getPool();
  const result = await pool
    .request()
    .input('tcKimlikNo', sql.NVarChar, tcKimlikNo)
    .input('dogumTarihi', sql.NVarChar, dogumTarihi)
    .query(`
      SELECT u.id, u.adsoyad, u.email
      FROM uyeler u
      WHERE u.tcKimlikNo = @tcKimlikNo AND u.dogumTarihi = @dogumTarihi
        AND NOT EXISTS (SELECT 1 FROM kullanicilar k WHERE k.uye_id = u.id)
    `);

  return result.recordset[0] || null;
}

async function emailExists(email) {
  const pool = getPool();
  const result = await pool.request().input('email', sql.NVarChar, email).query('SELECT id FROM kullanicilar WHERE email=@email');
  return !!result.recordset[0];
}

async function createAccount(uyeId, email, plainPassword) {
  const pool = getPool();
  const hashed = await bcrypt.hash(plainPassword, 10);

  await pool
    .request()
    .input('uye_id', sql.Int, uyeId)
    .input('email', sql.NVarChar, email)
    .input('password', sql.NVarChar, hashed)
    .query(`INSERT INTO kullanicilar (email, password, rol, uye_id) VALUES (@email, @password, 'viewer', @uye_id)`);
}

async function deleteAccountByMemberId(uyeId) {
  const pool = getPool();
  await pool.request().input('uye_id', sql.Int, uyeId).query('DELETE FROM kullanicilar WHERE uye_id=@uye_id');
}

// T.C. Kimlik No + Doğum Tarihi ile eşleşen, ZATEN hesabı olan bir üyenin hesabını bulur
// (şifre sıfırlama akışı için — findClaimableMember'ın tersi).
async function findAccountByIdentity(tcKimlikNo, dogumTarihi) {
  const pool = getPool();
  const result = await pool
    .request()
    .input('tcKimlikNo', sql.NVarChar, tcKimlikNo)
    .input('dogumTarihi', sql.NVarChar, dogumTarihi)
    .query(`
      SELECT k.id, k.email, u.adsoyad
      FROM kullanicilar k
      JOIN uyeler u ON u.id = k.uye_id
      WHERE u.tcKimlikNo = @tcKimlikNo AND u.dogumTarihi = @dogumTarihi
    `);

  return result.recordset[0] || null;
}

async function updatePassword(userId, plainPassword) {
  const pool = getPool();
  const hashed = await bcrypt.hash(plainPassword, 10);
  await pool.request().input('id', sql.Int, userId).input('password', sql.NVarChar, hashed).query('UPDATE kullanicilar SET password=@password WHERE id=@id');
}

// Bir oturumun (session) hala gecerli bir hesaba ait olup olmadigini dogrulamak icin —
// hesap silindikten sonra da o hesaba ait eski bir oturum cerezi (sid) hayalet olarak
// kalabiliyor, bu fonksiyon o durumu server tarafinda yakalayip temiz bir 401'e cevirmeyi saglar.
async function userExists(id) {
  const pool = getPool();
  const result = await pool.request().input('id', sql.Int, id).query('SELECT id FROM kullanicilar WHERE id=@id');
  return !!result.recordset[0];
}

module.exports = {
  findByCredentials,
  findClaimableMember,
  emailExists,
  createAccount,
  deleteAccountByMemberId,
  findAccountByIdentity,
  updatePassword,
  userExists,
};
