const express = require('express');
const memberRepository = require('../../src/main/db/repositories/memberRepository');
const historyRepository = require('../../src/main/db/repositories/historyRepository');
const { resolvePhotoPath } = require('../../src/main/services/photoStorage.service');
const { toDurumListesi } = require('../../src/main/utils/aidatUtils');
const { toPhotoUrl } = require('../utils/photoUrl');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, getSelfUyeId } = require('../middleware/auth');
const config = require('../config/env');

// profile.ipc.js'teki SELF_SERVICE_TEXT_FIELDS ile birebir ayni whitelist — bu ikinci
// katman, memberRepository.updateOwnProfileFields'teki DB-taraf whitelist'e ek savunma.
const SELF_SERVICE_TEXT_FIELDS = ['email', 'telefon', 'bolum', 'mezuniyet', 'meslek', 'isyeri', 'sehir'];

const router = express.Router();

async function buildProfilePayload(uyeId) {
  const member = await memberRepository.getMemberById(uyeId);
  if (!member) return null;
  const aidatlar = await memberRepository.getAidatlarForMember(uyeId);
  return {
    ...member,
    photo: member.photo ? toPhotoUrl(member.photo) : null,
    aidatlar,
    ...toDurumListesi(aidatlar),
  };
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const uyeId = getSelfUyeId(req, res);
    if (!uyeId) return;
    const profile = await buildProfilePayload(uyeId);
    if (!profile) return res.status(404).json({ error: 'Üye kaydı bulunamadı.' });
    res.json(profile);
  })
);

router.put(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const uyeId = getSelfUyeId(req, res);
    if (!uyeId) return;

    const before = await memberRepository.getMemberById(uyeId);
    if (before) {
      const beforeAidatlar = await memberRepository.getAidatlarForMember(uyeId);
      await historyRepository.saveSnapshot(uyeId, req.session.userId, before, beforeAidatlar);
    }

    const fields = {};
    for (const key of SELF_SERVICE_TEXT_FIELDS) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }
    const photoPath = resolvePhotoPath(config.PHOTOS_DIR, req.body);
    if (photoPath !== undefined) fields.photo = photoPath;

    await memberRepository.updateOwnProfileFields(uyeId, fields);

    const updated = await buildProfilePayload(uyeId);
    res.json(updated);
  })
);

module.exports = router;
