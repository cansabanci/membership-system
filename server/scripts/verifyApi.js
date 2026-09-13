// Faz 1 API'sinin uctan uca dogrulama scripti — henuz bir web arayuzu olmadigi icin bu,
// gercek kabul testimiz. Gercek Turhost DB'sine karsi calisir, kendi etiketli (tag'li) test
// verisini olusturur ve `finally` icinde temizler. Calistirmak icin: npm run server:verify
const path = require('path');
const { spawn } = require('child_process');
const bcrypt = require('bcryptjs');

const config = require('../config/env');
const db = require('../../src/main/db/pool');
const { sql } = db;
const { runMigrations } = require('../../src/main/db/migrate');
const memberRepository = require('../../src/main/db/repositories/memberRepository');

const TEST_PORT = 4123;
const DOWN_PORT = 4124;
const BASE = `http://localhost:${TEST_PORT}`;
const DOWN_BASE = `http://localhost:${DOWN_PORT}`;

const TAG = '__API_VERIFY_TEST__';
const TC_KIMLIK = '00000000001';
const ADMIN_EMAIL = 'verify_admin@__test__.local';
const VIEWER_EMAIL = 'verify_viewer@__test__.local';
const TEST_PASSWORD = 'Verify1234!*';
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  ❌ ${label}`);
  }
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function mergeSetCookies(jar, response) {
  const raw = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  for (const line of raw) {
    const pair = line.split(';')[0];
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    jar[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
}

async function api(base, method, urlPath, { jar = {}, csrfToken, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const cookieStr = cookieHeader(jar);
  if (cookieStr) headers.Cookie = cookieStr;
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

  const response = await fetch(`${base}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  mergeSetCookies(jar, response);
  let json = null;
  try {
    json = await response.json();
  } catch {
    // JSON olmayan govde (ornegin foto stream'i) - sorun degil
  }
  return { status: response.status, json, headers: response.headers };
}

function waitForReady(base, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = async () => {
      try {
        await fetch(`${base}/api/auth/me`);
        resolve();
      } catch (err) {
        if (Date.now() > deadline) return reject(new Error(`Sunucu ${base} adresinde zamaninda ayaga kalkmadi.`));
        setTimeout(tryOnce, 300);
      }
    };
    tryOnce();
  });
}

function spawnServer(extraEnv) {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], {
    env: { ...process.env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (d) => (output += d.toString()));
  child.stderr.on('data', (d) => (output += d.toString()));
  child.getOutput = () => output;
  return child;
}

