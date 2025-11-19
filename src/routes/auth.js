const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Moto = require('../models/Moto');
const { auth } = require('../middlewares/auth');

// Login - Auto-detect user role
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔍 [LOGIN] Request received:', { email });

    // Find user by email only (role will be auto-detected)
    const user = await User.findOne({ email, is_active: true });
    console.log('🔍 [LOGIN] User query result:', user ? `Found user: ${user.email}, role: ${user.role}, is_active: ${user.is_active}` : 'No user found');

    if (!user) {
      console.log('⚠️ [LOGIN] User not found or inactive - returning 401');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    console.log('🔍 [LOGIN] Comparing password...');
    const isMatch = await user.comparePassword(password);
    console.log('🔍 [LOGIN] Password match result:', isMatch);

    if (!isMatch) {
      console.log('⚠️ [LOGIN] Password mismatch - returning 401');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    console.log(`✅ [LOGIN] Authentication successful for ${user.role} user, generating token...`);

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    user.last_login = new Date();
    await user.save();

    console.log('✅ [LOGIN] Login successful, sending response');

    // Populate assigned_local_id for local users and assigned_moto_id for moto users
    let populatedUser = user;
    if (user.role === 'local' && user.assigned_local_id) {
      populatedUser = await User.findById(user._id).populate('assigned_local_id', 'name address');
    }

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        photo_url: user.photo_url,
        assigned_local_id: populatedUser.assigned_local_id || null
      }
    });
  } catch (error) {
    console.error('❌ [LOGIN] Error during login:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Cambiar contraseña
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password (admin only)
router.post('/reset-password/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden resetear contraseñas' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Generar contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-8);
    user.password = tempPassword;
    await user.save();

    res.json({ 
      message: 'Contraseña reseteada',
      temporaryPassword: tempPassword 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('assigned_local_id', 'name address');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;