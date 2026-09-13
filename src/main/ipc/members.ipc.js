const memberRepository = require('../db/repositories/memberRepository');
const historyRepository = require('../db/repositories/historyRepository');
const userRepository = require('../db/repositories/userRepository');
const { savePhotoFromDataUrl, toFileUrl, deletePhotoFile, resolvePhotoPath } = require('../services/photoStorage.service');
const { toDurumListesi } = require('../utils/aidatUtils');

function registerMembersIpc(ipcMain, { photosDir, getRole, getUserId }) {
  function requireAdmin(event) {
    if (getRole() !== 'admin') {
      event.reply('member-error', 'Bu işlem için yetkiniz yok.');
      return false;
    }
    return true;
  }

  ipcMain.on('add-member', async (event, member) => {
    if (!requireAdmin(event)) return;
    try {
      const photoPath = member.photo ? savePhotoFromDataUrl(photosDir, member.photo) : null;

      const uyeId = await memberRepository.insertMember({ ...member, photo: photoPath });
      await memberRepository.replaceAidatlar(uyeId, member.aidatlar);

      const replyMember = {
        ...member,
        id: uyeId,
        photo: photoPath ? toFileUrl(photosDir, photoPath) : null,
        ...toDurumListesi(member.aidatlar),
      };

      event.reply('member-added', replyMember);
    } catch (err) {
      console.error('❌ MSSQL insert hatası:', err.message);
      event.reply('member-error', 'Üye eklenirken bir hata oluştu: ' + err.message);
    }
  });

  ipcMain.on('update-member', async (event, member) => {
    if (!requireAdmin(event)) return;
    try {
      const before = await memberRepository.getMemberById(member.id);
      if (before) {
        const beforeAidatlar = await memberRepository.getAidatlarForMember(member.id);
        await historyRepository.saveSnapshot(member.id, getUserId(), before, beforeAidatlar);
      }

      // Not: eski fotoğraf dosyası burada silinmiyor (rollback ile geri gelebilmesi için
      // diskte bırakılıyor) — sadece tam üye silme işleminde fiziksel dosya temizleniyor.
      const photoPath = resolvePhotoPath(photosDir, member);

      await memberRepository.updateMember(member.id, { ...member, photo: photoPath });
      await memberRepository.replaceAidatlar(member.id, member.aidatlar);

      // photoPath: yeni yol -> guncellendi, null -> kaldirildi, undefined -> dokunulmadi (onceki hal gecerli)
      const finalPhotoPath = photoPath !== undefined ? photoPath : before && before.photo;
      const updated = {
        ...member,
        photo: finalPhotoPath ? toFileUrl(photosDir, finalPhotoPath) : null,
        ...toDurumListesi(member.aidatlar),
      };

      event.reply('member-updated', updated);
    } catch (err) {
      console.error('❌ Update hatası:', err.message);
      event.reply('member-error', 'Üye güncellenirken bir hata oluştu: ' + err.message);
    }
  });

  ipcMain.on('rollback-member', async (event, memberId) => {
    if (!requireAdmin(event)) return;
    try {
      const snapshot = await historyRepository.getLatestSnapshot(memberId);
      if (!snapshot) {
        event.reply('member-error', 'Bu üye için geri alınacak bir değişiklik bulunamadı.');
        return;
      }

      await memberRepository.updateMember(memberId, snapshot.member);
      await memberRepository.replaceAidatlar(memberId, snapshot.aidatlar);
      await historyRepository.deleteSnapshot(snapshot.id);

      const restored = {
        ...snapshot.member,
        id: memberId,
        photo: snapshot.member.photo ? toFileUrl(photosDir, snapshot.member.photo) : null,
        aidatlar: snapshot.aidatlar,
        ...toDurumListesi(snapshot.aidatlar),
      };

      event.reply('member-updated', restored);
    } catch (err) {
      console.error('❌ Geri alma hatası:', err.message);
      event.reply('member-error', 'Değişiklik geri alınırken bir hata oluştu: ' + err.message);
    }
  });

  ipcMain.on('load-members', async (event) => {
    try {
      const [members, tumAidatlar] = await Promise.all([memberRepository.getAllMembers(), memberRepository.getAllAidatlar()]);

      const aidatlarByUyeId = new Map();
      for (const aidat of tumAidatlar) {
        if (!aidatlarByUyeId.has(aidat.uye_id)) aidatlarByUyeId.set(aidat.uye_id, []);
        aidatlarByUyeId.get(aidat.uye_id).push(aidat);
      }

      for (const uye of members) {
        if (uye.photo) uye.photo = toFileUrl(photosDir, uye.photo);
        const aidatlar = aidatlarByUyeId.get(uye.id) || [];
        Object.assign(uye, toDurumListesi(aidatlar));
        uye.aidatlar = aidatlar;
      }

      event.reply('members-loaded', members);
    } catch (err) {
      console.error('❌ Yükleme hatası:', err.message);
      event.reply('member-error', 'Üyeler yüklenirken bir hata oluştu: ' + err.message);
    }
  });

  ipcMain.on('delete-member', async (event, memberId) => {
    if (!requireAdmin(event)) return;
    try {
      const photo = await memberRepository.getMemberPhoto(memberId);
      if (photo) deletePhotoFile(photosDir, photo);

      await userRepository.deleteAccountByMemberId(memberId);
      await memberRepository.deleteMember(memberId);
      event.reply('member-deleted', { success: true, id: memberId });
    } catch (err) {
      console.error('❌ Silme hatası:', err.message);
      event.reply('member-error', 'Üye silinirken bir hata oluştu: ' + err.message);
    }
  });
}

module.exports = registerMembersIpc;
