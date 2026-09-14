const express = require('express');
const memberRepository = require('../../src/main/db/repositories/memberRepository');
const historyRepository = require('../../src/main/db/repositories/historyRepository');
const userRepository = require('../../src/main/db/repositories/userRepository');
const { savePhotoFromDataUrl, deletePhotoFile, resolvePhotoPath } = require('../../src/main/services/photoStorage.service');
const { toDurumListesi } = require('../../src/main/utils/aidatUtils');
const { toPhotoUrl } = require('../utils/photoUrl');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const config = require('../config/env');

const router = express.Router();

// "Üye rehberi" — herhangi bir giriş yapmış kullanıcı (viewer dahil) diğer üyeleri görebilir,
// ama SADECE memberRepository.getDirectoryMembers'taki dar alan setiyle (isim/bölüm/mezuniyet/
// meslek/işyeri/şehir/fotoğraf). TC no, doğum tarihi, telefon, e-posta, aidat ASLA buraya
// eklenmemeli — GET /'deki tam liste bilerek requireAdmin ile korunuyor (bkz. o route'un yorumu).
router.get(
  '/directory',
  requireAuth,
  asyncHandler(async (req, res) => {
    const members = await memberRepository.getDirectoryMembers();
    for (const uye of members) {
      if (uye.photo) uye.photo = toPhotoUrl(uye.photo);
    }
    res.json(members);
  })
);

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [members, tumAidatlar] = await Promise.all([memberRepository.getAllMembers(), memberRepository.getAllAidatlar()]);

    const aidatlarByUyeId = new Map();
    for (const aidat of tumAidatlar) {
      if (!aidatlarByUyeId.has(aidat.uye_id)) aidatlarByUyeId.set(aidat.uye_id, []);
      aidatlarByUyeId.get(aidat.uye_id).push(aidat);
    }

    for (const uye of members) {
      if (uye.photo) uye.photo = toPhotoUrl(uye.photo);
      const aidatlar = aidatlarByUyeId.get(uye.id) || [];
      Object.assign(uye, toDurumListesi(aidatlar));
      uye.aidatlar = aidatlar;
    }

    res.json(members);
  })
);

router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const member = req.body;
    const photoPath = member.photo ? savePhotoFromDataUrl(config.PHOTOS_DIR, member.photo) : null;

    const uyeId = await memberRepository.insertMember({ ...member, photo: photoPath });
    await memberRepository.replaceAidatlar(uyeId, member.aidatlar);

    res.json({
      ...member,
      id: uyeId,
      photo: photoPath ? toPhotoUrl(photoPath) : null,
      ...toDurumListesi(member.aidatlar || []),
    });
  })
);

router.put(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const member = { ...req.body, id };

    const before = await memberRepository.getMemberById(id);
    if (before) {
      const beforeAidatlar = await memberRepository.getAidatlarForMember(id);
      await historyRepository.saveSnapshot(id, req.session.userId, before, beforeAidatlar);
    }

    // Not: eski fotoğraf dosyası burada silinmiyor (rollback ile geri gelebilmesi için
    // diskte bırakılıyor) — members.ipc.js ile birebir ayni davranis.
    const photoPath = resolvePhotoPath(config.PHOTOS_DIR, member);

    await memberRepository.updateMember(id, { ...member, photo: photoPath });
    await memberRepository.replaceAidatlar(id, member.aidatlar);

    const finalPhotoPath = photoPath !== undefined ? photoPath : before && before.photo;
    res.json({
      ...member,
      photo: finalPhotoPath ? toPhotoUrl(finalPhotoPath) : null,
      ...toDurumListesi(member.aidatlar || []),
    });
  })
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const photo = await memberRepository.getMemberPhoto(id);
    if (photo) deletePhotoFile(config.PHOTOS_DIR, photo);

    await userRepository.deleteAccountByMemberId(id);
    await memberRepository.deleteMember(id);
    res.json({ success: true, id });
  })
);

router.post(
  '/:id/rollback',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const snapshot = await historyRepository.getLatestSnapshot(id);
    if (!snapshot) {
      return res.status(404).json({ error: 'Bu üye için geri alınacak bir değişiklik bulunamadı.' });
    }

    await memberRepository.updateMember(id, snapshot.member);
    await memberRepository.replaceAidatlar(id, snapshot.aidatlar);
    await historyRepository.deleteSnapshot(snapshot.id);

    res.json({
      ...snapshot.member,
      id,
      photo: snapshot.member.photo ? toPhotoUrl(snapshot.member.photo) : null,
      aidatlar: snapshot.aidatlar,
      ...toDurumListesi(snapshot.aidatlar),
    });
  })
);

module.exports = router;
