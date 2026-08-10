const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain } = require('electron');
const sql = require('mssql');
// Uygulama paketli mi kontrol et
const isPackaged = app ? app.isPackaged : false;

const envPath = isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '.env');

require('dotenv').config({ path: envPath });
// 🧪 .env verilerini test edelim
console.log("🧪 ENV test →", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  pass: process.env.DB_PASS,
  db: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// 📌 MSSQL Bağlantı Ayarları
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),
  options: {
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// 📌 MSSQL Bağlantısı
let pool;
async function connectToDatabase() {
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ MSSQL veritabanına bağlanıldı.');
  } catch (err) {
    console.error('❌ MSSQL bağlantı hatası:', err.message);
  }
}

let mainWindow;
let loginWindow;
const userDataPath = app.getPath("userData");
const photosDir = path.join(userDataPath, 'photos');
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true });
}


// 📌 Login Penceresi
function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 400,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: false
  });
  loginWindow.loadFile('login.html');
}

// 📌 Ana Pencere
function createMainWindow(role) {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile('index.html');
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('set-role', role);
  });
}

app.whenReady().then(async () => {
  if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir);
  await connectToDatabase();
  createLoginWindow();
});

// 📌 Login
ipcMain.on('login-attempt', (event, { email, password }) => {
  const users = [
    { email: 'admin@gmail.com', password: 'admin123', role: 'admin' },
    { email: 'viewer@gmail.com', password: 'viewer123', role: 'viewer' }
  ];
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    event.reply('login-success', user.role);
    loginWindow.close();
    createMainWindow(user.role);
  } else {
    event.reply('login-failed');
  }
});

// 📌 Üye Ekleme
ipcMain.on('add-member', async (event, member) => {
  try {
    let photoPath = null;
    if (member.photo) {
      const base64Data = member.photo.replace(/^data:image\/\w+;base64,/, "");
      const ext = member.photo.match(/data:image\/(\w+);base64,/)[1];
      const fileName = `${Date.now()}.${ext}`;
      const newFilePath = path.join(photosDir, fileName);
      fs.writeFileSync(newFilePath, Buffer.from(base64Data, 'base64'));
      console.log("\ud83d\udcf8 Foto\u011fraf kaydedildi:", newFilePath);
      photoPath = `photos/${fileName}`;
    }

    // Veritabanına ekle
    const result = await pool.request()
      .input('adsoyad', sql.NVarChar, member.adsoyad)
      .input('bolum', sql.NVarChar, member.bolum)
      .input('mezuniyet', sql.NVarChar, member.mezuniyet)
      .input('bursMiktar', sql.Int, member.bursMiktar)
      .input('bursTip', sql.NVarChar, member.bursTip)
      .input('photo', sql.NVarChar, photoPath)
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

    const uyeId = result.recordset[0].id;

    // Aidatları ekle
    for (const a of member.aidatlar) {
      await pool.request()
        .input('uye_id', sql.Int, uyeId)
        .input('donem', sql.NVarChar, a.donem)
        .input('odendi', sql.Int, a.odendi)
        .query(`INSERT INTO aidatlar (uye_id, donem, odendi) VALUES (@uye_id, @donem, @odendi)`);
    }

    // 👇 UI'de gösterilecek cevap
    const fullPhotoPath = photoPath ? `file://${path.join(photosDir, path.basename(photoPath))}` : null;

    const replyMember = {
      ...member,
      id: uyeId,
      photo: fullPhotoPath,
      donemler: member.aidatlar.map(a => a.donem),
      donemler_odendi: member.aidatlar.map(a => a.odendi ? "✅" : "❌"),
      aidatlar: member.aidatlar
    };

    event.reply('member-added', replyMember);

  } catch (err) {
    console.error("❌ MSSQL insert hatası:", err.message);
  }
});



