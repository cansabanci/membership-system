// ipcRenderer.send(kanal, payload) + ayrı ipcRenderer.on(cevapKanalı, handler) ikilisinin
// yerini alan tek çağrı noktası — CSRF token'ı otomatik ekler, başarısız istekleri reddeder.
let csrfToken = null;

async function apiFetch(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (csrfToken && method !== 'GET') headers['X-CSRF-Token'] = csrfToken;

    const response = await fetch(path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let json = null;
    try {
        json = await response.json();
    } catch {
        // govde bos olabilir (ornegin 204/foto stream)
    }

    if (json && json.csrfToken) csrfToken = json.csrfToken;

    // Oturum suresi doldu (idle timeout) ya da baska bir sebeple gecersiz oldu — /api/auth/*
    // disindaki her istekte otomatik login'e don (auth route'lari kendi 401 mesajini
    // (yanlis sifre, vb.) inline gostermesi gerektigi icin bu yonlendirmeden haric tutulur).
    if (response.status === 401 && !path.startsWith('/api/auth/')) {
        window.location.href = 'login.html';
        throw new Error('Oturum süresi doldu, giriş sayfasına yönlendiriliyorsunuz.');
    }

    if (!response.ok) {
        throw new Error((json && json.error) || 'Bir hata oluştu.');
    }

    return json;
}
