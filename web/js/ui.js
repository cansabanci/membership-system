// apiFetch, js/api.js tarafından bu sayfada zaten tanımlanıyor (script'ler aynı üst düzey kapsamı paylaşır).

// Tarih/yıl doğrulamasında members.js ile paylaşılan sabitler
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1959;

// Electron'daki gibi rolü senkron bir URL parametresinden okuyamıyoruz (loadFile({query})
// mekanizması web'de yok) — gerçek değer aşağıdaki oturum bootstrap'i ile async gelecek.
// Bootstrap bitene kadar en kısıtlı varsayımla (viewer) başlanır.
let currentUserRole = 'viewer';
let currentUyeId = null;

// 'app-ready' dispatch edilmeden ONCE members.js/profile.js zaten calisip dinleyicilerini
// eklemis olabilir (script yuklemesi ile /api/auth/me'nin ne kadar surdugu ag kosullarina
// gore degisir, bu yuzden "script sirasi -> event sirasi" varsayimina guvenilemez). Bu bayrak +
// yardimci fonksiyon, event kacsa bile (once/sonra fark etmeksizin) dogru calismasini saglar.
window.__appReady = false;
function onAppReady(fn) {
    if (window.__appReady) fn();
    else window.addEventListener('app-ready', fn);
}

function applyRolePermissions() {
    const isViewer = currentUserRole === 'viewer';
    document.body.classList.toggle('role-viewer', isViewer);

    // #memberFormPanel (Kaydet/Güncelle butonları dahil) viewer için zaten CSS ile tamamen
    // gizleniyor (body.role-viewer #memberFormPanel { display:none }), o yüzden bu döngü ona
    // dokunmuyor — aksi halde her tetiklendiğinde editMember()/resetForm()'un ayarladığı
    // Kaydet/Güncelle görünürlüğünü sıfırlayıp düzenleme sırasında butonları karıştırabiliyordu.
    // Arama/filtre alanları (toolbar), kişisel not özelliği ve tablo içindeki kontroller
    // (aidat dönemi seçici, Detaylar/Düzenle/Sil zaten CSS ile gizleniyor) her rolde açık kalır.
    document.querySelectorAll('input, select, textarea, button').forEach((el) => {
        if (
            el.closest('.toolbar') ||
            el.closest('#noteModal') ||
            el.closest('#photoModal') ||
            el.closest('#memberTable') ||
            el.closest('thead') ||
            el.closest('#memberFormPanel') ||
            el.closest('#viewerProfileCard') ||
            el.closest('.toggle-member-list') ||
            el.closest('.topbar-actions') ||
            el.classList.contains('btn-note')
        ) {
            return;
        }

        if (el.tagName === 'BUTTON') {
            el.style.display = isViewer ? 'none' : '';
        } else {
            el.disabled = isViewer;
        }
    });

    document.querySelectorAll('.fa-edit, .fa-trash').forEach((icon) => {
        icon.style.display = isViewer ? 'none' : '';
    });

    const listPanelSub = document.getElementById('listPanelSub');
    if (listPanelSub) {
        listPanelSub.textContent = isViewer ? 'Üyeleri isme göre arayın.' : 'Üyeleri arayın, aidat durumuna göre filtreleyin.';
    }

    // Viewer (üye) tarafında "Üye Kayıt Sistemi" başlığı yerine sadece dernek adı görünür,
    // ve bu başlık admin'in özelleştirdiği (localStorage'daki) başlıktan etkilenmez/düzenlenemez.
    const editableTitle = document.getElementById('editableTitle');
    if (editableTitle) {
        if (isViewer) {
            editableTitle.textContent = 'Mersin ODTÜ Mezunları Derneği';
            editableTitle.contentEditable = 'false';
        } else {
            editableTitle.contentEditable = 'true';
        }
    }

    // Pencere/görev çubuğu başlığı (işletim sisteminin gösterdiği başlık, sayfa içi başlıktan ayrı)
    document.title = isViewer ? 'Mersin ODTÜ Mezunları Derneği' : 'Üye Kayıt Sistemi';
}

// Tarih alanının yıl segmentine sınırsız rakam yazılmasını (ör. "20000000") engelle.
// Not: Chromium tek haneli/eksik girişte bile anlık olarak badInput=true verebiliyor
// (bir sonraki hane yazılınca kendiliğinden düzeliyor) — bu yüzden her yazışta değil,
// sadece kullanıcı alandan çıktığında (blur) kontrol ediyoruz. Böylece hem normal
// yazmayı engellemiyoruz hem de taşan/geçersiz bir değer alanda kalıcı olamıyor.
function enforceDateBounds(input) {
    input.addEventListener('blur', () => {
        if (input.validity.badInput || input.validity.rangeOverflow || input.validity.rangeUnderflow) {
            input.value = '';
            showErrorBanner(`Geçersiz tarih girişi temizlendi. Yıl ${input.min.slice(0, 4)} ile ${input.max.slice(0, 4)} arasında olmalı.`);
        }
    });
}

