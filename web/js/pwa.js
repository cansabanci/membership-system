// Service worker kaydi. Ayri dosyada, cunku helmet'in CSP'si (script-src 'self')
// sayfa icine gomulu <script> bloklarini engelliyor.
// Sadece https (veya localhost) uzerinde calisir — desteklemeyen tarayicida sessizce atlanir.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {
      // Kayit basarisiz olsa da site normal calismaya devam eder; kullaniciyi rahatsiz etme.
    });
  });
}
