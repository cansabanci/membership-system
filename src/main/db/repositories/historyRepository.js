const { getPool, sql } = require('../pool');

// Her uye icin sadece son birkac degisikligi tut, eskileri otomatik temizle
// (yonetici islemleriyle orantili kaldigi icin veritabanini yormaz).
const RETENTION_PER_MEMBER = 3;

async function saveSnapshot(uyeId, kullaniciId, memberData, aidatlar) {
  const pool = getPool();
  const veri = JSON.stringify({ member: memberData, aidatlar });

  await pool
    .request()
    .input('uye_id', sql.Int, uyeId)
    .input('kullanici_id', sql.Int, kullaniciId)
    .input('veri', sql.NVarChar, veri)
    .query('INSERT INTO uye_gecmisi (uye_id, kullanici_id, veri) VALUES (@uye_id, @kullanici_id, @veri)');

  await pool
    .request()
    .input('uye_id', sql.Int, uyeId)
    .input('limit', sql.Int, RETENTION_PER_MEMBER)
    .query(`
      DELETE FROM uye_gecmisi
      WHERE uye_id = @uye_id
        AND id NOT IN (
          SELECT TOP (@limit) id FROM uye_gecmisi WHERE uye_id = @uye_id ORDER BY id DESC
        )
    `);
}

async function getLatestSnapshot(uyeId) {
  const pool = getPool();
  const result = await pool
    .request()
    .input('uye_id', sql.Int, uyeId)
    .query('SELECT TOP 1 id, veri FROM uye_gecmisi WHERE uye_id=@uye_id ORDER BY id DESC');

  if (!result.recordset[0]) return null;

  const parsed = JSON.parse(result.recordset[0].veri);
  return { id: result.recordset[0].id, member: parsed.member, aidatlar: parsed.aidatlar };
}

async function deleteSnapshot(id) {
  const pool = getPool();
  await pool.request().input('id', sql.Int, id).query('DELETE FROM uye_gecmisi WHERE id=@id');
}

module.exports = { saveSnapshot, getLatestSnapshot, deleteSnapshot };
