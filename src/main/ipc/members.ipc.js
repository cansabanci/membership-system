const memberRepository = require('../db/repositories/memberRepository');
const { savePhotoFromDataUrl, toFileUrl, deletePhotoFile } = require('../services/photoStorage.service');

function toDurumListesi(aidatlar) {
  return {
    donemler: aidatlar.map((a) => a.donem),
    donemler_odendi: aidatlar.map((a) => (a.odendi ? '✅' : '❌')),
  };
}

function registerMembersIpc(ipcMain, { photosDir }) {
  ipcMain.on('add-member', async (event, member) => {
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
    try {
      const isNewPhoto = member.photo && member.photo.startsWith('data:image/');
      const photoPath = isNewPhoto ? savePhotoFromDataUrl(photosDir, member.photo) : null;

      await memberRepository.updateMember(member.id, { ...member, photo: photoPath });
      await memberRepository.replaceAidatlar(member.id, member.aidatlar);

      const updated = {
        ...member,
        photo: photoPath ? toFileUrl(photosDir, photoPath) : member.photo,
        ...toDurumListesi(member.aidatlar),
      };

      event.reply('member-updated', updated);
    } catch (err) {
      console.error('❌ Update hatası:', err.message);
      event.reply('member-error', 'Üye güncellenirken bir hata oluştu: ' + err.message);
    }
  });

  ipcMain.on('load-members', async (event) => {
    try {
      const members = await memberRepository.getAllMembers();

      for (const uye of members) {
        if (uye.photo) uye.photo = toFileUrl(photosDir, uye.photo);
        const aidatlar = await memberRepository.getAidatlarForMember(uye.id);
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
    try {
      const photo = await memberRepository.getMemberPhoto(memberId);
      if (photo) deletePhotoFile(photosDir, photo);

      await memberRepository.deleteMember(memberId);
      event.reply('member-deleted', { success: true, id: memberId });
    } catch (err) {
      console.error('❌ Silme hatası:', err.message);
      event.reply('member-error', 'Üye silinirken bir hata oluştu: ' + err.message);
    }
  });
}

module.exports = registerMembersIpc;
