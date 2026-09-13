const noteRepository = require('../db/repositories/noteRepository');

function registerNotesIpc(ipcMain, { getUserId }) {
  ipcMain.on('get-member-note', async (event, uyeId) => {
    try {
      const kullaniciId = getUserId();
      const metin = await noteRepository.getNote(uyeId, kullaniciId);
      event.reply('member-note-loaded', { uyeId, metin });
    } catch (err) {
      console.error('❌ Not yükleme hatası:', err.message);
      event.reply('member-error', 'Not yüklenirken bir hata oluştu: ' + err.message);
    }
  });

  ipcMain.on('save-member-note', async (event, { uyeId, metin }) => {
    try {
      const kullaniciId = getUserId();
      await noteRepository.saveNote(uyeId, kullaniciId, metin);
      event.reply('member-note-saved', { uyeId });
    } catch (err) {
      console.error('❌ Not kaydetme hatası:', err.message);
      event.reply('member-error', 'Not kaydedilirken bir hata oluştu: ' + err.message);
    }
  });
}

module.exports = registerNotesIpc;
