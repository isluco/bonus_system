const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Moto = require('../models/Moto');
const Local = require('../models/Local');

// Test endpoint - Diagnóstico completo
router.get('/test', async (req, res) => {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      mongodb: {
        connected: mongoose.connection.readyState === 1,
        state: mongoose.connection.readyState,
        host: mongoose.connection.host || 'Not connected',
        name: mongoose.connection.name || 'N/A'
      },
      collections: {},
      users: {},
      environment: {
        nodeEnv: process.env.NODE_ENV || 'not set',
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasMongoUri: !!process.env.MONGODB_URI
      }
    };

    // Test Motos collection
    try {
      const motosCount = await Moto.countDocuments();
      const sampleMoto = await Moto.findOne();
      diagnostics.collections.motos = {
        count: motosCount,
        sample: sampleMoto ? { plate: sampleMoto.plate, brand: sampleMoto.brand } : null
      };
    } catch (err) {
      diagnostics.collections.motos = { error: err.message };
    }

    // Test Locales collection
    try {
      const localesCount = await Local.countDocuments();
      diagnostics.collections.locales = { count: localesCount };
    } catch (err) {
      diagnostics.collections.locales = { error: err.message };
    }

    // Test Users collection
    try {
      const usersCount = await User.countDocuments();
      const adminUser = await User.findOne({ role: 'admin' });
      const allUsers = await User.find({}, 'email role is_active').limit(10);

      diagnostics.users = {
        total: usersCount,
        hasAdmin: !!adminUser,
        adminEmail: adminUser ? adminUser.email : null,
        list: allUsers.map(u => ({
          email: u.email,
          role: u.role,
          is_active: u.is_active
        }))
      };
    } catch (err) {
      diagnostics.users = { error: err.message };
    }

    res.json({
      status: 'ok',
      message: 'Diagnóstico completo',
      data: diagnostics
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test login específico
router.post('/test-login', async (req, res) => {
  try {
    const { email, role } = req.body;

    const result = {
      request: { email, role },
      checks: {}
    };

    // Check if user exists
    const user = await User.findOne({ email, role });
    result.checks.userExists = !!user;

    if (user) {
      result.checks.userDetails = {
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        hasPassword: !!user.password,
        passwordLength: user.password ? user.password.length : 0
      };

      // Check if active
      const activeUser = await User.findOne({ email, role, is_active: true });
      result.checks.isActive = !!activeUser;
    }

    res.json({
      status: 'ok',
      message: 'Test de login (sin autenticar)',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
