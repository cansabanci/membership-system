const userRepository = require('../db/repositories/userRepository');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

function passwordPolicyHatasi(password) {
  if (password.length < PASSWORD_MIN_LENGTH) return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı.`;
  if (!/[a-zğüşöçı]/.test(password)) return 'Şifre en az bir küçük harf içermeli.';
  if (!/[A-ZĞÜŞÖÇİ]/.test(password)) return 'Şifre en az bir büyük harf içermeli.';
  if (!/[0-9]/.test(password)) return 'Şifre en az bir rakam içermeli.';
  if (!/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ]/.test(password)) return 'Şifre en az bir özel karakter içermeli (*, ., , gibi).';
  return null;
}

function registerAuthIpc(ipcMain, { onLoginSuccess }) {
  ipcMain.on('login-attempt', async (event, { email, password }) => {
    try {
      const user = await userRepository.findByCredentials(email, password);
      if (user) {
        event.reply('login-success', user.rol);
        onLoginSuccess(user.rol, user.id, user.uyeId);
      } else {
        event.reply('login-failed', 'Geçersiz e-posta veya şifre.');
      }
    } catch (err) {
      // Yanlış şifre ile veritabanına hiç ulaşamama aynı mesajı göstermesin —
      // kullanıcı "şifremi mi yanlış yazdım" diye boşuna uğraşmasın.
      console.error('❌ Giriş hatası:', err.message);
      event.reply(
        'login-failed',
        'Veritabanı sunucusuna bağlanılamadı. Sunucu bilgisayarının açık ve aynı ağda olduğundan emin olun, sonra tekrar deneyin.'
      );
    }
  });

  ipcMain.on('register-attempt', async (event, { tcKimlikNo, dogumTarihi, email, password }) => {
    try {
      if (!tcKimlikNo || !dogumTarihi || !email || !password) {
        event.reply('register-failed', 'Lütfen tüm alanları doldurun.');
        return;
      }
      if (!EMAIL_REGEX.test(email.trim())) {
        event.reply('register-failed', 'Geçerli bir e-posta adresi girin.');
        return;
      }
      const sifreHatasi = passwordPolicyHatasi(password);
      if (sifreHatasi) {
        event.reply('register-failed', sifreHatasi);
        return;
      }

      const member = await userRepository.findClaimableMember(tcKimlikNo.trim(), dogumTarihi);
      if (!member) {
        event.reply(
          'register-failed',
          'T.C. Kimlik No ve doğum tarihi ile eşleşen bir üye bulunamadı, ya da bu üye için zaten bir hesap açılmış.'
        );
        return;
      }

      const emailKullaniliyor = await userRepository.emailExists(email.trim());
      if (emailKullaniliyor) {
        event.reply('register-failed', 'Bu e-posta adresi zaten kullanılıyor.');
        return;
      }

      await userRepository.createAccount(member.id, email.trim(), password);
      event.reply('register-success', { adsoyad: member.adsoyad, email: email.trim() });
    } catch (err) {
      console.error('❌ Kayıt hatası:', err.message);
      event.reply('register-failed', 'Hesap oluşturulurken bir hata oluştu: ' + err.message);
    }
  });

  ipcMain.on('reset-password-attempt', async (event, { tcKimlikNo, dogumTarihi, password }) => {
    try {
      if (!tcKimlikNo || !dogumTarihi || !password) {
        event.reply('reset-password-failed', 'Lütfen tüm alanları doldurun.');
        return;
      }
      const sifreHatasi = passwordPolicyHatasi(password);
      if (sifreHatasi) {
        event.reply('reset-password-failed', sifreHatasi);
        return;
      }

      const account = await userRepository.findAccountByIdentity(tcKimlikNo.trim(), dogumTarihi);
      if (!account) {
        event.reply('reset-password-failed', 'T.C. Kimlik No ve doğum tarihi ile eşleşen bir hesap bulunamadı.');
        return;
      }

      await userRepository.updatePassword(account.id, password);
      event.reply('reset-password-success', { adsoyad: account.adsoyad, email: account.email });
    } catch (err) {
      console.error('❌ Şifre sıfırlama hatası:', err.message);
      event.reply('reset-password-failed', 'Şifre güncellenirken bir hata oluştu: ' + err.message);
    }
  });
}

module.exports = registerAuthIpc;
