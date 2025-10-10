const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth } = require('../middlewares/auth');

// Obtener notificaciones del usuario
router.get('/', auth, async (req, res) => {
  try {
    const { is_read } = req.query;
    let query = { user_id: req.userId };

    if (is_read !== undefined) {
      query.is_read = is_read === 'true';
    }

    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marcar como leída
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      { is_read: true, read_at: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marcar todas como leídas
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.userId, is_read: false },
      { is_read: true, read_at: new Date() }
    );

    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;