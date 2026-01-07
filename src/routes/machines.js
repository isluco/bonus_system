const express = require('express');
const router = express.Router();
const Machine = require('../models/Machine');
const Local = require('../models/Local');
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

    // Sincronizar con el Local: agregar máquina al array assigned_machines
    if (local_id) {
      await Local.findByIdAndUpdate(
        local_id,
        { $addToSet: { assigned_machines: machine._id } }
      );
    }

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
    // Obtener la máquina actual para ver si cambió el local
    const oldMachine = await Machine.findById(req.params.id);
    if (!oldMachine) {
      return res.status(404).json({ error: 'Máquina no encontrada' });
    }

    const oldLocalId = oldMachine.local_id?.toString();
    const newLocalId = req.body.local_id?.toString();

    const machine = await Machine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Si cambió el local, actualizar ambos locales
    if (oldLocalId !== newLocalId) {
      // Remover del local anterior
      if (oldLocalId) {
        await Local.findByIdAndUpdate(
          oldLocalId,
          { $pull: { assigned_machines: machine._id } }
        );
      }
      // Agregar al nuevo local
      if (newLocalId) {
        await Local.findByIdAndUpdate(
          newLocalId,
          { $addToSet: { assigned_machines: machine._id } }
        );
      }
    }

    res.json(machine);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar máquina
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);

    if (!machine) {
      return res.status(404).json({ error: 'Máquina no encontrada' });
    }

    // Remover del local si está asignada
    if (machine.local_id) {
      await Local.findByIdAndUpdate(
        machine.local_id,
        { $pull: { assigned_machines: machine._id } }
      );
    }

    await Machine.findByIdAndDelete(req.params.id);

    res.json({ message: 'Máquina eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;