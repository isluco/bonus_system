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

    // Actualizar local_id en las máquinas asignadas
    if (assigned_machines && assigned_machines.length > 0) {
      await Machine.updateMany(
        { _id: { $in: assigned_machines } },
        { local_id: local._id }
      );
    }

    // Sincronizar assigned_local_id del usuario asignado
    if (assigned_user_id) {
      const User = require('../models/User');
      await User.findByIdAndUpdate(assigned_user_id, { assigned_local_id: local._id });
    }

    await local.populate('assigned_user_id', 'full_name email');
    await local.populate('assigned_machines');

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
      .populate('assigned_user_id', 'full_name email phone')
      .populate('assigned_machines');

    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    // Renombrar assigned_machines a machines para el frontend
    const localObj = local.toObject();
    localObj.machines = localObj.assigned_machines;

    console.log('Local detail response:', JSON.stringify(localObj, null, 2));
    console.log('Machines:', localObj.machines);

    res.json(localObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar local
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { photo, assigned_machines, assigned_user_id, ...updates } = req.body;

    if (photo && photo.startsWith('data:image')) {
      updates.photo_url = await uploadImage(photo, 'locales');
    }

    // Obtener el local anterior para comparaciones
    const oldLocal = await Local.findById(req.params.id);
    if (!oldLocal) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    // Si hay assigned_machines, actualizar el local_id de cada máquina
    if (assigned_machines) {
      // Remover local_id de máquinas que ya no están asignadas
      if (oldLocal.assigned_machines) {
        const removedMachines = oldLocal.assigned_machines.filter(
          machineId => !assigned_machines.includes(machineId.toString())
        );

        if (removedMachines.length > 0) {
          await Machine.updateMany(
            { _id: { $in: removedMachines } },
            { $unset: { local_id: "" } }
          );
        }
      }

      // Asignar local_id a las nuevas máquinas
      if (assigned_machines.length > 0) {
        await Machine.updateMany(
          { _id: { $in: assigned_machines } },
          { local_id: req.params.id }
        );
      }

      updates.assigned_machines = assigned_machines;
    }

    // Sincronizar assigned_local_id del usuario si cambió assigned_user_id
    if (assigned_user_id !== undefined) {
      const oldUserId = oldLocal.assigned_user_id?.toString();
      const newUserId = assigned_user_id?.toString() || null;

      // Si cambió el usuario asignado
      if (oldUserId !== newUserId) {
        const User = require('../models/User');

        // Remover assigned_local_id del usuario anterior
        if (oldUserId) {
          await User.findByIdAndUpdate(oldUserId, { $unset: { assigned_local_id: "" } });
        }

        // Asignar assigned_local_id al nuevo usuario
        if (newUserId) {
          await User.findByIdAndUpdate(newUserId, { assigned_local_id: req.params.id });
        }
      }

      updates.assigned_user_id = assigned_user_id || null;
    }

    const local = await Local.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('assigned_user_id')
     .populate('assigned_machines');

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