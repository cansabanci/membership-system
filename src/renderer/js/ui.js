const { ipcRenderer } = require('electron');

// Tarih/yıl doğrulamasında members.js ile paylaşılan sabitler
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1959;

// 👇 Kullanıcı rolüne göre yetkilendirme
let currentUserRole = 'viewer'; // varsayılan olarak viewer (güvenlik amaçlı)

ipcRenderer.on('set-role', (event, role) => {
    currentUserRole = role;
    applyRolePermissions();
});

function applyRolePermissions() {
    if (currentUserRole === 'viewer') {
        document.getElementById('saveButton').style.display = 'none';
        document.getElementById('updateButton').style.display = 'none';

        document.querySelectorAll('.fa-edit, .fa-trash, button').forEach((btn) => {
            btn.style.display = 'none';
        });

        document.querySelectorAll('input, select, textarea').forEach((input) => {
            input.disabled = true;
        });
    } else if (currentUserRole === 'admin') {
        document.getElementById('saveButton').style.display = 'inline-block';

        document.querySelectorAll('.fa-edit, .fa-trash, button').forEach((btn) => {
            btn.style.display = '';
        });

        document.querySelectorAll('input, select, textarea').forEach((input) => {
            input.disabled = false;
        });
    }
}

// Başlık localStorage'tan alınıyor
window.addEventListener('DOMContentLoaded', () => {
    const savedTitle = localStorage.getItem('uygulamaBasligi');
    if (savedTitle) {
        document.getElementById('editableTitle').innerText = savedTitle;
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

// Bölüm listesini doldur
fetch('../../config/departments.json')
    .then((response) => response.json())
    .then((departments) => {
        const select = document.getElementById('department');
        Object.keys(departments).forEach((fakulte) => {
            departments[fakulte].forEach((department) => {
                const option = document.createElement('option');
                option.value = department;
                option.textContent = department;
                select.appendChild(option);
            });
        });

        const otherOption = document.createElement('option');
        otherOption.value = 'custom';
        otherOption.textContent = 'Diğer (Manuel Giriş)';
        select.appendChild(otherOption);
    })
    .catch((error) => console.error('Bölümler yüklenirken hata oluştu:', error));

function checkCustomDepartment() {
    const departmentSelect = document.getElementById('department');
    const customInput = document.getElementById('customDepartment');

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
