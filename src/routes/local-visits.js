const express = require('express');
const router = express.Router();
const LocalVisit = require('../models/LocalVisit');
const { auth, motoOnly } = require('../middlewares/auth');
const { uploadImage } = require('../config/cloudinary');

// Crear visita a local (moto)
router.post('/', auth, motoOnly, async (req, res) => {
  try {
    const { local_id, task_id, visit_type, description, photo, location, notes } = req.body;

    let photo_url = null;
    if (photo && photo.startsWith('data:image')) {
      photo_url = await uploadImage(photo, 'local-visits');
    }

    const visit = new LocalVisit({
      moto_user_id: req.userId,
      local_id,
      task_id,
      visit_type,
      description,
      photo_url,
      location,
      notes
    });

    await visit.save();
    await visit.populate(['moto_user_id', 'local_id', 'task_id']);

    res.status(201).json(visit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar check-out
router.post('/:id/checkout', auth, motoOnly, async (req, res) => {
  try {
    const visit = await LocalVisit.findById(req.params.id);

    if (!visit) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    visit.check_out = new Date();
    await visit.save();

    res.json(visit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar visitas
router.get('/', auth, async (req, res) => {
  try {
    const { moto_user_id, local_id, visit_type } = req.query;
    let query = {};

    if (moto_user_id) query.moto_user_id = moto_user_id;
    if (local_id) query.local_id = local_id;
    if (visit_type) query.visit_type = visit_type;

    // Si es moto, solo sus visitas
    if (req.user.role === 'moto') {
      query.moto_user_id = req.userId;
    }

    const visits = await LocalVisit.find(query)
      .populate('moto_user_id', 'full_name')
      .populate('local_id', 'name address')
      .populate('task_id', 'type status')
      .sort({ created_at: -1 });

    res.json(visits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener visita por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const visit = await LocalVisit.findById(req.params.id)
      .populate('moto_user_id')
      .populate('local_id')
      .populate('task_id');

    if (!visit) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    res.json(visit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
