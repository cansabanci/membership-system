// apiFetch, currentUserRole diğer script'lerde (api.js/ui.js) zaten tanımlı — aynı üst düzey kapsamı paylaşırlar.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Üye listesi veri modeli (tablo tamamen bu diziden yeniden çizilir) ----------
let allMembers = [];
let sortState = 'none'; // 'none' | 'asc' | 'desc' — Ad Soyad sıralaması
let deptFilter = null; // seçili bölüm filtresi (null = tümü)

// Mini tabloya aidat dönemi ekleme
function addAidatToList() {
    const donemSelect = document.getElementById('aidatDonemiSelect');
    const odendiCheckbox = document.getElementById('aidatOdendiCheck');
    const aidatTableBody = document.getElementById('aidatTableBody');

    const selectedDonem = donemSelect.value;
    const isPaid = odendiCheckbox.checked;

    const existing = Array.from(aidatTableBody.querySelectorAll('tr')).some((row) => row.dataset.donem === selectedDonem);
    if (existing) {
        alert('Bu dönem zaten eklenmiş!');
        return;
    }

    const row = document.createElement('tr');
    row.dataset.donem = selectedDonem;

    const donemCell = document.createElement('td');
    donemCell.textContent = selectedDonem;

    const odendiCell = document.createElement('td');
    const odendiInput = document.createElement('input');
    odendiInput.type = 'checkbox';
    odendiInput.checked = isPaid;
    odendiCell.appendChild(odendiInput);

    const removeCell = document.createElement('td');
    const removeBtn = document.createElement('span');
    removeBtn.textContent = '🗑️';
    removeBtn.className = 'remove-button';
    removeBtn.onclick = () => row.remove();
    removeCell.appendChild(removeBtn);

    row.appendChild(donemCell);
    row.appendChild(odendiCell);
    row.appendChild(removeCell);

    aidatTableBody.appendChild(row);
}

function readAidatList() {
    return Array.from(document.querySelectorAll('#aidatTableBody tr')).map((row) => ({
        donem: row.dataset.donem,
        odendi: row.querySelector('input[type="checkbox"]').checked ? 1 : 0,
    }));
}

// Formdan üye alanlarını topla (id hariç — save/update ortak kullanır)
function readMemberForm() {
    const departmentSelect = document.getElementById('department').value;
    const customDepartment = document.getElementById('customDepartment').value.trim();
    const department = departmentSelect === 'custom' ? customDepartment : departmentSelect;

    return {
        adsoyad: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        telefon: document.getElementById('telefon').value.trim(),
        bolum: department,
        mezuniyet: document.getElementById('graduation').value.trim(),
        isyeri: document.getElementById('isyeri').value.trim(),
        meslek: document.getElementById('meslek').value.trim(),
        sehir: document.getElementById('sehir').value.trim(),
        uyelikGiris: document.getElementById('uyelikGiris').value,
        uyelikCikis: document.getElementById('uyelikCikis').value,
        bursMiktar: parseInt(document.getElementById('bursMiktar').value) || 0,
        bursTip: document.getElementById('bursTip').value,
        tcKimlikNo: document.getElementById('tcKimlikNo').value.trim(),
        cinsiyet: document.getElementById('cinsiyet').value,
        dogumTarihi: document.getElementById('dogumTarihi').value,
        ogrenimDurumu: document.getElementById('ogrenimDurumu').value,
        uyeNiteligi: document.getElementById('uyeNiteligi').value,
        uyeTur: document.getElementById('uyeTur').value,
        onursalUye: document.getElementById('onursalUye').checked,
        durum: document.getElementById('durum').value,
        yonetimKuruluKararTarihi: document.getElementById('yonetimKuruluKararTarihi').value,
        pasifOlmaNedeni: document.getElementById('pasifOlmaNedeni').value.trim(),
        pasifOlmaBildirimTarihi: document.getElementById('pasifOlmaBildirimTarihi').value,
        aidatlar: readAidatList(),
    };
}

