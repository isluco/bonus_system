const express = require('express');
const router = express.Router();
const SystemConfig = require('../models/SystemConfig');
const { auth, adminOnly } = require('../middlewares/auth');

// Obtener todas las configuraciones
router.get('/', auth, async (req, res) => {
  try {
    const configs = await SystemConfig.find();
    
    // Convertir a objeto clave-valor
    const configObj = {};
    configs.forEach(c => {
      configObj[c.key] = c.value;
    });

    res.json(configObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar configuración
router.put('/', auth, adminOnly, async (req, res) => {
  try {
    const updates = req.body; // { key: value, key2: value2 }

    for (const [key, value] of Object.entries(updates)) {
      await SystemConfig.findOneAndUpdate(
        { key },
        { value, updated_by: req.userId, updated_at: new Date() },
        { upsert: true }
      );
    }

    res.json({ message: 'Configuraciones actualizadas exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;