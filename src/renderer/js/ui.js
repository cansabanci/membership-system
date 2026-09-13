const { ipcRenderer } = require('electron');

// Tarih/yıl doğrulamasında members.js ile paylaşılan sabitler
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1959;

// 👇 Kullanıcı rolüne göre yetkilendirme
// Rol, pencere ilk yüklenirken URL parametresiyle SENKRON geliyor — 'set-role' IPC mesajını
// beklemek arada kısa bir an yanlışlıkla 'viewer' varsayılanının uygulanmasına (ör. formun
// kilitlenmesine) yol açabiliyordu. IPC dinleyici yine de yedek olarak kalıyor.
const roleFromUrl = new URLSearchParams(window.location.search).get('role');
let currentUserRole = roleFromUrl || 'viewer'; // varsayılan olarak viewer (güvenlik amaçlı)

ipcRenderer.on('set-role', (event, role) => {
    currentUserRole = role;
    applyRolePermissions();
});

// Sayfa ilk açılırken (üye listesi yüklenmeden önce bile) dogru rol hemen uygulansin.
applyRolePermissions();

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

// Başlık localStorage'tan alınıyor (sadece admin için — viewer sabit dernek adını görür)
window.addEventListener('DOMContentLoaded', () => {
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
});

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

fetch('../../config/departments.json')
    .then((response) => response.json())
    .then((departments) => {
        window.__odtuDepartments = Object.values(departments)
            .flat()
            .sort((a, b) => a.localeCompare(b, 'tr'));

        populateDepartmentSelect(document.getElementById('department'));
        const profileSelect = document.getElementById('profileDepartment');
        if (profileSelect) populateDepartmentSelect(profileSelect);

        // Profil kartı, 'get-my-profile' cevabı bu fetch'ten önce gelirse bölüm seçimini
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

// Yedekleme sürerken bilgilendirme mesajı
ipcRenderer.on('show-backup-message', () => {
    const msg = document.getElementById('backupMessage');
    if (msg) msg.style.display = 'block';
});

ipcRenderer.on('hide-backup-message', () => {
    const msg = document.getElementById('backupMessage');
    if (msg) msg.style.display = 'none';
});

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

ipcRenderer.on('member-error', (event, message) => {
    showErrorBanner(message);
});
