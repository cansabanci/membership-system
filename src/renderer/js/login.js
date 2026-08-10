const { ipcRenderer } = require('electron');

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault(); // Formun sayfayı yenilemesini engelle

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showError("Lütfen e-posta ve şifre girin.");
        return;
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
