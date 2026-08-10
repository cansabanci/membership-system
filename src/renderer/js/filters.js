function filterMembers() {
    const searchValue = document.getElementById('search').value.toLowerCase();
    const rows = document.querySelectorAll('#memberTable .main-row');

    rows.forEach((mainRow) => {
        const detayRow = mainRow.nextElementSibling;

        const name = mainRow.cells[1]?.textContent.toLowerCase() || '';
        const department = mainRow.cells[2]?.textContent.toLowerCase() || '';

        const matches = name.includes(searchValue) || department.includes(searchValue);
        mainRow.style.display = matches ? '' : 'none';

        if (detayRow && detayRow.classList.contains('detay-row')) {
            detayRow.style.display = 'none';
        }
    });
}

function filterByDonem() {
    const secilenDonem = document.getElementById('donemFiltre').value;
    const odemeDurumu = document.getElementById('odemeFiltre').value;
    const rows = document.querySelectorAll('#memberTable tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.classList.contains('main-row')) continue;

        const detayRow = rows[i + 1];
        const donemSelect = row.cells[4].querySelector('select');
        const statusSpan = row.cells[5].querySelector('span');

        let display = true;

        if (secilenDonem) {
            const options = Array.from(donemSelect.options);
            const matchIndex = options.findIndex((opt) => opt.textContent === secilenDonem);

            if (matchIndex !== -1) {
                donemSelect.selectedIndex = matchIndex;
                donemSelect.dispatchEvent(new Event('change'));
            } else {
                display = false;
            }
        }

        const odendiGorunen = statusSpan.textContent;
        if (odemeDurumu === '1' && odendiGorunen !== '✅') {
            display = false;
        } else if (odemeDurumu === '0' && odendiGorunen !== '❌') {
            display = false;
        }

        row.style.display = display ? '' : 'none';
        if (detayRow && detayRow.classList.contains('detay-row')) {
            detayRow.style.display = 'none';
        }
    }
}

function clearFilter() {
    document.getElementById('donemFiltre').value = '';
    document.getElementById('odemeFiltre').value = '';

    const rows = document.querySelectorAll('#memberTable .main-row');
    rows.forEach((row) => {
        row.style.display = '';

        const detayRow = row.nextElementSibling;
        if (detayRow && detayRow.classList.contains('detay-row')) {
            detayRow.style.display = 'none';
        }

        const select = row.querySelector('select');
        if (select) {
            select.selectedIndex = 0;
            select.dispatchEvent(new Event('change'));
        }
    });
}
