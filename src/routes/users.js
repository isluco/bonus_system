const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Moto = require('../models/Moto');
const { auth, adminOnly } = require('../middlewares/auth');
const { uploadImage } = require('../config/cloudinary');

// Listar empleados de locales (para motos - pago de salarios)
// IMPORTANTE: Esta ruta debe estar ANTES de /:id
router.get('/local-employees', auth, async (req, res) => {
  try {
    const users = await User.find({ role: 'local', is_active: true })
      .select('_id full_name weekly_salary assigned_local_id')
      .populate('assigned_local_id', 'name')
      .sort({ full_name: 1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear usuario
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { email, password, role, full_name, phone, address, photo, ine_document, nss, license, assigned_local_id, weekly_salary, moto_id } = req.body;

    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email ya registrado' });
    }

    // Generar employee_id único
    const count = await User.countDocuments();
    const employee_id = `EMP${String(count + 1).padStart(5, '0')}`;

    let photo_url = null;
    if (photo) {
      photo_url = await uploadImage(photo, 'users');
    }

    const user = new User({
      email,
      password,
      role,
      full_name,
      phone,
      address,
      photo_url,
      ine_document,
      nss,
      license,
      employee_id,
      assigned_local_id,
      weekly_salary
    });

    await user.save();

    // Si el rol es moto y se proporcionó moto_id, actualizar la moto
    if (role === 'moto' && moto_id) {
      await Moto.findByIdAndUpdate(moto_id, { assigned_user_id: user._id });
    }

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar usuarios
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { role, is_active, search } = req.query;

    let query = {};

    if (role) query.role = role;
    if (is_active !== undefined) query.is_active = is_active === 'true';
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employee_id: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('assigned_local_id', 'name')
      .sort({ created_at: -1 });

    // Obtener todas las motos para buscar asignaciones
    const motos = await Moto.find({ assigned_user_id: { $ne: null } })
      .select('brand model plate assigned_user_id');

    // Agregar moto_id a usuarios de rol moto
    const usersWithMotos = users.map(user => {
      const userObj = user.toObject();
      if (user.role === 'moto') {
        const assignedMoto = motos.find(m =>
          m.assigned_user_id?.toString() === user._id.toString()
        );
        if (assignedMoto) {
          userObj.moto_id = assignedMoto;
        }
      }
      return userObj;
    });

    res.json(usersWithMotos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener usuario por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('assigned_local_id');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Si el usuario es de rol moto, buscar la moto asignada
    let moto_id = null;
    if (user.role === 'moto') {
      const moto = await Moto.findOne({ assigned_user_id: user._id });
      if (moto) {
        moto_id = moto;
      }
    }

    // Agregar moto_id al objeto de respuesta
    const userObj = user.toObject();
    if (moto_id) {
      userObj.moto_id = moto_id;
    }

    res.json(userObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar usuario
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { photo, moto_id, ...updates } = req.body;

    if (photo && photo.startsWith('data:image')) {
      updates.photo_url = await uploadImage(photo, 'users');
    }

    // Si se proporciona una contraseña, hashearla manualmente
    // (findByIdAndUpdate no dispara el middleware pre('save'))
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    // Si se está actualizando un usuario de rol moto y se proporcionó moto_id
    if (updates.role === 'moto' && moto_id) {
      // Primero, desasignar cualquier moto previamente asignada a este usuario
      await Moto.updateMany(
        { assigned_user_id: req.params.id },
        { $unset: { assigned_user_id: 1 } }
      );

      // Luego, asignar la nueva moto
      await Moto.findByIdAndUpdate(moto_id, { assigned_user_id: req.params.id });
    } else if (updates.role && updates.role !== 'moto') {
      // Si se cambió el rol a algo diferente de moto, desasignar cualquier moto
      await Moto.updateMany(
        { assigned_user_id: req.params.id },
        { $unset: { assigned_user_id: 1 } }
      );
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar usuario (soft delete)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario desactivado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delegar permisos
router.post('/:id/delegate-permissions', auth, adminOnly, async (req, res) => {
  try {
    const { permissions } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { delegated_permissions: permissions },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;