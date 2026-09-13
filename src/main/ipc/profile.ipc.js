const memberRepository = require('../db/repositories/memberRepository');
const historyRepository = require('../db/repositories/historyRepository');
const { toFileUrl, resolvePhotoPath } = require('../services/photoStorage.service');
const { toDurumListesi } = require('../utils/aidatUtils');

const SELF_SERVICE_TEXT_FIELDS = ['email', 'telefon', 'bolum', 'mezuniyet', 'meslek', 'isyeri', 'sehir'];

async function buildProfilePayload(photosDir, uyeId) {
  const member = await memberRepository.getMemberById(uyeId);
  if (!member) return null;

  const aidatlar = await memberRepository.getAidatlarForMember(uyeId);
  return {
    ...member,
    photo: member.photo ? toFileUrl(photosDir, member.photo) : null,
    aidatlar,
    ...toDurumListesi(aidatlar),
  };
}

// Viewer'ın kendi hesabına bağlı üye kaydını görüntülemesi/güncellemesi için — client'tan
// gelen hiçbir id asla güvenilmez, üye kimliği daima main process'teki getUyeId() closure'ından
// (login sırasında kullanicilar.uye_id'den çözülmüş) alınır.
function registerProfileIpc(ipcMain, { photosDir, getUyeId, getUserId }) {
  function getOwnUyeId(event) {
    const uyeId = getUyeId();
    if (!uyeId) {
      event.reply('member-error', 'Hesabınıza bağlı bir üye kaydı bulunamadı.');
      return null;
    }
    return uyeId;
  }

  ipcMain.on('get-my-profile', async (event) => {
    const uyeId = getOwnUyeId(event);
    if (!uyeId) return;
    try {
      const profile = await buildProfilePayload(photosDir, uyeId);
      event.reply('my-profile-loaded', profile);
    } catch (err) {
      console.error('❌ Profil yükleme hatası:', err.message);
      event.reply('member-error', 'Profiliniz yüklenirken bir hata oluştu: ' + err.message);
    }
  });

  ipcMain.on('update-my-profile', async (event, payload) => {
    const uyeId = getOwnUyeId(event);
    if (!uyeId) return;
    try {
      const before = await memberRepository.getMemberById(uyeId);
      if (before) {
        const beforeAidatlar = await memberRepository.getAidatlarForMember(uyeId);
        await historyRepository.saveSnapshot(uyeId, getUserId(), before, beforeAidatlar);
      }

      const fields = {};
      for (const key of SELF_SERVICE_TEXT_FIELDS) {
        if (payload[key] !== undefined) fields[key] = payload[key];
      }
      const photoPath = resolvePhotoPath(photosDir, payload);
      if (photoPath !== undefined) fields.photo = photoPath;

      await memberRepository.updateOwnProfileFields(uyeId, fields);

      const updated = await buildProfilePayload(photosDir, uyeId);
      event.reply('my-profile-updated', updated);
      event.reply('member-updated', updated);
    } catch (err) {
      console.error('❌ Profil güncelleme hatası:', err.message);
      event.reply('member-error', 'Profiliniz güncellenirken bir hata oluştu: ' + err.message);
    }
  });
}

module.exports = registerProfileIpc;
