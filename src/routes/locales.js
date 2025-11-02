const express = require('express');
const router = express.Router();
const Local = require('../models/Local');
const Machine = require('../models/Machine');
const { auth, adminOnly } = require('../middlewares/auth');
const { uploadImage } = require('../config/cloudinary');

// Crear local
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, address, initial_fund, minimum_fund, photo, assigned_user_id, assigned_machines, services, schedule } = req.body;

    let photo_url = null;
    if (photo) {
      photo_url = await uploadImage(photo, 'locales');
    }

    const local = new Local({
      name,
      address,
      initial_fund,
      current_fund: initial_fund,
      minimum_fund: minimum_fund || 1500,
      photo_url,
      assigned_user_id,
      assigned_machines: assigned_machines || [],
      services,
      schedule
    });

    await local.save();
    await local.populate('assigned_user_id', 'full_name email');

    res.status(201).json(local);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar locales
router.get('/', auth, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    // Si es local, solo ver su local asignado
    if (req.user.role === 'local') {
      query.assigned_user_id = req.userId;
    }

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const locales = await Local.find(query)
      .populate('assigned_user_id', 'full_name email phone')
      .sort({ created_at: -1 });

    res.json(locales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener local por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const local = await Local.findById(req.params.id)
      .populate('assigned_user_id', 'full_name email phone');

    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    // Obtener máquinas del local
    const machines = await Machine.find({ local_id: req.params.id });

    res.json({ ...local.toObject(), machines });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar local
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { photo, ...updates } = req.body;

    if (photo && photo.startsWith('data:image')) {
      updates.photo_url = await uploadImage(photo, 'locales');
    }

    const local = await Local.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('assigned_user_id');

    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    res.json(local);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar local
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    // Verificar que no tenga máquinas activas
    const machinesCount = await Machine.countDocuments({ 
      local_id: req.params.id, 
      status: 'active' 
    });

    if (machinesCount > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar un local con máquinas activas' 
      });
    }

    const local = await Local.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    res.json({ message: 'Local eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar fondo del local
router.post('/:id/update-fund', auth, async (req, res) => {
  try {
    const { amount, operation } = req.body; // operation: 'add' | 'subtract'

    const local = await Local.findById(req.params.id);
    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    if (operation === 'add') {
      local.current_fund += amount;
    } else if (operation === 'subtract') {
      local.current_fund -= amount;
    }

    await local.save();

    res.json(local);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;