function isValidYear(value) {
    if (!value) return true; // boş bırakılabilir
    if (!/^\d{4}$/.test(String(value))) return false;
    const year = Number(value);
    return year >= MIN_YEAR && year <= CURRENT_YEAR;
}

function isValidMembershipDate(value) {
    if (!value) return true; // boş bırakılabilir
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const year = Number(value.slice(0, 4));
    return year >= 1950 && year <= CURRENT_YEAR + 5;
}

// Zorunlu alan / format kontrolü. Geçerliyse null, değilse hata mesajı döner.
function validateMemberForm(data) {
    if (!data.adsoyad) return 'Ad Soyad boş bırakılamaz.';
    if (data.email && !EMAIL_REGEX.test(data.email)) return 'Mail adresi geçerli görünmüyor.';
    if (!isValidYear(data.mezuniyet)) return `Mezuniyet yılı ${MIN_YEAR} ile ${CURRENT_YEAR} arasında, 4 haneli bir yıl olmalı.`;
    if (!isValidMembershipDate(data.uyelikGiris)) return 'Üyelik giriş tarihi geçerli değil.';
    if (!isValidMembershipDate(data.uyelikCikis)) return 'Üyelik çıkış tarihi geçerli değil.';
    if (data.uyelikGiris && data.uyelikCikis && data.uyelikGiris > data.uyelikCikis) {
        return 'Üyelik çıkış tarihi, giriş tarihinden önce olamaz.';
    }
    return null;
}

function getPhotoFile() {
    const photoInput = document.getElementById('photoUpload');
    return photoInput.files.length > 0 ? photoInput.files[0] : null;
}

