const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { auth, localOnly, adminOnly } = require('../middlewares/auth');
const { uploadImage } = require('../config/cloudinary');

// Crear alerta (local)
router.post('/', auth, localOnly, async (req, res) => {
  try {
    const { local_id, alert_type, description, photo, location } = req.body;

    let photo_url = null;
    if (photo && photo.startsWith('data:image')) {
      photo_url = await uploadImage(photo, 'alerts');
    }

    const alert = new Alert({
      local_id,
      created_by: req.userId,
      alert_type: alert_type || 'panic',
      description,
      photo_url,
      location
    });

    await alert.save();
    await alert.populate(['local_id', 'created_by']);

    // TODO: Enviar notificación push a todos los admins
    // TODO: Enviar email de emergencia

    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar alertas
router.get('/', auth, async (req, res) => {
  try {
    const { status, alert_type, local_id } = req.query;
    let query = {};

    if (status) query.status = status;
    if (alert_type) query.alert_type = alert_type;
    if (local_id) query.local_id = local_id;

    // Si es local, solo sus alertas
    if (req.user.role === 'local') {
      const User = require('../models/User');
      const user = await User.findById(req.userId);
      query.local_id = user.assigned_local_id;
    }

    const alerts = await Alert.find(query)
      .populate('local_id', 'name address')
      .populate('created_by', 'full_name')
      .populate('attended_by', 'full_name')
      .sort({ created_at: -1 });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener alerta por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('local_id')
      .populate('created_by')
      .populate('attended_by');

    if (!alert) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marcar alerta como atendiendo (admin/moto)
router.post('/:id/attend', auth, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    alert.status = 'attending';
    alert.attended_by = req.userId;
    alert.attended_at = new Date();

    await alert.save();
    await alert.populate(['local_id', 'created_by', 'attended_by']);

    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolver alerta (admin)
router.post('/:id/resolve', auth, adminOnly, async (req, res) => {
  try {
    const { resolution_notes } = req.body;

    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    alert.status = 'resolved';
    alert.resolved_at = new Date();
    alert.resolution_notes = resolution_notes;

    await alert.save();
    await alert.populate(['local_id', 'created_by', 'attended_by']);

    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
