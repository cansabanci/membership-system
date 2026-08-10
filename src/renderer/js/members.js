const { ipcRenderer } = require('electron');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        pozisyon: document.getElementById('pozisyon').value.trim(),
        sehir: document.getElementById('sehir').value.trim(),
        uyelikGiris: document.getElementById('uyelikGiris').value,
        uyelikCikis: document.getElementById('uyelikCikis').value,
        bursMiktar: parseInt(document.getElementById('bursMiktar').value) || 0,
        bursTip: document.getElementById('bursTip').value,
        aidatlar: readAidatList(),
    };
}

// Zorunlu alan / format kontrolü. Geçerliyse null, değilse hata mesajı döner.
function validateMemberForm(data) {
    if (!data.adsoyad) return 'Ad Soyad boş bırakılamaz.';
    if (!data.bolum) return 'Lütfen bir bölüm seçin veya girin.';
    if (data.email && !EMAIL_REGEX.test(data.email)) return 'Mail adresi geçerli görünmüyor.';
    if (data.aidatlar.length === 0) return 'Lütfen en az bir aidat dönemi ekleyin!';
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

    ipcRenderer.send('add-member', member);
    resetForm();
}

async function updateMember() {
    const id = document.getElementById('editingRowIndex').value;
    if (!id) return;

    const data = readMemberForm();
    const error = validateMemberForm(data);
    if (error) {
        alert(error);
        return;
    }

    const photoFile = getPhotoFile();
    const existingPhoto = document.getElementById('editingPhoto').value;

    const member = {
        id,
        ...data,
        photo: photoFile ? await readPhotoAsDataUrl(photoFile) : existingPhoto,
    };

    ipcRenderer.send('update-member', member);
    resetForm();
}

function resetForm() {
    document.getElementById('name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('telefon').value = '';
    document.getElementById('graduation').value = '';
    document.getElementById('isyeri').value = '';
    document.getElementById('meslek').value = '';
    document.getElementById('pozisyon').value = '';
    document.getElementById('sehir').value = '';
    document.getElementById('uyelikGiris').value = '';
    document.getElementById('uyelikCikis').value = '';
    document.getElementById('bursMiktar').value = '';
    document.getElementById('bursTip').value = 'Aylık';
    document.getElementById('photoUpload').value = '';
    document.getElementById('editingRowIndex').value = '';
    document.getElementById('editingPhoto').value = '';
    document.getElementById('department').value = '';
    document.getElementById('customDepartment').value = '';
    document.getElementById('customDepartment').style.display = 'none';
    document.getElementById('aidatTableBody').innerHTML = '';
    document.getElementById('saveButton').style.display = 'inline-block';
    document.getElementById('updateButton').style.display = 'none';
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
    document.getElementById('pozisyon').value = member.pozisyon || '';
    document.getElementById('sehir').value = member.sehir || '';
    document.getElementById('uyelikGiris').value = member.uyelikGiris || '';
    document.getElementById('uyelikCikis').value = member.uyelikCikis || '';

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

    document.getElementById('saveButton').style.display = 'none';
    document.getElementById('updateButton').style.display = 'inline-block';
}

function addMemberToTable(member) {
    const table = document.getElementById('memberTable');

    const row = table.insertRow();
    row.setAttribute('data-id', member.id);
    row.classList.add('main-row');

    const imgCell = row.insertCell(0);
    if (member.photo) {
        const img = document.createElement('img');
        img.src = member.photo;
        img.classList.add('profile-img');
        img.onerror = () => {
            imgCell.textContent = '📷';
        };
        imgCell.appendChild(img);
    } else {
        imgCell.textContent = '📷';
    }

    row.insertCell(1).textContent = member.adsoyad;
    row.insertCell(2).textContent = member.bolum;
    row.insertCell(3).textContent = member.mezuniyet;

    const donemCell = row.insertCell(4);
    const select = document.createElement('select');

    member.donemler.forEach((donem, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = donem;
        select.appendChild(option);
    });
    donemCell.appendChild(select);

    const odendiCell = row.insertCell(5);
    const statusSpan = document.createElement('span');

    function updateStatus(index) {
        const odendi = member.donemler_odendi[index];
        statusSpan.innerHTML = odendi === '✅' ? '✅' : '❌';
    }

    updateStatus(0);
    select.addEventListener('change', (e) => updateStatus(e.target.value));
    odendiCell.appendChild(statusSpan);

    row.insertCell(6).textContent = `${member.bursMiktar} ₺ (${member.bursTip})`;

    const toggleCell = row.insertCell(7);
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Detaylar';
    toggleBtn.onclick = () => {
        detayRow.style.display = detayRow.style.display === 'none' ? 'table-row' : 'none';
    };
    toggleCell.appendChild(toggleBtn);

    const editBtn = document.createElement('span');
    editBtn.innerHTML = "<i class='fas fa-edit'></i>";
    editBtn.style.cursor = 'pointer';
    editBtn.onclick = () => editMember(member);
    row.insertCell(8).appendChild(editBtn);

    const deleteBtn = document.createElement('span');
    deleteBtn.innerHTML = "<i class='fas fa-trash'></i>";
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.onclick = () => {
        ipcRenderer.send('delete-member', member.id);
        row.remove();
        detayRow.remove();
    };
    row.insertCell(9).appendChild(deleteBtn);

    const detayRow = table.insertRow();
    detayRow.classList.add('detay-row');
    detayRow.style.display = 'none';

    const detayCell = detayRow.insertCell(0);
    detayCell.colSpan = 10;
    detayCell.innerHTML = `
        <div style="text-align: left; padding: 10px;">
            <strong>📧 Mail:</strong> ${member.email || '-'}<br>
            <strong>📱 Telefon:</strong> ${member.telefon || '-'}<br>
            <strong>🏢 İş Yeri:</strong> ${member.isyeri || '-'}<br>
            <strong>👨‍🔧 Meslek:</strong> ${member.meslek || '-'}<br>
            <strong>👔 Pozisyon:</strong> ${member.pozisyon || '-'}<br>
            <strong>🌍 Şehir:</strong> ${member.sehir || '-'}<br>
            <strong>📅 Üyelik Tarihleri:</strong> ${member.uyelikGiris || '-'} / ${member.uyelikCikis || '-'}
        </div>
    `;
}

function renderMembers(members) {
    document.getElementById('memberTable').innerHTML = '';
    members.forEach((member) => addMemberToTable(member));
    applyRolePermissions();
}

ipcRenderer.send('load-members');
ipcRenderer.on('members-loaded', (event, members) => renderMembers(members));

ipcRenderer.on('member-added', () => {
    ipcRenderer.send('load-members');
});

ipcRenderer.on('member-updated', (event, updatedMember) => {
    const row = document.querySelector(`tr[data-id='${updatedMember.id}']`);
    if (row) {
        const detayRow = row.nextElementSibling;
        row.remove();
        if (detayRow && detayRow.classList.contains('detay-row')) {
            detayRow.remove();
        }
    }

    addMemberToTable(updatedMember);
    resetForm();
    applyRolePermissions();
});