function readPhotoAsDataUrl(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

async function saveMember() {
    const data = readMemberForm();
    const error = validateMemberForm(data);
    if (error) {
        alert(error);
        return;
    }

    const photoFile = getPhotoFile();
    const member = {
        ...data,
        photo: photoFile ? await readPhotoAsDataUrl(photoFile) : null,
    };

    try {
        await apiFetch('POST', '/api/members', member);
        resetForm();
        await loadMembers();
    } catch (err) {
        showErrorBanner(err.message);
    }
}

let photoRemoved = false;

function removePhoto() {
    photoRemoved = true;
    document.getElementById('editingPhoto').value = '';
    document.getElementById('photoUpload').value = '';
    document.getElementById('removePhotoBtn').style.display = 'none';
}

async function updateMember() {
    // input.value her zaman string döner — allMembers'taki id'ler DB'den sayı olarak geliyor,
    // Number() ile normalize etmezsek eşleştirme başarısız olup satırı çoğaltır.
    const id = Number(document.getElementById('editingRowIndex').value);
    if (!id) return;

    const data = readMemberForm();
    const error = validateMemberForm(data);
    if (error) {
        alert(error);
        return;
    }

    const photoFile = getPhotoFile();
    const member = { id, ...data };

    if (photoFile) {
        member.photo = await readPhotoAsDataUrl(photoFile);
    } else if (photoRemoved) {
        member.removePhoto = true;
    }

    try {
        const updated = await apiFetch('PUT', `/api/members/${id}`, member);
        const index = allMembers.findIndex((m) => Number(m.id) === Number(updated.id));
        if (index !== -1) {
            allMembers[index] = updated;
        } else {
            allMembers.push(updated);
        }
        applyMemberView();
        resetForm();
    } catch (err) {
        showErrorBanner(err.message);
    }
}

function resetForm() {
    document.getElementById('name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('telefon').value = '';
    document.getElementById('graduation').value = '';
    document.getElementById('isyeri').value = '';
    document.getElementById('meslek').value = '';
    document.getElementById('sehir').value = '';
    document.getElementById('uyelikGiris').value = '';
    document.getElementById('uyelikCikis').value = '';
    document.getElementById('bursMiktar').value = '';
    document.getElementById('bursTip').value = 'Aylık';
    document.getElementById('photoUpload').value = '';
    document.getElementById('editingRowIndex').value = '';
    document.getElementById('editingPhoto').value = '';
    document.getElementById('removePhotoBtn').style.display = 'none';
    photoRemoved = false;
    document.getElementById('department').value = '';
    document.getElementById('customDepartment').value = '';
    document.getElementById('customDepartment').style.display = 'none';
    document.getElementById('aidatTableBody').innerHTML = '';
    document.getElementById('tcKimlikNo').value = '';
    document.getElementById('cinsiyet').value = '';
    document.getElementById('dogumTarihi').value = '';
    document.getElementById('ogrenimDurumu').value = '';
    document.getElementById('uyeNiteligi').value = 'Gerçek';
    document.getElementById('uyeTur').value = 'Üye';
    document.getElementById('onursalUye').checked = false;
    document.getElementById('durum').value = 'Aktif';
    document.getElementById('yonetimKuruluKararTarihi').value = '';
    document.getElementById('pasifOlmaNedeni').value = '';
    document.getElementById('pasifOlmaBildirimTarihi').value = '';
    document.getElementById('saveButton').style.display = 'inline-block';
    document.getElementById('updateButton').style.display = 'none';
    document.getElementById('cancelButton').style.display = 'none';
}

function editMember(member) {
    document.getElementById('name').value = member.adsoyad || '';
    document.getElementById('graduation').value = member.mezuniyet || '';
    document.getElementById('bursMiktar').value = member.bursMiktar || '';
    document.getElementById('bursTip').value = member.bursTip || 'Aylık';
    document.getElementById('editingRowIndex').value = member.id;

    document.getElementById('email').value = member.email || '';
    document.getElementById('telefon').value = member.telefon || '';
    document.getElementById('isyeri').value = member.isyeri || '';
    document.getElementById('meslek').value = member.meslek || '';
    document.getElementById('sehir').value = member.sehir || '';
    document.getElementById('uyelikGiris').value = member.uyelikGiris || '';
    document.getElementById('uyelikCikis').value = member.uyelikCikis || '';
    document.getElementById('tcKimlikNo').value = member.tcKimlikNo || '';
    document.getElementById('cinsiyet').value = member.cinsiyet || '';
    document.getElementById('dogumTarihi').value = member.dogumTarihi || '';
    document.getElementById('ogrenimDurumu').value = member.ogrenimDurumu || '';
    document.getElementById('uyeNiteligi').value = member.uyeNiteligi || 'Gerçek';
    document.getElementById('uyeTur').value = member.uyeTur || 'Üye';
    document.getElementById('onursalUye').checked = !!member.onursalUye;
    document.getElementById('durum').value = member.durum || 'Aktif';
    document.getElementById('yonetimKuruluKararTarihi').value = member.yonetimKuruluKararTarihi || '';
    document.getElementById('pasifOlmaNedeni').value = member.pasifOlmaNedeni || '';
    document.getElementById('pasifOlmaBildirimTarihi').value = member.pasifOlmaBildirimTarihi || '';

    const departmentSelect = document.getElementById('department');
    const customInput = document.getElementById('customDepartment');

    if ([...departmentSelect.options].some((opt) => opt.value === member.bolum)) {
        departmentSelect.value = member.bolum;
        customInput.style.display = 'none';
        customInput.value = '';
    } else {
        departmentSelect.value = 'custom';
        customInput.style.display = 'inline-block';
        customInput.value = member.bolum || '';
    }

    const aidatBody = document.getElementById('aidatTableBody');
    aidatBody.innerHTML = '';
    if (member.aidatlar && Array.isArray(member.aidatlar)) {
        member.aidatlar.forEach((a) => {
            const row = document.createElement('tr');
            row.dataset.donem = a.donem;

            const donemCell = document.createElement('td');
            donemCell.textContent = a.donem;

            const odendiCell = document.createElement('td');
            const odendiInput = document.createElement('input');
            odendiInput.type = 'checkbox';
            odendiInput.checked = a.odendi == 1;
            odendiCell.appendChild(odendiInput);

            const removeCell = document.createElement('td');
            const removeBtn = document.createElement('span');
            removeBtn.textContent = '🗑️';
            removeBtn.className = 'remove-button';
            removeBtn.onclick = () => row.remove();
            removeCell.appendChild(removeBtn);

            row.appendChild(donemCell);
            row.appendChild(odendiCell);
            row.appendChild(removeCell);

            aidatBody.appendChild(row);
        });
    }

    document.getElementById('editingPhoto').value = member.photo || '';
    photoRemoved = false;
    document.getElementById('removePhotoBtn').style.display = member.photo ? 'inline-block' : 'none';

    document.getElementById('saveButton').style.display = 'none';
    document.getElementById('updateButton').style.display = 'inline-block';
    document.getElementById('cancelButton').style.display = 'inline-block';

    // Formu doldurduktan sonra kullanıcıyı otomatik olarak en üstteki forma taşı — aksi halde
    // uzun bir listede aşağıdaki bir satırdan Düzenle'ye basınca form görünmüyor, elle yukarı
    // kaydırmak gerekiyordu.
    document.getElementById('memberFormPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Detay satırı innerHTML ile kuruluyor — üye alanlarının bir kısmı (email, telefon, meslek,
// işyeri, şehir) viewer'ın kendi profilinden değiştirebildiği alanlar, bu yüzden ham HTML
// olarak basmak stored XSS'e açık olurdu (kötü niyetli bir viewer kendi profiline <script>/
// onerror gibi bir payload koyup admin "Detaylar"ı açtığında admin oturumunda çalıştırabilirdi).
function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

function addMemberToTable(member, rowNumber, initialDonemIndex) {
    const table = document.getElementById('memberTable');

    const row = table.insertRow();
    row.setAttribute('data-id', member.id);
    row.classList.add('main-row');

    const rowNoCell = row.insertCell(0);
    rowNoCell.className = 'col-rowno';
    rowNoCell.textContent = rowNumber;

    const imgCell = row.insertCell(1);
    if (member.photo) {
        const img = document.createElement('img');
        img.src = member.photo;
        img.classList.add('profile-img');
        img.onerror = () => {
            imgCell.textContent = '📷';
        };
        img.onclick = () => openPhotoModal(member.photo, member.adsoyad);
        imgCell.appendChild(img);
    } else {
        imgCell.textContent = '📷';
    }

    row.insertCell(2).textContent = member.adsoyad;
    row.insertCell(3).textContent = member.bolum || '-';
    row.insertCell(4).textContent = member.mezuniyet || '-';

    const donemCell = row.insertCell(5);
    donemCell.className = 'col-aidat';
    const select = document.createElement('select');

    member.donemler.forEach((donem, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = donem;
        select.appendChild(option);
    });
    donemCell.appendChild(select);
    select.value = initialDonemIndex !== undefined ? initialDonemIndex : 0;

    const odendiCell = row.insertCell(6);
    odendiCell.className = 'col-aidat';
    const statusSpan = document.createElement('span');

    function updateStatus(index) {
        const odendi = member.donemler_odendi[index];
        statusSpan.innerHTML = odendi === '✅' ? '✅' : '❌';
    }

    updateStatus(select.value);
    select.addEventListener('change', (e) => updateStatus(e.target.value));
    odendiCell.appendChild(statusSpan);

    const bursCell = row.insertCell(7);
    bursCell.className = 'col-burs';
    bursCell.textContent = `${member.bursMiktar} ₺ (${member.bursTip})`;

    const noteCell = row.insertCell(8);
    noteCell.className = 'col-not';
    const noteBtn = document.createElement('button');
    noteBtn.className = 'btn-note';
    noteBtn.innerHTML = "<i class='fas fa-note-sticky'></i> Not";
    noteBtn.onclick = () => openNoteModal(member.id, member.adsoyad);
    noteCell.appendChild(noteBtn);

    const toggleCell = row.insertCell(9);
    toggleCell.className = 'col-detaylar';
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn-detail';
    toggleBtn.textContent = 'Detaylar';
    toggleBtn.onclick = () => {
        detayRow.style.display = detayRow.style.display === 'none' ? 'table-row' : 'none';
    };
    toggleCell.appendChild(toggleBtn);

    const editBtn = document.createElement('span');
    editBtn.className = 'icon-btn icon-btn-edit';
    editBtn.innerHTML = "<i class='fas fa-edit'></i>";
    editBtn.onclick = () => editMember(member);
    const duzenleCell = row.insertCell(10);
    duzenleCell.className = 'col-duzenle';
    duzenleCell.appendChild(editBtn);

    const rollbackBtn = document.createElement('span');
    rollbackBtn.className = 'icon-btn icon-btn-rollback';
    rollbackBtn.innerHTML = "<i class='fas fa-rotate-left'></i>";
    rollbackBtn.title = 'Son değişikliği geri al';
    rollbackBtn.onclick = async () => {
        if (!confirm(`${member.adsoyad} için son değişikliği geri almak istediğinize emin misiniz?`)) return;
        try {
            const restored = await apiFetch('POST', `/api/members/${member.id}/rollback`);
            const index = allMembers.findIndex((m) => Number(m.id) === Number(restored.id));
            if (index !== -1) {
                allMembers[index] = restored;
            } else {
                allMembers.push(restored);
            }
            applyMemberView();
        } catch (err) {
            showErrorBanner(err.message);
        }
    };
    const geriAlCell = row.insertCell(11);
    geriAlCell.className = 'col-geri-al';
    geriAlCell.appendChild(rollbackBtn);

    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'icon-btn icon-btn-delete';
    deleteBtn.innerHTML = "<i class='fas fa-trash'></i>";
    deleteBtn.onclick = async () => {
        try {
            await apiFetch('DELETE', `/api/members/${member.id}`);
            allMembers = allMembers.filter((m) => m.id !== member.id);
            row.remove();
            detayRow.remove();
        } catch (err) {
            showErrorBanner(err.message);
        }
    };
    const silCell = row.insertCell(12);
    silCell.className = 'col-sil';
    silCell.appendChild(deleteBtn);

    const detayRow = table.insertRow();
    detayRow.classList.add('detay-row');
    detayRow.style.display = 'none';

    const detayCell = detayRow.insertCell(0);
    detayCell.colSpan = 13;
    detayCell.innerHTML = `
        <div style="text-align: left; padding: 10px;">
            <strong>📧 Mail:</strong> ${escapeHtml(member.email || '-')}<br>
            <strong>📱 Telefon:</strong> ${escapeHtml(member.telefon || '-')}<br>
            <strong>🏢 İş Yeri:</strong> ${escapeHtml(member.isyeri || '-')}<br>
            <strong>👨‍🔧 Meslek:</strong> ${escapeHtml(member.meslek || '-')}<br>
            <strong>🌍 Şehir:</strong> ${escapeHtml(member.sehir || '-')}<br>
            <strong>📅 Üyelik Tarihleri:</strong> ${escapeHtml(member.uyelikGiris || '-')} / ${escapeHtml(member.uyelikCikis || '-')}<br>
            <strong>🆔 T.C. Kimlik No:</strong> ${escapeHtml(member.tcKimlikNo || '-')}<br>
            <strong>⚧ Cinsiyet:</strong> ${escapeHtml(member.cinsiyet || '-')}<br>
            <strong>🎂 Doğum Tarihi:</strong> ${escapeHtml(member.dogumTarihi || '-')}<br>
            <strong>🎓 Öğrenim Durumu:</strong> ${escapeHtml(member.ogrenimDurumu || '-')}<br>
            <strong>🧾 Üye Niteliği / Türü:</strong> ${escapeHtml(member.uyeNiteligi || '-')} / ${escapeHtml(member.uyeTur || '-')}<br>
            <strong>🏅 Onursal Üye:</strong> ${member.onursalUye ? 'Evet' : 'Hayır'}<br>
            <strong>📌 Durum:</strong> ${escapeHtml(member.durum || '-')}<br>
            <strong>🗓️ Yönetim Kurulu Karar Tarihi:</strong> ${escapeHtml(member.yonetimKuruluKararTarihi || '-')}<br>
            <strong>🚪 Pasif Olma Nedeni / Bildirim Tarihi:</strong> ${escapeHtml(member.pasifOlmaNedeni || '-')} / ${escapeHtml(member.pasifOlmaBildirimTarihi || '-')}
        </div>
    `;
}

function renderMembers(members, donemIndexByMember) {
    document.getElementById('memberTable').innerHTML = '';
    const total = members.length;
    members.forEach((member, i) => {
        // Z-A sıralamasında numaralar da tersten (N -> 1) gitsin — A-Z/orijinal sırada normal 1 -> N.
        const rowNumber = sortState === 'desc' ? total - i : i + 1;
        const initialDonemIndex = donemIndexByMember ? donemIndexByMember.get(member.id) : undefined;
        addMemberToTable(member, rowNumber, initialDonemIndex);
    });
    applyRolePermissions();
}

// Arama kutusu + bölüm filtresi + dönem/ödeme filtresi + Ad Soyad sıralamasını `allMembers`
// üzerinden tek bir hatta uygulayıp sonucu tabloya çizer. Tüm arama/sıralama/filtre kontrolleri
// bu fonksiyonu çağırır — DOM'dan okumak yerine her zaman aynı veri modelinden yeniden hesaplanır.
function applyMemberView() {
    const searchValue = (document.getElementById('search').value || '').trim().toLowerCase();
    const donemFiltreEl = document.getElementById('donemFiltre');
    const odemeFiltreEl = document.getElementById('odemeFiltre');
    const secilenDonem = donemFiltreEl ? donemFiltreEl.value : '';
    const odemeDurumu = odemeFiltreEl ? odemeFiltreEl.value : '';

    let list = allMembers.slice();

    if (searchValue) {
        list = list.filter((m) => (m.adsoyad || '').toLowerCase().startsWith(searchValue));
    }

    if (deptFilter) {
        list = list.filter((m) => m.bolum === deptFilter);
    }

    // Bir dönem seçiliyse: sadece o dönem için aidat kaydı olan üyeler kalır, ve o üyenin
    // satırındaki dönem seçici başlangıçta o döneme ayarlanır (eski davranışla birebir).
    let donemIndexByMember = null;
    if (secilenDonem) {
        donemIndexByMember = new Map();
        list = list.filter((m) => {
            const idx = (m.donemler || []).indexOf(secilenDonem);
            if (idx === -1) return false;
            donemIndexByMember.set(m.id, idx);
            return true;
        });
    }

    if (odemeDurumu) {
        list = list.filter((m) => {
            const idx = donemIndexByMember ? donemIndexByMember.get(m.id) : 0;
            const odendi = (m.donemler_odendi || [])[idx];
            return odemeDurumu === '1' ? odendi === '✅' : odendi === '❌';
        });
    }

    if (sortState !== 'none') {
        list.sort((a, b) => {
            const cmp = (a.adsoyad || '').localeCompare(b.adsoyad || '', 'tr');
            return sortState === 'asc' ? cmp : -cmp;
        });
    }

    renderMembers(list, donemIndexByMember);
}

// ---------- Ad Soyad başlığına tıklayınca A-Z / Z-A / orijinal sıra döngüsü ----------
function toggleNameSort() {
    sortState = sortState === 'none' ? 'asc' : sortState === 'asc' ? 'desc' : 'none';

    const icon = document.getElementById('nameSortIcon');
    icon.className = sortState === 'asc' ? 'fas fa-sort-up' : sortState === 'desc' ? 'fas fa-sort-down' : 'fas fa-sort';

    applyMemberView();
}

// ---------- Bölüm başlığına tıklayınca tekil bölüm filtresi ----------
function toggleDeptFilterDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('deptFilterSelect');
    const willOpen = dropdown.style.display === 'none';

    if (willOpen) {
        const distinctDepts = [...new Set(allMembers.map((m) => m.bolum).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
        dropdown.innerHTML = '<option value="">Tümü</option>';
        distinctDepts.forEach((dept) => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            dropdown.appendChild(option);
        });
        dropdown.value = deptFilter || '';
    }

    dropdown.style.display = willOpen ? 'inline-block' : 'none';
}

function applyDeptFilterFromSelect() {
    const dropdown = document.getElementById('deptFilterSelect');
    deptFilter = dropdown.value || null;

    const icon = document.getElementById('deptFilterIcon');
    icon.classList.toggle('dept-filter-active', !!deptFilter);

    dropdown.style.display = 'none';
    applyMemberView();
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('deptFilterSelect');
    if (dropdown && dropdown.style.display !== 'none' && !e.target.closest('#thBolum')) {
        dropdown.style.display = 'none';
    }
});

// ---------- Viewer: "Üye listesini göster" ----------
function toggleMemberListVisibility() {
    const checked = document.getElementById('toggleMemberList').checked;
    document.getElementById('memberListBody').style.display = checked ? '' : 'none';
}

async function loadMembers() {
    try {
        const members = await apiFetch('GET', '/api/members');
        allMembers = members;
        applyMemberView();
    } catch (err) {
        showErrorBanner(err.message);
    }
}

// Viewer'lar için: TC no/doğum tarihi/telefon/e-posta/aidat İÇERMEYEN dar bir "üye rehberi"
// (bkz. GET /api/members/directory). Aynı tablo/arama/filtre altyapısını (applyMemberView,
// addMemberToTable) yeniden kullanmak için eksik alanlar zararsız boş değerlerle dolduruluyor —
// bu alanlara karşılık gelen sütunlar zaten CSS ile (.col-aidat/.col-burs vb.) viewer'dan gizli.
async function loadDirectory() {
    try {
        const members = await apiFetch('GET', '/api/members/directory');
        allMembers = members.map((m) => ({
            ...m,
            donemler: [],
            donemler_odendi: [],
            bursMiktar: 0,
            bursTip: '-',
        }));
        applyMemberView();
    } catch (err) {
        showErrorBanner(err.message);
    }
}

// Eskiden script yüklenir yüklenmez çalışırdı; artık oturum bootstrap'i (ui.js) bitip
// gerçek rol bilindikten sonra çalışması gerekiyor (bkz. onAppReady, ui.js).
onAppReady(() => {
    if (currentUserRole === 'viewer') {
        document.getElementById('memberListBody').style.display = 'none';
        loadDirectory();
        return;
    }
    loadMembers();
});

// ---------- Fotoğraf büyütme ----------
function openPhotoModal(photoUrl, adsoyad) {
    document.getElementById('photoModalName').textContent = adsoyad;
    document.getElementById('photoModalImg').src = photoUrl;
    document.getElementById('photoModal').style.display = 'flex';
}

function closePhotoModal() {
    document.getElementById('photoModal').style.display = 'none';
    document.getElementById('photoModalImg').src = '';
}

// ---------- Kişisel notlar (sadece giriş yapan hesaba özel) ----------
let currentNoteUyeId = null;

function openNoteModal(uyeId, adsoyad) {
    currentNoteUyeId = uyeId;
    document.getElementById('noteModalName').textContent = adsoyad;
    document.getElementById('noteModalText').value = '';
    document.getElementById('noteModal').style.display = 'flex';

    apiFetch('GET', `/api/members/${uyeId}/note`)
        .then((res) => {
            if (!res || res.uyeId !== currentNoteUyeId) return;
            document.getElementById('noteModalText').value = res.metin || '';
        })
        .catch((err) => showErrorBanner(err.message));
}

function closeNoteModal() {
    document.getElementById('noteModal').style.display = 'none';
    currentNoteUyeId = null;
}

function saveNote() {
    if (!currentNoteUyeId) return;
    const uyeId = currentNoteUyeId;
    const metin = document.getElementById('noteModalText').value.trim();
    apiFetch('PUT', `/api/members/${uyeId}/note`, { metin }).catch((err) => showErrorBanner(err.message));
    closeNoteModal();
}
