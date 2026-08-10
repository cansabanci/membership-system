const { ipcRenderer } = require('electron');

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
});

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
