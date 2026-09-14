const { getPool, sql } = require('../pool');

// Üyenin kendi hesabından güncelleyebileceği alanlar — kimlik doğrulama (tcKimlikNo,
// dogumTarihi), mali (bursMiktar/bursTip) ve idari (durum, uyeTur vb.) alanlar bilerek dışarıda
// bırakılıyor, sadece admin değiştirebilir.
const SELF_SERVICE_FIELDS = ['email', 'telefon', 'photo', 'bolum', 'mezuniyet', 'meslek', 'isyeri', 'sehir'];

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
    .input('sehir', sql.NVarChar, member.sehir)
    .input('uyelikGiris', sql.NVarChar, member.uyelikGiris)
    .input('uyelikCikis', sql.NVarChar, member.uyelikCikis)
    .input('tcKimlikNo', sql.NVarChar, member.tcKimlikNo)
    .input('cinsiyet', sql.NVarChar, member.cinsiyet)
    .input('dogumTarihi', sql.NVarChar, member.dogumTarihi)
    .input('ogrenimDurumu', sql.NVarChar, member.ogrenimDurumu)
    .input('uyeNiteligi', sql.NVarChar, member.uyeNiteligi)
    .input('uyeTur', sql.NVarChar, member.uyeTur)
    .input('onursalUye', sql.Bit, member.onursalUye ? 1 : 0)
    .input('durum', sql.NVarChar, member.durum)
    .input('yonetimKuruluKararTarihi', sql.NVarChar, member.yonetimKuruluKararTarihi)
    .input('pasifOlmaNedeni', sql.NVarChar, member.pasifOlmaNedeni)
    .input('pasifOlmaBildirimTarihi', sql.NVarChar, member.pasifOlmaBildirimTarihi)
    .query(`INSERT INTO uyeler
      (adsoyad, bolum, mezuniyet, bursMiktar, bursTip, photo, email, telefon, isyeri, meslek, sehir, uyelikGiris, uyelikCikis,
       tcKimlikNo, cinsiyet, dogumTarihi, ogrenimDurumu, uyeNiteligi, uyeTur, onursalUye, durum, yonetimKuruluKararTarihi, pasifOlmaNedeni, pasifOlmaBildirimTarihi)
      OUTPUT INSERTED.id
      VALUES (@adsoyad, @bolum, @mezuniyet, @bursMiktar, @bursTip, @photo, @email, @telefon, @isyeri, @meslek, @sehir, @uyelikGiris, @uyelikCikis,
       @tcKimlikNo, @cinsiyet, @dogumTarihi, @ogrenimDurumu, @uyeNiteligi, @uyeTur, @onursalUye, @durum, @yonetimKuruluKararTarihi, @pasifOlmaNedeni, @pasifOlmaBildirimTarihi)`);

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
    .input('sehir', sql.NVarChar, member.sehir)
    .input('uyelikGiris', sql.NVarChar, member.uyelikGiris)
    .input('uyelikCikis', sql.NVarChar, member.uyelikCikis)
    .input('tcKimlikNo', sql.NVarChar, member.tcKimlikNo)
    .input('cinsiyet', sql.NVarChar, member.cinsiyet)
    .input('dogumTarihi', sql.NVarChar, member.dogumTarihi)
    .input('ogrenimDurumu', sql.NVarChar, member.ogrenimDurumu)
    .input('uyeNiteligi', sql.NVarChar, member.uyeNiteligi)
    .input('uyeTur', sql.NVarChar, member.uyeTur)
    .input('onursalUye', sql.Bit, member.onursalUye ? 1 : 0)
    .input('durum', sql.NVarChar, member.durum)
    .input('yonetimKuruluKararTarihi', sql.NVarChar, member.yonetimKuruluKararTarihi)
    .input('pasifOlmaNedeni', sql.NVarChar, member.pasifOlmaNedeni)
    .input('pasifOlmaBildirimTarihi', sql.NVarChar, member.pasifOlmaBildirimTarihi);

  let query = `UPDATE uyeler SET
    adsoyad=@adsoyad, bolum=@bolum, mezuniyet=@mezuniyet, bursMiktar=@bursMiktar,
    bursTip=@bursTip, email=@email, telefon=@telefon, isyeri=@isyeri, meslek=@meslek,
    sehir=@sehir, uyelikGiris=@uyelikGiris, uyelikCikis=@uyelikCikis,
    tcKimlikNo=@tcKimlikNo, cinsiyet=@cinsiyet, dogumTarihi=@dogumTarihi, ogrenimDurumu=@ogrenimDurumu,
    uyeNiteligi=@uyeNiteligi, uyeTur=@uyeTur, onursalUye=@onursalUye, durum=@durum,
    yonetimKuruluKararTarihi=@yonetimKuruluKararTarihi, pasifOlmaNedeni=@pasifOlmaNedeni, pasifOlmaBildirimTarihi=@pasifOlmaBildirimTarihi`;

  if (member.photo !== undefined) {
    req.input('photo', sql.NVarChar, member.photo);
    query += `, photo=@photo`;
  }
  query += ` WHERE id=@id`;

  await req.query(query);
}

