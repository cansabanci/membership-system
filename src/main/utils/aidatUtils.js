function toDurumListesi(aidatlar) {
  return {
    donemler: aidatlar.map((a) => a.donem),
    donemler_odendi: aidatlar.map((a) => (a.odendi ? '✅' : '❌')),
  };
}

module.exports = { toDurumListesi };
