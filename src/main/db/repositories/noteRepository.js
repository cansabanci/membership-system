const { getPool, sql } = require('../pool');

async function getNote(uyeId, kullaniciId) {
  const pool = getPool();
  const result = await pool
    .request()
    .input('uye_id', sql.Int, uyeId)
    .input('kullanici_id', sql.Int, kullaniciId)
    .query('SELECT metin FROM uye_notlari WHERE uye_id=@uye_id AND kullanici_id=@kullanici_id');

  return result.recordset[0] ? result.recordset[0].metin : '';
}

async function saveNote(uyeId, kullaniciId, metin) {
  const pool = getPool();

  if (!metin || !metin.trim()) {
    await pool
      .request()
      .input('uye_id', sql.Int, uyeId)
      .input('kullanici_id', sql.Int, kullaniciId)
      .query('DELETE FROM uye_notlari WHERE uye_id=@uye_id AND kullanici_id=@kullanici_id');
    return;
  }

  const updateResult = await pool
    .request()
    .input('uye_id', sql.Int, uyeId)
    .input('kullanici_id', sql.Int, kullaniciId)
    .input('metin', sql.NVarChar, metin)
    .query(
      `UPDATE uye_notlari SET metin=@metin, guncellemeTarihi=GETDATE()
       WHERE uye_id=@uye_id AND kullanici_id=@kullanici_id`
    );

  if (updateResult.rowsAffected[0] === 0) {
    await pool
      .request()
      .input('uye_id', sql.Int, uyeId)
      .input('kullanici_id', sql.Int, kullaniciId)
      .input('metin', sql.NVarChar, metin)
      .query('INSERT INTO uye_notlari (uye_id, kullanici_id, metin) VALUES (@uye_id, @kullanici_id, @metin)');
  }
}

module.exports = { getNote, saveNote };
