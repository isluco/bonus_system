const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const { auth, motoOnly, adminOnly } = require('../middlewares/auth');
const { uploadImage } = require('../config/cloudinary');

// Crear incidente (moto)
router.post('/', auth, motoOnly, async (req, res) => {
  try {
    const { moto_id, reason, description, photo, location } = req.body;

    let photo_url = null;
    if (photo && photo.startsWith('data:image')) {
      photo_url = await uploadImage(photo, 'incidents');
    }

    const incident = new Incident({
      user_id: req.userId,
      moto_id,
      reason,
      description,
      photo_url,
      location
    });

    await incident.save();
    await incident.populate(['user_id', 'moto_id']);

    res.status(201).json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar incidentes
router.get('/', auth, async (req, res) => {
  try {
    const { status, user_id } = req.query;
    let query = {};

    if (status) query.status = status;
    if (user_id) query.user_id = user_id;

    // Si es moto, solo sus incidentes
    if (req.user.role === 'moto') {
      query.user_id = req.userId;
    }

    const incidents = await Incident.find(query)
      .populate('user_id', 'full_name')
      .populate('moto_id', 'plate brand model')
      .populate('resolved_by', 'full_name')
      .sort({ created_at: -1 });

    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener incidente por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('user_id')
      .populate('moto_id')
      .populate('resolved_by');

    if (!incident) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar estado del incidente (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { status, resolution_notes } = req.body;

    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    incident.status = status;
    if (resolution_notes) incident.resolution_notes = resolution_notes;

    if (status === 'resolved') {
      incident.resolved_by = req.userId;
      incident.resolved_at = new Date();
    }

    await incident.save();
    await incident.populate(['user_id', 'moto_id', 'resolved_by']);

    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
