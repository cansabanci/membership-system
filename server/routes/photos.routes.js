const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const config = require('../config/env');

const EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

const router = express.Router();

// Fotoğraflar artık statik bir klasörden değil, kimlik doğrulamalı bu route'tan servis
// ediliyor (üye fotoğrafları kişisel veri — KVKK-bilinçli varsayılan: oturumsuz erişilemez).
router.get('/:filename', requireAuth, (req, res) => {
  const safe = path.basename(req.params.filename);
  if (safe !== req.params.filename) {
    return res.status(400).json({ error: 'Geçersiz dosya adı.' });
  }

  const filePath = path.join(config.PHOTOS_DIR, safe);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fotoğraf bulunamadı.' });
  }

  const ext = path.extname(safe).slice(1).toLowerCase();
  res.type(EXT_TO_MIME[ext] || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
