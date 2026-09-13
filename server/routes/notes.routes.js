const express = require('express');
const noteRepository = require('../../src/main/db/repositories/noteRepository');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get(
  '/:id/note',
  requireAuth,
  asyncHandler(async (req, res) => {
    const uyeId = parseInt(req.params.id, 10);
    const metin = await noteRepository.getNote(uyeId, req.session.userId);
    res.json({ uyeId, metin });
  })
);

router.put(
  '/:id/note',
  requireAuth,
  asyncHandler(async (req, res) => {
    const uyeId = parseInt(req.params.id, 10);
    const { metin } = req.body || {};
    await noteRepository.saveNote(uyeId, req.session.userId, metin);
    res.json({ uyeId });
  })
);

module.exports = router;
