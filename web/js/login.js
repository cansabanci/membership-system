// apiFetch, js/api.js tarafından bu sayfada zaten tanımlanıyor (script'ler aynı üst düzey kapsamı paylaşır).

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

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Formun sayfayı yenilemesini engelle

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!email || !password) {
        showError('Lütfen e-posta ve şifre girin.');
        return;
    }

    if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }

    try {
        await apiFetch('POST', '/api/auth/login', { email, password });
        window.location.href = 'index.html';
    } catch (err) {
        showError(err.message || 'Geçersiz e-posta veya şifre.');
    }
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

// ---------- Hesap Oluştur / Şifremi Unuttum: iki adımlı OTP akışı ----------
// Adım 1: T.C. no + doğum tarihi -> kayıt bulunur, derneğe kayıtlı e-postaya kod gönderilir.
// Adım 2: kod + şifre -> doğrulanırsa hesap oluşturulur / şifre güncellenir.
let registerStep = 1;
let registerTc = '';
let registerDob = '';
let resetStep = 1;
let resetTc = '';
let resetDob = '';

function resetRegisterFormState() {
    registerStep = 1;
    registerTc = '';
    registerDob = '';
    document.getElementById('registerStep1Fields').style.display = '';
    document.getElementById('registerStep2Fields').style.display = 'none';
    document.getElementById('registerSubmitBtn').textContent = 'Kod Gönder';
    document.getElementById('registerForm').reset();
}

function resetResetFormState() {
    resetStep = 1;
    resetTc = '';
    resetDob = '';
    document.getElementById('resetStep1Fields').style.display = '';
    document.getElementById('resetStep2Fields').style.display = 'none';
    document.getElementById('resetSubmitBtn').textContent = 'Kod Gönder';
    document.getElementById('resetForm').reset();
}

function showRegisterView() {
    hideAllViews();
    resetRegisterFormState();
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
    resetResetFormState();
    document.getElementById('resetView').style.display = 'block';
    document.getElementById('resetError').style.display = 'none';
    document.getElementById('resetSuccess').style.display = 'none';
}

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

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (registerStep === 1) {
        const tcKimlikNo = document.getElementById('regTcKimlikNo').value.trim();
        const dogumTarihi = document.getElementById('regDogumTarihi').value;
        if (!tcKimlikNo || !dogumTarihi) {
            showRegisterError('Lütfen tüm alanları doldurun.');
            return;
        }

        try {
            const { email } = await apiFetch('POST', '/api/auth/register/request-otp', { tcKimlikNo, dogumTarihi });
            registerTc = tcKimlikNo;
            registerDob = dogumTarihi;
            registerStep = 2;
            document.getElementById('registerError').style.display = 'none';
            document.getElementById('registerOtpHint').textContent = `Doğrulama kodu ${email} adresine gönderildi.`;
            document.getElementById('registerStep1Fields').style.display = 'none';
            document.getElementById('registerStep2Fields').style.display = 'block';
            document.getElementById('registerSubmitBtn').textContent = 'Hesap Oluştur';
        } catch (err) {
            showRegisterError(err.message || 'Kod gönderilemedi.');
        }
        return;
    }

    const otp = document.getElementById('regOtp').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;

    if (!otp || !password || !passwordConfirm) {
        showRegisterError('Lütfen tüm alanları doldurun.');
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

    try {
        const { adsoyad, email } = await apiFetch('POST', '/api/auth/register/verify', {
            tcKimlikNo: registerTc,
            dogumTarihi: registerDob,
            otp,
            password,
        });
        document.getElementById('registerError').style.display = 'none';
        const successDiv = document.getElementById('registerSuccess');
        successDiv.textContent = `Hoş geldiniz ${adsoyad}! Hesabınız oluşturuldu, şimdi giriş yapabilirsiniz.`;
        successDiv.style.display = 'block';

        setTimeout(() => {
            showLoginView();
            document.getElementById('email').value = email;
            document.getElementById('password').focus();
        }, 1800);
    } catch (err) {
        showRegisterError(err.message || 'Hesap oluşturulamadı.');
    }
});

async function resendRegisterOtp() {
    if (!registerTc || !registerDob) return;
    try {
        const { email } = await apiFetch('POST', '/api/auth/register/request-otp', { tcKimlikNo: registerTc, dogumTarihi: registerDob });
        document.getElementById('registerOtpHint').textContent = `Doğrulama kodu ${email} adresine tekrar gönderildi.`;
        document.getElementById('registerError').style.display = 'none';
    } catch (err) {
        showRegisterError(err.message || 'Kod gönderilemedi.');
    }
}

function showResetError(message) {
    const errorDiv = document.getElementById('resetError');
    document.getElementById('resetSuccess').style.display = 'none';
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

document.getElementById('resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (resetStep === 1) {
        const tcKimlikNo = document.getElementById('resetTcKimlikNo').value.trim();
        const dogumTarihi = document.getElementById('resetDogumTarihi').value;
        if (!tcKimlikNo || !dogumTarihi) {
            showResetError('Lütfen tüm alanları doldurun.');
            return;
        }

        try {
            const { email } = await apiFetch('POST', '/api/auth/reset-password/request-otp', { tcKimlikNo, dogumTarihi });
            resetTc = tcKimlikNo;
            resetDob = dogumTarihi;
            resetStep = 2;
            document.getElementById('resetError').style.display = 'none';
            document.getElementById('resetOtpHint').textContent = `Doğrulama kodu ${email} adresine gönderildi.`;
            document.getElementById('resetStep1Fields').style.display = 'none';
            document.getElementById('resetStep2Fields').style.display = 'block';
            document.getElementById('resetSubmitBtn').textContent = 'Şifreyi Güncelle';
        } catch (err) {
            showResetError(err.message || 'Kod gönderilemedi.');
        }
        return;
    }

    const otp = document.getElementById('resetOtp').value.trim();
    const password = document.getElementById('resetPassword').value;
    const passwordConfirm = document.getElementById('resetPasswordConfirm').value;

    if (!otp || !password || !passwordConfirm) {
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

    try {
        const { adsoyad, email } = await apiFetch('POST', '/api/auth/reset-password/verify', {
            tcKimlikNo: resetTc,
            dogumTarihi: resetDob,
            otp,
            password,
        });
        document.getElementById('resetError').style.display = 'none';
        const successDiv = document.getElementById('resetSuccess');
        successDiv.textContent = `${adsoyad}, şifreniz güncellendi! Şimdi yeni şifrenizle giriş yapabilirsiniz.`;
        successDiv.style.display = 'block';

        setTimeout(() => {
            showLoginView();
            document.getElementById('email').value = email;
            document.getElementById('password').focus();
        }, 1800);
    } catch (err) {
        showResetError(err.message || 'Şifre güncellenemedi.');
    }
});

async function resendResetOtp() {
    if (!resetTc || !resetDob) return;
    try {
        const { email } = await apiFetch('POST', '/api/auth/reset-password/request-otp', { tcKimlikNo: resetTc, dogumTarihi: resetDob });
        document.getElementById('resetOtpHint').textContent = `Doğrulama kodu ${email} adresine tekrar gönderildi.`;
        document.getElementById('resetError').style.display = 'none';
    } catch (err) {
        showResetError(err.message || 'Kod gönderilemedi.');
    }
}