function saveTitle() {
    const newTitle = document.getElementById('editableTitle').innerText.trim();
    if (newTitle) {
        localStorage.setItem('uygulamaBasligi', newTitle);
    }
}

// Bölüm listesini doldur (hem admin formundaki #department hem profil kartındaki
// #profileDepartment için — ikisi de aynı listeyi kullanır)
function populateDepartmentSelect(select) {
    const allDepartments = window.__odtuDepartments || [];
    allDepartments.forEach((department) => {
        const option = document.createElement('option');
        option.value = department;
        option.textContent = department;
        select.appendChild(option);
    });

    const otherOption = document.createElement('option');
    otherOption.value = 'custom';
    otherOption.textContent = 'Diğer (Manuel Giriş)';
    select.appendChild(otherOption);
}

fetch('/config/departments.json')
    .then((response) => response.json())
    .then((departments) => {
        window.__odtuDepartments = Object.values(departments)
            .flat()
            .sort((a, b) => a.localeCompare(b, 'tr'));

        populateDepartmentSelect(document.getElementById('department'));
        const profileSelect = document.getElementById('profileDepartment');
        if (profileSelect) populateDepartmentSelect(profileSelect);

        // Profil kartı, '/api/profile' cevabı bu fetch'ten önce gelirse bölüm seçimini
        // doğru uygulayabilmek için bu event'i bekler (bkz. profile.js).
        window.dispatchEvent(new Event('departments-ready'));
    })
    .catch((error) => console.error('Bölümler yüklenirken hata oluştu:', error));

function checkCustomDepartment() {
    const departmentSelect = document.getElementById('department');
    const customInput = document.getElementById('customDepartment');

    customInput.style.display = departmentSelect.value === 'custom' ? 'inline-block' : 'none';
}

function checkCustomProfileDepartment() {
    const departmentSelect = document.getElementById('profileDepartment');
    const customInput = document.getElementById('profileCustomDepartment');

    customInput.style.display = departmentSelect.value === 'custom' ? 'inline-block' : 'none';
}

// Backend'den gelen hataları kullanıcıya göster
let errorBannerTimeout = null;
function showErrorBanner(message) {
    const banner = document.getElementById('errorBanner');
    if (!banner) return;
    banner.textContent = '⚠️ ' + message;
    banner.style.display = 'block';

    clearTimeout(errorBannerTimeout);
    errorBannerTimeout = setTimeout(() => {
        banner.style.display = 'none';
    }, 6000);
}

// ---------- Oturum bootstrap'i ----------
// Electron'da rol pencereye senkron olarak (URL parametresi + 'set-role' IPC) geliyordu.
// Web'de bunun yerine sayfa yüklenir yüklenmez oturumu API'den soruyoruz: 401 dönerse
// (oturum yok/süresi dolmuş) login sayfasına yönlendiriyoruz; başarılıysa rol/uyeId'yi
// set edip 'app-ready' event'ini fırlatıyoruz — members.js/profile.js kendi verilerini
// bu event'ten sonra yüklüyor (departments-ready ile aynı, zaten var olan kalıp).
// Bu script'ler index.html'in en sonunda olduğu için DOM zaten hazır — ayrı bir
// DOMContentLoaded dinleyicisine gerek yok.
(async function bootstrapSession() {
    let me;
    try {
        me = await apiFetch('GET', '/api/auth/me');
    } catch {
        window.location.href = '/login';
        return;
    }

    currentUserRole = me.rol;
    currentUyeId = me.uyeId;
    applyRolePermissions();

    if (currentUserRole !== 'viewer') {
        const savedTitle = localStorage.getItem('uygulamaBasligi');
        if (savedTitle) {
            document.getElementById('editableTitle').innerText = savedTitle;
        }
    }

    // Saçma tarih/yıl girişini (ör. yıl olarak "20000000") arayüz seviyesinde engelle
    const graduationInput = document.getElementById('graduation');
    graduationInput.min = MIN_YEAR;
    graduationInput.max = CURRENT_YEAR;
    graduationInput.addEventListener('input', () => {
        if (graduationInput.value.length > 4) {
            graduationInput.value = graduationInput.value.slice(0, 4);
        }
    });

    const maxMembershipDate = `${CURRENT_YEAR + 5}-12-31`;
    ['uyelikGiris', 'uyelikCikis'].forEach((id) => {
        const input = document.getElementById(id);
        input.min = '1950-01-01';
        input.max = maxMembershipDate;
        enforceDateBounds(input);
    });

    window.__appReady = true;
    window.dispatchEvent(new Event('app-ready'));
})();

async function logout() {
    try {
        await apiFetch('POST', '/api/auth/logout');
    } catch {
        // oturum zaten gecersizse de login'e don
    }
    window.location.href = 'login.html';
}
