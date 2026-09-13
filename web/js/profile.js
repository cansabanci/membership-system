// apiFetch, readPhotoAsDataUrl, currentUserRole diğer script'lerde (api.js/members.js/ui.js) zaten
// tanımlı — aynı üst düzey kapsamı paylaşırlar.

let myProfile = null;
let profilePhotoRemoved = false;
let departmentsReady = false;

function setProfilePhoto(photoUrl) {
    const img = document.getElementById('profilePhotoPreview');
    if (photoUrl) {
        img.src = photoUrl;
        img.style.display = '';
    } else {
        img.removeAttribute('src');
        img.style.display = 'none';
    }
}

function renderAidatPills(member) {
    const container = document.getElementById('profileAidatPills');
    container.innerHTML = '';

    const donemler = member.donemler || [];
    const odendiList = member.donemler_odendi || [];
    if (donemler.length === 0) {
        container.textContent = 'Aidat kaydı bulunmuyor.';
        return;
    }

    donemler.forEach((donem, i) => {
        const odendi = odendiList[i] === '✅';
        const pill = document.createElement('span');
        pill.className = 'aidat-pill ' + (odendi ? 'aidat-pill--paid' : 'aidat-pill--unpaid');
        pill.textContent = `${donem}: ${odendi ? 'Ödendi' : 'Ödenmedi'}`;
        container.appendChild(pill);
    });
}

function applyProfileDepartmentSelection() {
    if (!myProfile || !departmentsReady) return;

    const departmentSelect = document.getElementById('profileDepartment');
    const customInput = document.getElementById('profileCustomDepartment');
    const bolum = myProfile.bolum || '';

    if ([...departmentSelect.options].some((opt) => opt.value === bolum)) {
        departmentSelect.value = bolum;
        customInput.style.display = 'none';
        customInput.value = '';
    } else if (bolum) {
        departmentSelect.value = 'custom';
        customInput.style.display = 'inline-block';
        customInput.value = bolum;
    } else {
        departmentSelect.value = '';
        customInput.style.display = 'none';
        customInput.value = '';
    }
}

function fillProfileCard(member) {
    myProfile = member;

    document.getElementById('profileAdSoyad').textContent = member.adsoyad || '-';
    document.getElementById('profileDurum').textContent = member.durum || '-';
    document.getElementById('profileBurs').textContent = member.bursMiktar
        ? `${member.bursMiktar} ₺ (${member.bursTip || '-'})`
        : 'Burs kaydı yok';
    renderAidatPills(member);

    profilePhotoRemoved = false;
    setProfilePhoto(member.photo);
    document.getElementById('profileRemovePhotoBtn').style.display = member.photo ? 'inline-block' : 'none';

    document.getElementById('profileEmail').value = member.email || '';
    document.getElementById('profileTelefon').value = member.telefon || '';
    document.getElementById('profileGraduation').value = member.mezuniyet || '';
    document.getElementById('profileMeslek').value = member.meslek || '';
    document.getElementById('profileIsyeri').value = member.isyeri || '';
    document.getElementById('profileSehir').value = member.sehir || '';

    applyProfileDepartmentSelection();
}

function removeProfilePhoto() {
    profilePhotoRemoved = true;
    document.getElementById('profilePhotoUpload').value = '';
    document.getElementById('profileRemovePhotoBtn').style.display = 'none';
    setProfilePhoto(null);
}

async function saveProfile() {
    const departmentSelect = document.getElementById('profileDepartment').value;
    const customDepartment = document.getElementById('profileCustomDepartment').value.trim();
    const bolum = departmentSelect === 'custom' ? customDepartment : departmentSelect;

    const email = document.getElementById('profileEmail').value.trim();
    if (email && !EMAIL_REGEX.test(email)) {
        showErrorBanner('Mail adresi geçerli görünmüyor.');
        return;
    }

    const payload = {
        email,
        telefon: document.getElementById('profileTelefon').value.trim(),
        bolum,
        mezuniyet: document.getElementById('profileGraduation').value.trim(),
        meslek: document.getElementById('profileMeslek').value.trim(),
        isyeri: document.getElementById('profileIsyeri').value.trim(),
        sehir: document.getElementById('profileSehir').value.trim(),
    };

    const photoInput = document.getElementById('profilePhotoUpload');
    const photoFile = photoInput.files.length > 0 ? photoInput.files[0] : null;
    if (photoFile) {
        payload.photo = await readPhotoAsDataUrl(photoFile);
    } else if (profilePhotoRemoved) {
        payload.removePhoto = true;
    }

    try {
        const updated = await apiFetch('PUT', '/api/profile', payload);
        if (updated) {
            fillProfileCard(updated);
            const msg = document.getElementById('profileSaveMessage');
            msg.textContent = 'Bilgileriniz güncellendi.';
            msg.classList.add('profile-save-message--visible');
            setTimeout(() => msg.classList.remove('profile-save-message--visible'), 3000);
        }
    } catch (err) {
        showErrorBanner(err.message);
    }
}

document.getElementById('profilePhotoUpload').addEventListener('change', () => {
    const file = document.getElementById('profilePhotoUpload').files[0];
    if (!file) return;
    profilePhotoRemoved = false;
    readPhotoAsDataUrl(file).then((dataUrl) => {
        setProfilePhoto(dataUrl);
        document.getElementById('profileRemovePhotoBtn').style.display = 'inline-block';
    });
});

window.addEventListener('departments-ready', () => {
    departmentsReady = true;
    applyProfileDepartmentSelection();
});

async function loadMyProfile() {
    try {
        const member = await apiFetch('GET', '/api/profile');
        if (member) fillProfileCard(member);
    } catch (err) {
        showErrorBanner(err.message);
    }
}

onAppReady(() => {
    if (currentUserRole === 'viewer') {
        loadMyProfile();
    }
});