function killServer(child) {
  return new Promise((resolve) => {
    if (!child || child.killed || child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill();
  });
}

async function main() {
  await db.connect();
  await runMigrations();
  const pool = db.getPool();

  let uyeId = null;
  let adminUserId = null;
  let viewerUserId = null;
  let mainServer = null;
  let downServer = null;
  let photoFilename = null;
  let newMemberId = null;

  try {
    // ---------- Setup: onceki bir crash'ten kalan test verisini temizle ----------
    await pool.request().input('tc', sql.NVarChar, TC_KIMLIK).query('DELETE FROM uye_notlari WHERE uye_id IN (SELECT id FROM uyeler WHERE tcKimlikNo=@tc)');
    await pool.request().input('tc', sql.NVarChar, TC_KIMLIK).query('DELETE FROM uye_gecmisi WHERE uye_id IN (SELECT id FROM uyeler WHERE tcKimlikNo=@tc)');
    await pool.request().input('tc', sql.NVarChar, TC_KIMLIK).query('DELETE FROM aidatlar WHERE uye_id IN (SELECT id FROM uyeler WHERE tcKimlikNo=@tc)');
    await pool
      .request()
      .input('e1', sql.NVarChar, ADMIN_EMAIL)
      .input('e2', sql.NVarChar, VIEWER_EMAIL)
      .query('DELETE FROM kullanicilar WHERE email=@e1 OR email=@e2');
    await pool.request().input('tc', sql.NVarChar, TC_KIMLIK).query('DELETE FROM uyeler WHERE tcKimlikNo=@tc');

    // ---------- Setup: test uyesi + admin/viewer hesaplari ----------
    uyeId = await memberRepository.insertMember({
      adsoyad: TAG,
      bolum: 'Test Bölümü',
      mezuniyet: '2020',
      bursMiktar: 0,
      bursTip: null,
      photo: null,
      email: 'once@example.com',
      telefon: '5550000000',
      isyeri: null,
      meslek: null,
      sehir: 'Mersin',
      uyelikGiris: '2020-01-01',
      uyelikCikis: null,
      tcKimlikNo: TC_KIMLIK,
      cinsiyet: 'K',
      dogumTarihi: '1990-01-01',
      ogrenimDurumu: 'Lisans',
      uyeNiteligi: 'Asil',
      uyeTur: 'Normal',
      onursalUye: false,
      durum: 'Aktif',
      yonetimKuruluKararTarihi: null,
      pasifOlmaNedeni: null,
      pasifOlmaBildirimTarihi: null,
    });
    await memberRepository.replaceAidatlar(uyeId, [{ donem: '2023-2024', odendi: 1 }]);

    const adminHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const adminResult = await pool
      .request()
      .input('email', sql.NVarChar, ADMIN_EMAIL)
      .input('password', sql.NVarChar, adminHash)
      .query(`INSERT INTO kullanicilar (email, password, rol, uye_id) OUTPUT INSERTED.id VALUES (@email, @password, 'admin', NULL)`);
    adminUserId = adminResult.recordset[0].id;

    const viewerHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const viewerResult = await pool
      .request()
      .input('email', sql.NVarChar, VIEWER_EMAIL)
      .input('password', sql.NVarChar, viewerHash)
      .input('uye_id', sql.Int, uyeId)
      .query(`INSERT INTO kullanicilar (email, password, rol, uye_id) OUTPUT INSERTED.id VALUES (@email, @password, 'viewer', @uye_id)`);
    viewerUserId = viewerResult.recordset[0].id;

    // ---------- Ana test sunucusunu baslat ----------
    mainServer = spawnServer({ PORT: String(TEST_PORT) });
    await waitForReady(BASE);
    console.log(`\nAna test sunucusu ${BASE} adresinde hazir.\n`);

    // 1. Oturumsuz erisim
    console.log('1) Oturumsuz erisim');
    const r1 = await api(BASE, 'GET', '/api/auth/me');
    check('GET /api/auth/me oturumsuz -> 401', r1.status === 401);

    // 2. Yanlis sifre
    console.log('2) Yanlis sifre ile giris');
    const r2 = await api(BASE, 'POST', '/api/auth/login', { body: { email: ADMIN_EMAIL, password: 'yanlisSifre123!' } });
    check('POST /api/auth/login yanlis sifre -> 401', r2.status === 401);
    check('Hata mesaji tam eslesiyor', r2.json && r2.json.error === 'Geçersiz e-posta veya şifre.');

    // 3. Simule DB kopuklugu (127.0.0.1:1 -> aninda ECONNREFUSED, DNS'e bagli degil)
    console.log('3) Simule DB kopuklugu');
    downServer = spawnServer({ PORT: String(DOWN_PORT), DB_HOST: '127.0.0.1', DB_PORT: '1' });
    await waitForReady(DOWN_BASE, 15000);
    const r3 = await api(DOWN_BASE, 'POST', '/api/auth/login', { body: { email: ADMIN_EMAIL, password: TEST_PASSWORD } });
    check('DB kopukken login -> 503', r3.status === 503);
    check(
      'DB kopuk hata mesaji tam eslesiyor',
      r3.json &&
        r3.json.error ===
          'Veritabanı sunucusuna bağlanılamadı. Sunucu bilgisayarının açık ve aynı ağda olduğundan emin olun, sonra tekrar deneyin.'
    );
    await killServer(downServer);
    downServer = null;

    // 4. Admin girisi
    console.log('4) Admin girisi');
    const adminJar = {};
    const r4 = await api(BASE, 'POST', '/api/auth/login', { jar: adminJar, body: { email: ADMIN_EMAIL, password: TEST_PASSWORD } });
    check('Admin login -> 200', r4.status === 200);
    check('Admin rol dogru', r4.json && r4.json.rol === 'admin');
    let adminCsrf = r4.json && r4.json.csrfToken;
    check('CSRF token alindi', !!adminCsrf);

    // 5. Admin uye ekler (fotografli)
    console.log('5) Admin uye ekliyor (fotografli)');
    const r5 = await api(BASE, 'POST', '/api/members', {
      jar: adminJar,
      csrfToken: adminCsrf,
      body: { adsoyad: `${TAG}_YENI`, bolum: 'Bilgisayar Müh.', mezuniyet: '2021', photo: TINY_PNG, aidatlar: [{ donem: '2024-2025', odendi: 0 }] },
    });
    check('POST /api/members -> 200', r5.status === 200);
    newMemberId = r5.json && r5.json.id;
    check('Yeni uye id donduruldu', !!newMemberId);
    check('Foto alani /api/photos/ ile basliyor (file:// degil)', !!r5.json && typeof r5.json.photo === 'string' && r5.json.photo.startsWith('/api/photos/'));
    photoFilename = r5.json && r5.json.photo ? r5.json.photo.split('/').pop() : null;

    // 6. Admin uye listesini goruyor
    console.log('6) Admin uye listesi');
    const r6 = await api(BASE, 'GET', '/api/members', { jar: adminJar });
    check('GET /api/members -> 200', r6.status === 200);
    check('Liste dizi', Array.isArray(r6.json));
    const listed = r6.json && r6.json.find((m) => m.id === newMemberId);
    check('Yeni uye listede var', !!listed);

    // 7. Admin uyeyi gunceller
    console.log('7) Admin uye guncelliyor');
    const r7 = await api(BASE, 'PUT', `/api/members/${newMemberId}`, {
      jar: adminJar,
      csrfToken: adminCsrf,
      body: { adsoyad: `${TAG}_GUNCEL`, bolum: 'Endüstri Müh.', mezuniyet: '2021', aidatlar: [{ donem: '2024-2025', odendi: 1 }] },
    });
    check('PUT /api/members/:id -> 200', r7.status === 200);
    check('Ad guncellendi', r7.json && r7.json.adsoyad === `${TAG}_GUNCEL`);

    // 8. Admin degisikligi geri aliyor
    console.log('8) Admin rollback');
    const r8 = await api(BASE, 'POST', `/api/members/${newMemberId}/rollback`, { jar: adminJar, csrfToken: adminCsrf });
    check('POST rollback -> 200', r8.status === 200);
    check('Ad eski haline dondu', r8.json && r8.json.adsoyad === `${TAG}_YENI`);

    // 9. Fotograf servis testi
    console.log('9) Fotograf servisi (kimlik dogrulamali)');
    if (photoFilename) {
      const r9a = await api(BASE, 'GET', `/api/photos/${photoFilename}`, { jar: adminJar });
      check('Cookie ile foto -> 200', r9a.status === 200);
      const r9b = await api(BASE, 'GET', `/api/photos/${photoFilename}`, {});
      check('Cookiesiz foto -> 401', r9b.status === 401);
    } else {
      check('Foto dosya adi cozulemedi (atlanan test)', false);
    }

    // 10. Admin cikis yapar, eski cookie ile erisim denenir
    console.log('10) Admin cikis');
    const r10a = await api(BASE, 'POST', '/api/auth/logout', { jar: adminJar, csrfToken: adminCsrf });
    check('Logout -> 200', r10a.status === 200);
    const r10b = await api(BASE, 'GET', '/api/auth/me', { jar: adminJar });
    check('Cikis sonrasi eski cookie ile /me -> 401', r10b.status === 401);

    // 11. Viewer girisi
    console.log('11) Viewer girisi');
    const viewerJar = {};
    const r11 = await api(BASE, 'POST', '/api/auth/login', { jar: viewerJar, body: { email: VIEWER_EMAIL, password: TEST_PASSWORD } });
    check('Viewer login -> 200', r11.status === 200);
    check('Viewer rol dogru', r11.json && r11.json.rol === 'viewer');
    check('Viewer uyeId dogru', r11.json && r11.json.uyeId === uyeId);
    let viewerCsrf = r11.json && r11.json.csrfToken;

    // 12. Viewer yetki sinirlari
    console.log('12) Viewer yetki sinirlari');
    const r12a = await api(BASE, 'GET', '/api/members', { jar: viewerJar });
    check('Viewer GET /api/members -> 200 (herkes listeyi gorebiliyor)', r12a.status === 200);
    const r12b = await api(BASE, 'POST', '/api/members', { jar: viewerJar, csrfToken: viewerCsrf, body: { adsoyad: 'X' } });
    check('Viewer POST /api/members -> 403', r12b.status === 403);
    const r12c = await api(BASE, 'DELETE', `/api/members/${newMemberId}`, { jar: viewerJar, csrfToken: viewerCsrf });
    check('Viewer DELETE /api/members/:id -> 403', r12c.status === 403);

    // 13. Viewer kendi profilini goruyor
    console.log('13) Viewer profil goruntuleme');
    const r13 = await api(BASE, 'GET', '/api/profile', { jar: viewerJar });
    check('GET /api/profile -> 200', r13.status === 200);
    check('Profil dogru uyeye ait', r13.json && r13.json.id === uyeId);

    // 14. KRITIK: whitelist disi alan smuggling denemesi
    console.log('14) Whitelist disi alan smuggling denemesi (guvenlik testi)');
    const r14 = await api(BASE, 'PUT', '/api/profile', {
      jar: viewerJar,
      csrfToken: viewerCsrf,
      body: { telefon: '5551234567', durum: 'Pasif', bursMiktar: 999999, tcKimlikNo: '99999999999' },
    });
    check('PUT /api/profile (smuggling ile) -> 200', r14.status === 200);
    const r14b = await api(BASE, 'GET', '/api/profile', { jar: viewerJar });
    check('İzinli alan (telefon) degisti', r14b.json && r14b.json.telefon === '5551234567');
    check('Whitelist disi alan (durum) DEGISMEDI', r14b.json && r14b.json.durum === 'Aktif');
    check('Whitelist disi alan (bursMiktar) DEGISMEDI', r14b.json && Number(r14b.json.bursMiktar) !== 999999);
    check('Whitelist disi alan (tcKimlikNo) DEGISMEDI', r14b.json && r14b.json.tcKimlikNo === TC_KIMLIK);

    // 15. Notlar
    console.log('15) Not yazma/okuma');
    const r15a = await api(BASE, 'PUT', `/api/members/${uyeId}/note`, { jar: viewerJar, csrfToken: viewerCsrf, body: { metin: 'test notu' } });
    check('PUT not -> 200', r15a.status === 200);
    const r15b = await api(BASE, 'GET', `/api/members/${uyeId}/note`, { jar: viewerJar });
    check('GET not -> 200, metin dogru', r15b.status === 200 && r15b.json && r15b.json.metin === 'test notu');

    // 16. CSRF zorunlulugu
    console.log('16) CSRF token zorunlulugu');
    const r16a = await api(BASE, 'PUT', '/api/profile', { jar: viewerJar, body: { telefon: '5559999999' } });
    check('CSRF token olmadan PUT -> 403', r16a.status === 403);
    const r16b = await api(BASE, 'PUT', '/api/profile', { jar: viewerJar, csrfToken: viewerCsrf, body: { telefon: '5559999999' } });
    check('Dogru CSRF token ile PUT -> 200', r16b.status === 200);

    console.log(`\nToplam: ${passed} basarili, ${failed} basarisiz.\n`);
    if (failed > 0) {
      console.log('Basarisiz kontroller:', failures.join(', '));
    }
  } finally {
    await killServer(mainServer);
    await killServer(downServer);

    // ---------- Cleanup ----------
    try {
      if (uyeId) {
        await pool.request().input('uye_id', sql.Int, uyeId).query('DELETE FROM uye_notlari WHERE uye_id=@uye_id');
        await pool.request().input('uye_id', sql.Int, uyeId).query('DELETE FROM uye_gecmisi WHERE uye_id=@uye_id');
      }
      if (newMemberId) {
        await pool.request().input('uye_id', sql.Int, newMemberId).query('DELETE FROM uye_gecmisi WHERE uye_id=@uye_id');
      }
      if (adminUserId) await pool.request().input('id', sql.Int, adminUserId).query('DELETE FROM kullanicilar WHERE id=@id');
      if (viewerUserId) await pool.request().input('id', sql.Int, viewerUserId).query('DELETE FROM kullanicilar WHERE id=@id');
      if (uyeId) await memberRepository.deleteMember(uyeId);
      if (newMemberId) await memberRepository.deleteMember(newMemberId);

      if (photoFilename) {
        const fs = require('fs');
        const filePath = path.join(config.PHOTOS_DIR, photoFilename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      console.log('Test verisi temizlendi.');
    } catch (cleanupErr) {
      console.error('⚠️ Temizlik sirasinda hata:', cleanupErr.message);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('❌ Doğrulama scripti çöktü:', err);
  process.exit(1);
});
