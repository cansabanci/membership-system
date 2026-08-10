const userRepository = require('../db/repositories/userRepository');

function registerAuthIpc(ipcMain, { onLoginSuccess }) {
  ipcMain.on('login-attempt', async (event, { email, password }) => {
    try {
      const user = await userRepository.findByCredentials(email, password);
      if (user) {
        event.reply('login-success', user.rol);
        onLoginSuccess(user.rol);
      } else {
        event.reply('login-failed');
      }
    } catch (err) {
      console.error('❌ Giriş hatası:', err.message);
      event.reply('login-failed');
    }
  });
}

module.exports = registerAuthIpc;
