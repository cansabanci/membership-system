const { getPool, sql } = require('../pool');

async function insertMember(member) {
  const pool = getPool();
  const result = await pool
    .request()
    .input('adsoyad', sql.NVarChar, member.adsoyad)
    .input('bolum', sql.NVarChar, member.bolum)
    .input('mezuniyet', sql.NVarChar, member.mezuniyet)
    .input('bursMiktar', sql.Int, member.bursMiktar)
    .input('bursTip', sql.NVarChar, member.bursTip)
    .input('photo', sql.NVarChar, member.photo)
    .input('email', sql.NVarChar, member.email)
    .input('telefon', sql.NVarChar, member.telefon)
    .input('isyeri', sql.NVarChar, member.isyeri)
    .input('meslek', sql.NVarChar, member.meslek)
    .input('pozisyon', sql.NVarChar, member.pozisyon)
    .input('sehir', sql.NVarChar, member.sehir)
    .input('uyelikGiris', sql.NVarChar, member.uyelikGiris)
    .input('uyelikCikis', sql.NVarChar, member.uyelikCikis)
    .query(`INSERT INTO uyeler
      (adsoyad, bolum, mezuniyet, bursMiktar, bursTip, photo, email, telefon, isyeri, meslek, pozisyon, sehir, uyelikGiris, uyelikCikis)
      OUTPUT INSERTED.id
      VALUES (@adsoyad, @bolum, @mezuniyet, @bursMiktar, @bursTip, @photo, @email, @telefon, @isyeri, @meslek, @pozisyon, @sehir, @uyelikGiris, @uyelikCikis)`);

  return result.recordset[0].id;
}

async function updateMember(id, member) {
  const pool = getPool();
  const req = pool
    .request()
    .input('id', sql.Int, id)
    .input('adsoyad', sql.NVarChar, member.adsoyad)
    .input('bolum', sql.NVarChar, member.bolum)
    .input('mezuniyet', sql.NVarChar, member.mezuniyet)
    .input('bursMiktar', sql.Int, member.bursMiktar)
    .input('bursTip', sql.NVarChar, member.bursTip)
    .input('email', sql.NVarChar, member.email)
    .input('telefon', sql.NVarChar, member.telefon)
    .input('isyeri', sql.NVarChar, member.isyeri)
    .input('meslek', sql.NVarChar, member.meslek)
    .input('pozisyon', sql.NVarChar, member.pozisyon)
    .input('sehir', sql.NVarChar, member.sehir)
    .input('uyelikGiris', sql.NVarChar, member.uyelikGiris)
    .input('uyelikCikis', sql.NVarChar, member.uyelikCikis);

  let query = `UPDATE uyeler SET
    adsoyad=@adsoyad, bolum=@bolum, mezuniyet=@mezuniyet, bursMiktar=@bursMiktar,
    bursTip=@bursTip, email=@email, telefon=@telefon, isyeri=@isyeri, meslek=@meslek,
    pozisyon=@pozisyon, sehir=@sehir, uyelikGiris=@uyelikGiris, uyelikCikis=@uyelikCikis`;

  if (member.photo) {
    req.input('photo', sql.NVarChar, member.photo);
    query += `, photo=@photo`;
  }
  query += ` WHERE id=@id`;

  await req.query(query);
}

async function replaceAidatlar(uyeId, aidatlar) {
  const pool = getPool();
  await pool.request().input('uye_id', sql.Int, uyeId).query(`DELETE FROM aidatlar WHERE uye_id=@uye_id`);

  for (const a of aidatlar) {
    await pool
      .request()
      .input('uye_id', sql.Int, uyeId)
      .input('donem', sql.NVarChar, a.donem)
      .input('odendi', sql.Int, a.odendi)
      .query(`INSERT INTO aidatlar (uye_id, donem, odendi) VALUES (@uye_id, @donem, @odendi)`);
  }
}

async function getAllMembers() {
  const pool = getPool();
  const result = await pool.request().query(`SELECT * FROM uyeler`);
  return result.recordset;
}

async function getAidatlarForMember(uyeId) {
  const pool = getPool();
  const result = await pool.request().input('uye_id', sql.Int, uyeId).query(`SELECT * FROM aidatlar WHERE uye_id=@uye_id`);
  return result.recordset;
}

async function getMemberPhoto(id) {
  const pool = getPool();
  const result = await pool.request().input('id', sql.Int, id).query(`SELECT photo FROM uyeler WHERE id=@id`);
  return result.recordset[0] ? result.recordset[0].photo : null;
}

async function deleteMember(id) {
  const pool = getPool();
  await pool.request().input('id', sql.Int, id).query(`DELETE FROM aidatlar WHERE uye_id=@id`);
  await pool.request().input('id', sql.Int, id).query(`DELETE FROM uyeler WHERE id=@id`);
}

module.exports = {
  insertMember,
  updateMember,
  replaceAidatlar,
  getAllMembers,
  getAidatlarForMember,
  getMemberPhoto,
  deleteMember,
};
