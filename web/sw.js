// Ana ekrana eklenen kisayolun "gercek uygulama gibi" (adres cubugu olmadan) acilabilmesi
// icin Android Chrome bir service worker sarti ariyor. Bu dosya BILEREK minimal:
// hicbir sey onbellege ALMIYOR, hicbir istegi degistirmiyor — sadece varligiyla
// kurulabilirlik sartini karsiliyor. Onbellek olsaydi, uye/oturum verisi bayatlayabilirdi.

self.addEventListener('install', () => {
  // Yeni surumu bekletmeden devreye al (eski sw sayfada asili kalmasin).
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch dinleyicisi var ama respondWith CAGRILMIYOR: tarayici her istegi
// her zamanki gibi, dogrudan agdan yapar. Davranis degisikligi yok.
self.addEventListener('fetch', () => {});
