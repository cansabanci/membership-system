const userRepository = require('../db/repositories/userRepository');

function registerAuthIpc(ipcMain, { onLoginSuccess }) {
  ipcMain.on('login-attempt', async (event, { email, password }) => {
    try {
      const user = await userRepository.findByCredentials(email, password);
      if (user) {
        event.reply('login-success', user.rol);
        onLoginSuccess(user.rol);
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
}

module.exports = registerAuthIpc;
