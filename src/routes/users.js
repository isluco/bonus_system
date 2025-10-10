const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, adminOnly } = require('../middlewares/auth');
const { uploadImage } = require('../config/cloudinary');

// Crear usuario
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { email, password, role, full_name, phone, address, photo, ine_document, nss, license, assigned_local_id, weekly_salary } = req.body;

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

    res.json(users);
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

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar usuario
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { photo, ...updates } = req.body;

    if (photo && photo.startsWith('data:image')) {
      updates.photo_url = await uploadImage(photo, 'users');
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