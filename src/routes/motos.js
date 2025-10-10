const express = require('express');
const router = express.Router();
const Moto = require('../models/Moto');
const { auth, adminOnly } = require('../middlewares/auth');
const { uploadImage } = require('../config/cloudinary');
const { needsService } = require('../utils/calculations');

// Crear moto
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { assigned_user_id, brand, model, plate, circulation_card, initial_km, photo } = req.body;

    let photo_url = null;
    if (photo) {
      photo_url = await uploadImage(photo, 'motos');
    }

    const moto = new Moto({
      assigned_user_id,
      brand,
      model,
      plate,
      circulation_card,
      initial_km,
      current_km: initial_km,
      last_service_km: initial_km,
      photo_url
    });

    await moto.save();
    await moto.populate('assigned_user_id', 'full_name');

    res.status(201).json(moto);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'La placa ya existe' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Listar motos
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) query.status = status;

    const motos = await Moto.find(query)
      .populate('assigned_user_id', 'full_name email')
      .sort({ created_at: -1 });

    // Agregar info de servicio a cada moto
    const motosWithService = motos.map(moto => {
      const serviceInfo = needsService(moto.current_km, moto.last_service_km);
      return {
        ...moto.toObject(),
        service_info: serviceInfo
      };
    });

    res.json(motosWithService);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener moto por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const moto = await Moto.findById(req.params.id)
      .populate('assigned_user_id');

    if (!moto) {
      return res.status(404).json({ error: 'Moto no encontrada' });
    }

    const serviceInfo = needsService(moto.current_km, moto.last_service_km);

    res.json({
      ...moto.toObject(),
      service_info: serviceInfo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar kilometraje
router.post('/:id/update-km', auth, async (req, res) => {
  try {
    const { current_km } = req.body;

    const moto = await Moto.findById(req.params.id);
    
    if (!moto) {
      return res.status(404).json({ error: 'Moto no encontrada' });
    }

    moto.current_km = current_km;
    await moto.save();

    const serviceInfo = needsService(moto.current_km, moto.last_service_km);

    res.json({
      ...moto.toObject(),
      service_info: serviceInfo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar servicio
router.post('/:id/service', auth, async (req, res) => {
  try {
    const { type, cost, description } = req.body;

    const moto = await Moto.findById(req.params.id);
    
    if (!moto) {
      return res.status(404).json({ error: 'Moto no encontrada' });
    }

    moto.services.push({
      type,
      km_at_service: moto.current_km,
      cost,
      description,
      completed: true,
      completed_at: new Date()
    });

    // Actualizar último servicio
    moto.last_service_km = moto.current_km;
    
    await moto.save();

    res.json(moto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar moto
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { photo, ...updates } = req.body;

    if (photo && photo.startsWith('data:image')) {
      updates.photo_url = await uploadImage(photo, 'motos');
    }

    const moto = await Moto.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).populate('assigned_user_id');

    if (!moto) {
      return res.status(404).json({ error: 'Moto no encontrada' });
    }

    res.json(moto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;