// Service worker kaydi + "Ana ekrana ekle" cubugu.
// Ayri dosyada, cunku helmet'in CSP'si (script-src 'self') sayfa icine gomulu
// <script> bloklarini engelliyor.

// ---------- 1) Service worker ----------
// Sadece https (veya localhost) uzerinde calisir — desteklemeyen tarayicida sessizce atlanir.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () {
            // Kayit basarisiz olsa da site normal calismaya devam eder; kullaniciyi rahatsiz etme.
        });
    });
}

// ---------- 2) "Ana ekrana ekle" cubugu ----------
// Cubuk TUM telefon tarayicilarinda gosterilir; butona basinca ne olacagi tarayicinin
// yetenegine gore degisir:
//   - 'beforeinstallprompt' veren tarayici (Chrome/Edge/Samsung Internet): sistemin
//     kendi kurulum penceresi acilir — uye hicbir menu aramak zorunda kalmaz.
//   - Vermeyen tarayici (iPhone'da HEPSI, Android'de Mi Browser/Firefox/uygulama ici
//     tarayicilar): kurulum programatik tetiklenemez, o yuzden o platforma uygun
//     adim adim anlatim penceresi acilir.
// Ilk surumde cubuk SADECE event gelince gosteriliyordu; Android'de Chrome disi bir
// tarayicida test edilince cubugun hic cikmadigi gorulduu (15 Eylul 2026), bu yuzden
// gosterim event'ten bagimsiz hale getirildi: event gelirse hemen, gelmezse kisa bir
// bekleme sonrasi cikar (bekleme, gelecekse event'in one gecip tek-dokunus yolunu
// acabilmesi icin).
(function () {
    var KAPATILDI_ANAHTARI = 'anaEkranaEkleGizlendi';

    var ua = navigator.userAgent || '';
    var iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var telefon = iOS || /Android/i.test(ua) || window.matchMedia('(max-width: 820px)').matches;

    // Zaten ana ekrana eklenmis ve oradan acilmissa cubugu gosterme.
    var kurulu = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (!telefon || kurulu) return;
    try {
        if (localStorage.getItem(KAPATILDI_ANAHTARI) === '1') return;
    } catch (e) {
        // localStorage kapali olabilir (gizli mod) — cubugu yine de goster.
    }

    var bekleyenPrompt = null;
    var cubuk = null;

    function cubuguKaldir() {
        if (cubuk && cubuk.parentNode) cubuk.parentNode.removeChild(cubuk);
        document.body.classList.remove('has-install-bar');
        cubuk = null;
    }

    function kalicalKapat() {
        try {
            localStorage.setItem(KAPATILDI_ANAHTARI, '1');
        } catch (e) {
            // sorun degil, en fazla bir dahaki acilista tekrar gorunur
        }
        cubuguKaldir();
    }

    // --- Anlatim penceresi (kurulumu kendi tetikleyemeyen tarayicilar icin) ---
    function anlatimPenceresiniAc() {
        var katman = document.createElement('div');
        katman.className = 'install-sheet';

        var kart = document.createElement('div');
        kart.className = 'install-sheet__card';

        var baslik = document.createElement('h3');
        baslik.className = 'install-sheet__title';
        baslik.textContent = 'Ana ekrana nasıl eklenir?';

        var altBaslik = document.createElement('p');
        altBaslik.className = 'install-sheet__sub';

        var adimlar = document.createElement('ol');
        adimlar.className = 'install-sheet__steps';

        var adim1 = document.createElement('li');
        adim1.appendChild(numara('1'));
        var metin1 = document.createElement('span');

        var adim2 = document.createElement('li');
        adim2.appendChild(numara('2'));

        var adim3 = document.createElement('li');
        adim3.appendChild(numara('3'));

        if (iOS) {
            altBaslik.textContent = 'iPhone bunu otomatik yapamıyor, üç küçük adım gerekiyor. Safari ile açmış olman gerekiyor.';
            // Paylas ikonunu da goster ki kullanici hangi butonu arayacagini bilsin.
            metin1.appendChild(document.createTextNode('Ekranın altındaki '));
            metin1.appendChild(paylasIkonu());
            metin1.appendChild(document.createTextNode(' Paylaş butonuna dokun.'));
            adim2.appendChild(metinSpan('Listeyi aşağı kaydır, "Ana Ekrana Ekle"ye dokun.'));
            adim3.appendChild(metinSpan('Sağ üstteki "Ekle" ile onayla. Hepsi bu!'));
        } else {
            // Android'de Chrome disi tarayicilar (Mi Browser, Firefox, WhatsApp/Instagram
            // ici tarayici...) kurulumu programatik tetiklemeye izin vermiyor. Menu simgesi
            // ve secenegin adi tarayiciya gore degistigi icin ikisi de alternatifleriyle yazildi.
            altBaslik.textContent = 'Kullandığın tarayıcı bunu otomatik yapamıyor, menüden eklemen gerekiyor.';
            metin1.appendChild(document.createTextNode('Tarayıcının menüsünü aç — ekranın köşesindeki ⋮ ya da ☰ simgesi.'));
            adim2.appendChild(metinSpan('"Ana ekrana ekle" seçeneğine dokun. (Bazı tarayıcılarda "Uygulamayı yükle" ya da "Sayfayı ekle" yazar.)'));
            adim3.appendChild(metinSpan('Çıkan pencerede "Ekle" ile onayla. Böyle bir seçenek yoksa sayfayı Chrome\'da açıp tekrar dene.'));
        }

        adim1.appendChild(metin1);
        adimlar.appendChild(adim1);
        adimlar.appendChild(adim2);
        adimlar.appendChild(adim3);

        var tamamBtn = document.createElement('button');
        tamamBtn.type = 'button';
        tamamBtn.className = 'install-sheet__ok';
        tamamBtn.textContent = 'Anladım';

        kart.appendChild(baslik);
        kart.appendChild(altBaslik);
        kart.appendChild(adimlar);
        kart.appendChild(tamamBtn);
        katman.appendChild(kart);
        document.body.appendChild(katman);

        function kapat() {
            if (katman.parentNode) katman.parentNode.removeChild(katman);
        }
        tamamBtn.addEventListener('click', function () {
            kapat();
            kalicalKapat();
        });
        katman.addEventListener('click', function (e) {
            if (e.target === katman) kapat();
        });
    }

    function numara(n) {
        var span = document.createElement('span');
        span.className = 'install-sheet__num';
        span.textContent = n;
        return span;
    }

    function metinSpan(metin) {
        var span = document.createElement('span');
        span.textContent = metin;
        return span;
    }

    // iOS Paylas ikonu (kutudan yukari cikan ok) — inline SVG, disaridan dosya cekmiyor.
    function paylasIkonu() {
        var NS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'install-sheet__icon');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');

        var kutu = document.createElementNS(NS, 'path');
        kutu.setAttribute('d', 'M8 11H6v9h12v-9h-2');
        var ok = document.createElementNS(NS, 'path');
        ok.setAttribute('d', 'M12 15V3');
        var okUcu = document.createElementNS(NS, 'path');
        okUcu.setAttribute('d', 'M8.5 6.5 12 3l3.5 3.5');

        svg.appendChild(kutu);
        svg.appendChild(ok);
        svg.appendChild(okUcu);
        return svg;
    }

    // --- Cubugu olustur ---
    function cubuguGoster() {
        if (cubuk) return;

        cubuk = document.createElement('div');
        cubuk.className = 'install-bar';
        cubuk.setAttribute('role', 'region');
        cubuk.setAttribute('aria-label', 'Ana ekrana ekle');

        var logo = document.createElement('img');
        logo.className = 'install-bar__logo';
        logo.src = '/icons/icon-192.png';
        logo.alt = '';

        var metinKutusu = document.createElement('div');
        metinKutusu.className = 'install-bar__text';

        var baslik = document.createElement('div');
        baslik.className = 'install-bar__title';
        baslik.textContent = 'Ana ekrana ekle';

        var alt = document.createElement('div');
        alt.className = 'install-bar__sub';
        alt.textContent = 'Adres yazmadan, tek dokunuşla aç.';

        metinKutusu.appendChild(baslik);
        metinKutusu.appendChild(alt);

        var ekleBtn = document.createElement('button');
        ekleBtn.type = 'button';
        ekleBtn.className = 'install-bar__add';
        ekleBtn.textContent = 'Ekle';

        var kapatBtn = document.createElement('button');
        kapatBtn.type = 'button';
        kapatBtn.className = 'install-bar__close';
        kapatBtn.setAttribute('aria-label', 'Kapat');
        kapatBtn.textContent = '×';

        cubuk.appendChild(logo);
        cubuk.appendChild(metinKutusu);
        cubuk.appendChild(ekleBtn);
        cubuk.appendChild(kapatBtn);
        document.body.appendChild(cubuk);
        document.body.classList.add('has-install-bar');

        kapatBtn.addEventListener('click', kalicalKapat);

        ekleBtn.addEventListener('click', function () {
            if (bekleyenPrompt) {
                // Android: sistemin kendi kurulum penceresi
                bekleyenPrompt.prompt();
                bekleyenPrompt.userChoice
                    .then(function (secim) {
                        // Reddederse cubugu bir daha gostermeyelim, israrci olmayalim.
                        if (secim && secim.outcome === 'dismissed') kalicalKapat();
                        else cubuguKaldir();
                    })
                    .catch(cubuguKaldir);
                bekleyenPrompt = null;
            } else {
                // Kurulumu kendi tetikleyemeyen tarayicilar: adim adim anlatim
                anlatimPenceresiniAc();
            }
        });
    }

    // "Bu site kurulabilir" sinyali — sadece bazi tarayicilar verir (Chrome, Edge,
    // Samsung Internet). Geldiginde beklemeyi iptal edip cubugu hemen gosteriyoruz;
    // artik buton tek dokunusla kurabilir.
    window.addEventListener('beforeinstallprompt', function (event) {
        // Tarayicinin kendi otomatik banner'ini bastir, kontrolu bizim butona verelim.
        event.preventDefault();
        bekleyenPrompt = event;
        clearTimeout(gecikmeliGosterim);
        cubuguGoster();
    });

    // Kurulum tamamlaninca cubuk anlamsizlasir.
    window.addEventListener('appinstalled', function () {
        bekleyenPrompt = null;
        kalicalKapat();
    });

    // Sinyal gelmezse de cubuk cikmali (iPhone'da hicbir zaman gelmez; Android'de de
    // Chrome disi tarayicilarda gelmez). Kisa bekleme, sinyal gelecekse one gecip
    // tek-dokunus yolunu acabilmesi icin.
    var gecikmeliGosterim = setTimeout(function () {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', cubuguGoster);
        } else {
            cubuguGoster();
        }
    }, 2000);
})();
