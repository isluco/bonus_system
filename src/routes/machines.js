const express = require('express');
const router = express.Router();
const Machine = require('../models/Machine');
const { auth, adminOnly } = require('../middlewares/auth');

// Crear máquina
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { type, folio, serial_number, brand, model, local_id, status, installation_date } = req.body;

    const machine = new Machine({
      type,
      folio,
      serial_number: serial_number || '',
      brand: brand || '',
      model: model || '',
      local_id,
      status: status || 'active',
      installation_date: installation_date || Date.now()
    });

    await machine.save();
    res.status(201).json(machine);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'El folio ya existe' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Listar máquinas
router.get('/', auth, async (req, res) => {
  try {
    const { local_id, status } = req.query;
    let query = {};

    if (local_id) query.local_id = local_id;
    if (status) query.status = status;

    const machines = await Machine.find(query)
      .populate('local_id', 'name')
      .sort({ created_at: -1 });

    res.json(machines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener una máquina por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id)
      .populate('local_id', 'name');

    if (!machine) {
      return res.status(404).json({ error: 'Máquina no encontrada' });
    }

    res.json(machine);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar máquina
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const machine = await Machine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!machine) {
      return res.status(404).json({ error: 'Máquina no encontrada' });
    }

    res.json(machine);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar máquina
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const machine = await Machine.findByIdAndDelete(req.params.id);

    if (!machine) {
      return res.status(404).json({ error: 'Máquina no encontrada' });
    }

    res.json({ message: 'Máquina eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;