// Sadece SELF_SERVICE_FIELDS whitelist'inde bulunan ve `fields` içinde geçen kolonları
// günceller — client'tan başka alan gelse bile sunucu tarafında yok sayılır.
async function updateOwnProfileFields(id, fields) {
  const pool = getPool();
  const req = pool.request().input('id', sql.Int, id);

  const setClauses = [];
  for (const key of SELF_SERVICE_FIELDS) {
    if (fields[key] === undefined) continue;
    req.input(key, sql.NVarChar, fields[key]);
    setClauses.push(`${key}=@${key}`);
  }

  if (setClauses.length === 0) return;
  await req.query(`UPDATE uyeler SET ${setClauses.join(', ')} WHERE id=@id`);
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

async function getMemberById(id) {
  const pool = getPool();
  const result = await pool.request().input('id', sql.Int, id).query(`SELECT * FROM uyeler WHERE id=@id`);
  return result.recordset[0] || null;
}

async function getAllMembers() {
  const pool = getPool();
  const result = await pool.request().query(`SELECT * FROM uyeler`);
  return result.recordset;
}

// "Üye rehberi" (viewer'ların birbirini görebildiği) özelliği için — kasıtlı olarak dar bir
// alan seti: TC no, doğum tarihi, telefon, e-posta, aidat/burs gibi hassas alanlar HİÇBİR ZAMAN
// bu sorguya eklenmemeli (bkz. GET /api/members/directory route'undaki yorum).
async function getDirectoryMembers() {
  const pool = getPool();
  const result = await pool
    .request()
    .query(`SELECT id, adsoyad, bolum, mezuniyet, meslek, isyeri, sehir, photo FROM uyeler WHERE durum='Aktif' ORDER BY adsoyad`);
  return result.recordset;
}

async function getAidatlarForMember(uyeId) {
  const pool = getPool();
  const result = await pool
    .request()
    .input('uye_id', sql.Int, uyeId)
    .query(`SELECT * FROM aidatlar WHERE uye_id=@uye_id ORDER BY donem DESC`);
  return result.recordset;
}

// Tum uyelerin aidatlarini TEK sorguda getirir (N+1 sorgu sorununu onlemek icin —
// her uye icin ayri sorgu atmak 250+ uyede saniyeler suren gecikmeye yol aciyordu).
async function getAllAidatlar() {
  const pool = getPool();
  const result = await pool.request().query(`SELECT * FROM aidatlar ORDER BY donem DESC`);
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
  updateOwnProfileFields,
  replaceAidatlar,
  getMemberById,
  getAllMembers,
  getDirectoryMembers,
  getAidatlarForMember,
  getAllAidatlar,
  getMemberPhoto,
  deleteMember,
};
