const { ipcRenderer } = require('electron');

const REMEMBERED_EMAIL_KEY = 'rememberedEmail';

window.addEventListener('DOMContentLoaded', () => {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
        document.getElementById('email').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
    }

    const passwordInput = document.getElementById('password');
    const originalPlaceholder = passwordInput.placeholder;
    passwordInput.addEventListener('focus', () => {
        passwordInput.placeholder = '';
    });
    passwordInput.addEventListener('blur', () => {
        if (!passwordInput.value) {
            passwordInput.placeholder = originalPlaceholder;
        }
    });
});

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault(); // Formun sayfayı yenilemesini engelle

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!email || !password) {
        showError("Lütfen e-posta ve şifre girin.");
        return;
    }

    if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }

    // Giriş bilgilerini main sürece gönder
    ipcRenderer.send('login-attempt', { email, password });
});

// Giriş başarılıysa gelen role göre ana pencere açılır
ipcRenderer.on('login-success', (event, role) => {
    console.log("✅ Giriş başarılı, rol:", role);
    // Giriş başarılıysa bu pencere main süreç tarafından zaten kapatılıyor
});

// Giriş başarısızsa uyarı göster (main süreç neden başarısız olduğunu da bildirir)
ipcRenderer.on('login-failed', (event, message) => {
    showError(message || "Geçersiz e-posta veya şifre.");
});

// Uyarı kutusunu göster
function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideAllViews() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('registerView').style.display = 'none';
    document.getElementById('resetView').style.display = 'none';
}

function showRegisterView() {
    hideAllViews();
    document.getElementById('registerView').style.display = 'block';
    document.getElementById('registerError').style.display = 'none';
    document.getElementById('registerSuccess').style.display = 'none';
}

function showLoginView() {
    hideAllViews();
    document.getElementById('loginView').style.display = 'block';
}

function showResetView() {
    hideAllViews();
    document.getElementById('resetView').style.display = 'block';
    document.getElementById('resetError').style.display = 'none';
    document.getElementById('resetSuccess').style.display = 'none';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

function sifreKurallariniKontrolEt(value) {
    return {
        length: value.length >= PASSWORD_MIN_LENGTH,
        lower: /[a-zğüşöçı]/.test(value),
        upper: /[A-ZĞÜŞÖÇİ]/.test(value),
        number: /[0-9]/.test(value),
        special: /[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ]/.test(value),
    };
}

function sifrePolitikasiGecerliMi(durum) {
    return durum.length && durum.lower && durum.upper && durum.number && durum.special;
}

// Şifre alanına canlı ipucu listesi bağlar (hem Hesap Oluştur hem Şifremi Unuttum formunda kullanılıyor).
function baglaSifreIpucu(passwordInputId, hintPrefix) {
    document.getElementById(passwordInputId).addEventListener('input', (e) => {
        const durum = sifreKurallariniKontrolEt(e.target.value);
        document.getElementById(hintPrefix + 'Length').classList.toggle('met', durum.length);
        document.getElementById(hintPrefix + 'Lower').classList.toggle('met', durum.lower);
        document.getElementById(hintPrefix + 'Upper').classList.toggle('met', durum.upper);
        document.getElementById(hintPrefix + 'Number').classList.toggle('met', durum.number);
        document.getElementById(hintPrefix + 'Special').classList.toggle('met', durum.special);
    });
}

baglaSifreIpucu('regPassword', 'hint');
baglaSifreIpucu('resetPassword', 'resetHint');

function showRegisterError(message) {
    const errorDiv = document.getElementById('registerError');
    document.getElementById('registerSuccess').style.display = 'none';
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const tcKimlikNo = document.getElementById('regTcKimlikNo').value.trim();
    const dogumTarihi = document.getElementById('regDogumTarihi').value;
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;

    if (!tcKimlikNo || !dogumTarihi || !email || !password || !passwordConfirm) {
        showRegisterError('Lütfen tüm alanları doldurun.');
        return;
    }
    if (!EMAIL_REGEX.test(email)) {
        showRegisterError('Geçerli bir e-posta adresi girin.');
        return;
    }
    if (password !== passwordConfirm) {
        showRegisterError('Girdiğiniz iki şifre birbiriyle uyuşmuyor.');
        return;
    }
    const sifreDurumu = sifreKurallariniKontrolEt(password);
    if (!sifrePolitikasiGecerliMi(sifreDurumu)) {
        showRegisterError('Şifre en az 8 karakter olmalı; en az bir küçük harf, bir büyük harf, bir rakam ve bir özel karakter içermeli.');
        return;
    }

    ipcRenderer.send('register-attempt', { tcKimlikNo, dogumTarihi, email, password });
});

ipcRenderer.on('register-success', (event, { adsoyad, email }) => {
    document.getElementById('registerError').style.display = 'none';
    const successDiv = document.getElementById('registerSuccess');
    successDiv.textContent = `Hoş geldiniz ${adsoyad}! Hesabınız oluşturuldu, şimdi giriş yapabilirsiniz.`;
    successDiv.style.display = 'block';

    setTimeout(() => {
        document.getElementById('registerForm').reset();
        showLoginView();
        document.getElementById('email').value = email;
        document.getElementById('password').focus();
    }, 1800);
});

ipcRenderer.on('register-failed', (event, message) => {
    showRegisterError(message || 'Hesap oluşturulamadı.');
});

function showResetError(message) {
    const errorDiv = document.getElementById('resetError');
    document.getElementById('resetSuccess').style.display = 'none';
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

document.getElementById('resetForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const tcKimlikNo = document.getElementById('resetTcKimlikNo').value.trim();
    const dogumTarihi = document.getElementById('resetDogumTarihi').value;
    const password = document.getElementById('resetPassword').value;
    const passwordConfirm = document.getElementById('resetPasswordConfirm').value;

    if (!tcKimlikNo || !dogumTarihi || !password || !passwordConfirm) {
        showResetError('Lütfen tüm alanları doldurun.');
        return;
    }
    if (password !== passwordConfirm) {
        showResetError('Girdiğiniz iki şifre birbiriyle uyuşmuyor.');
        return;
    }
    const sifreDurumu = sifreKurallariniKontrolEt(password);
    if (!sifrePolitikasiGecerliMi(sifreDurumu)) {
        showResetError('Şifre en az 8 karakter olmalı; en az bir küçük harf, bir büyük harf, bir rakam ve bir özel karakter içermeli.');
        return;
    }

    ipcRenderer.send('reset-password-attempt', { tcKimlikNo, dogumTarihi, password });
});

ipcRenderer.on('reset-password-success', (event, { adsoyad, email }) => {
    document.getElementById('resetError').style.display = 'none';
    const successDiv = document.getElementById('resetSuccess');
    successDiv.textContent = `${adsoyad}, şifreniz güncellendi! Şimdi yeni şifrenizle giriş yapabilirsiniz.`;
    successDiv.style.display = 'block';

    setTimeout(() => {
        document.getElementById('resetForm').reset();
        showLoginView();
        document.getElementById('email').value = email;
        document.getElementById('password').focus();
    }, 1800);
});

ipcRenderer.on('reset-password-failed', (event, message) => {
    showResetError(message || 'Şifre güncellenemedi.');
});