// 📌 Üye Güncelleme
ipcMain.on('update-member', async (event, member) => {
  try {
    let newPhotoPath = null;

  if (member.photo && member.photo.startsWith("data:image/")) {
  const base64Data = member.photo.replace(/^data:image\/\w+;base64,/, "");
  const ext = member.photo.match(/data:image\/(\w+);base64,/)[1];
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${ext}`;
  newPhotoPath = path.join(photosDir, fileName);
  fs.writeFileSync(newPhotoPath, Buffer.from(base64Data, "base64"));
     }


    // SQL UPDATE sorgusu (fotoğraf varsa ekle)
    const updateQuery = `UPDATE uyeler SET
      adsoyad=@adsoyad, bolum=@bolum, mezuniyet=@mezuniyet, bursMiktar=@bursMiktar,
      bursTip=@bursTip, email=@email, telefon=@telefon, isyeri=@isyeri, meslek=@meslek,
      pozisyon=@pozisyon, sehir=@sehir, uyelikGiris=@uyelikGiris, uyelikCikis=@uyelikCikis
      ${newPhotoPath ? ", photo=@photo" : ""}
      WHERE id=@id`;

    const req = pool.request()
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
      .input('uyelikCikis', sql.NVarChar, member.uyelikCikis)
      .input('id', sql.Int, member.id);

    if (newPhotoPath) {
      req.input('photo', sql.NVarChar, `photos/${path.basename(newPhotoPath)}`);
    }

    await req.query(updateQuery);

    // Aidatları sıfırla ve yeniden ekle
    await pool.request().input('uye_id', sql.Int, member.id).query(`DELETE FROM aidatlar WHERE uye_id = @uye_id`);
    for (const a of member.aidatlar) {
      await pool.request()
        .input('uye_id', sql.Int, member.id)
        .input('donem', sql.NVarChar, a.donem)
        .input('odendi', sql.Int, a.odendi)
        .query(`INSERT INTO aidatlar (uye_id, donem, odendi) VALUES (@uye_id, @donem, @odendi)`);
    }

    // Frontend’e geri dönecek nesne (fotoğraf varsa file:// ile tam yol)
    const updated = {
      ...member,
      photo: newPhotoPath ? `file://${path.join(photosDir, path.basename(newPhotoPath))}` : member.photo,
      donemler: member.aidatlar.map(a => a.donem),
      donemler_odendi: member.aidatlar.map(a => a.odendi ? "✅" : "❌"),
      aidatlar: member.aidatlar
    };

    event.reply('member-updated', updated);

  } catch (err) {
    console.error("❌ Update hatası:", err);
  }
});


// 📌 Üye yükleme
ipcMain.on('load-members', async (event) => {
  try {
    const uyeler = await pool.request().query(`SELECT * FROM uyeler`);
    const members = uyeler.recordset;

    for (const uye of members) {
      // 📷 Fotoğraf yolu tam değilse düzenle
      if (uye.photo) {
        uye.photo = `file://${path.join(photosDir, path.basename(uye.photo))}`;
      }

      const aidatlar = await pool.request()
        .input('uye_id', sql.Int, uye.id)
        .query(`SELECT * FROM aidatlar WHERE uye_id = @uye_id`);

      uye.donemler = aidatlar.recordset.map(a => a.donem);
      uye.donemler_odendi = aidatlar.recordset.map(a => a.odendi ? "✅" : "❌");
      uye.aidatlar = aidatlar.recordset;
    }

    event.reply('members-loaded', members);
  } catch (err) {
    console.error("❌ Yükleme hatası:", err);
  }
});

// Üye silme
ipcMain.on('delete-member', async (event, memberId) => {
  try {
    const row = await pool.request()
      .input('id', sql.Int, memberId)
      .query(`SELECT photo FROM uyeler WHERE id = @id`);

    if (row.recordset.length && row.recordset[0].photo) {
      const filePath = path.join(__dirname, row.recordset[0].photo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.request().input('id', sql.Int, memberId).query(`DELETE FROM aidatlar WHERE uye_id = @id`);
    await pool.request().input('id', sql.Int, memberId).query(`DELETE FROM uyeler WHERE id = @id`);

    event.reply('member-deleted', { success: true, id: memberId });

  } catch (err) {
    console.error("❌ Silme hatası:", err);
  }
});

const { exportToExcelAndUpload } = require('./google/exportToExcel');

let isQuitting = false;

app.on('before-quit', async (e) => {
  if (isQuitting) return;
  e.preventDefault();
  isQuitting = true;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("show-backup-message");
  }

  try {
    console.log("📤 Excel yedeği oluşturuluyor ve Drive'a yükleniyor...");
    await exportToExcelAndUpload();
    console.log("✅ Yedekleme tamamlandı.");
  } catch (err) {
    console.error("❌ Yedekleme hatası:", err);
  } finally {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("hide-backup-message");
    }
    app.quit();
  }
});
