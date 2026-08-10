const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain } = require('electron');

const paths = require('./paths');
require('dotenv').config({ path: paths.envPath });

const db = require('./db/pool');
const { runMigrations } = require('./db/migrate');
const registerAuthIpc = require('./ipc/auth.ipc');
const registerMembersIpc = require('./ipc/members.ipc');
const { runBackup } = require('./services/backup.service');
const { startBackupScheduler, stopBackupScheduler } = require('./services/backupScheduler.service');

const RENDERER_DIR = path.join(__dirname, '..', 'renderer');

let mainWindow;
let loginWindow;
let isQuitting = false;

const userDataPath = app.getPath('userData');
const photosDir = path.join(userDataPath, 'photos');
if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 400,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    resizable: false,
  });
  loginWindow.loadFile(path.join(RENDERER_DIR, 'login.html'));
}

function createMainWindow(role) {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile(path.join(RENDERER_DIR, 'index.html'));
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('set-role', role);
  });
}

app.whenReady().then(async () => {
  try {
    await db.connect();
    await runMigrations();
  } catch (err) {
    console.error('❌ Başlangıç hatası (DB bağlantısı / migration):', err.message);
  }

  registerAuthIpc(ipcMain, {
    onLoginSuccess: (role) => {
      loginWindow.close();
      createMainWindow(role);
    },
  });
  registerMembersIpc(ipcMain, { photosDir });

  startBackupScheduler();
  createLoginWindow();
});

app.on('before-quit', async (e) => {
  if (isQuitting) return;
  e.preventDefault();
  isQuitting = true;
  stopBackupScheduler();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('show-backup-message');
  }

  try {
    console.log("📤 Excel yedeği oluşturuluyor ve Drive'a yükleniyor...");
    await runBackup();
    console.log('✅ Yedekleme tamamlandı.');
  } catch (err) {
    console.error('❌ Yedekleme hatası:', err.message);
  } finally {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hide-backup-message');
    }
    app.quit();
  }
});
