// Arama/sıralama/filtreleme mantığının tamamı artık members.js'deki applyMemberView()
// pipeline'ında (allMembers veri modeli üzerinden) yürütülüyor. Bu dosyada sadece filtreleri
// sıfırlayan Temizle butonu kalıyor.
function clearFilter() {
    document.getElementById('search').value = '';
    document.getElementById('donemFiltre').value = '';
    document.getElementById('odemeFiltre').value = '';
    deptFilter = null;
    sortState = 'none';

    const nameSortIcon = document.getElementById('nameSortIcon');
    if (nameSortIcon) nameSortIcon.className = 'fas fa-sort';
    const deptFilterIcon = document.getElementById('deptFilterIcon');
    if (deptFilterIcon) deptFilterIcon.classList.remove('dept-filter-active');

    applyMemberView();
}
