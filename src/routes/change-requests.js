const express = require('express');
const router = express.Router();
const ChangeRequest = require('../models/ChangeRequest');
const Local = require('../models/Local');
const { auth, localOnly, adminOnly } = require('../middlewares/auth');

// Crear solicitud de cambio (local)
router.post('/', auth, localOnly, async (req, res) => {
  try {
    const { local_id, coins_5, coins_10, notes } = req.body;

    const total_amount = (coins_5 || 0) + (coins_10 || 0);

    // Verificar que el local tenga fondos suficientes
    const local = await Local.findById(local_id);
    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    if (local.current_fund < total_amount) {
      return res.status(400).json({
        error: 'Fondos insuficientes para este cambio',
        current_fund: local.current_fund,
        requested: total_amount
      });
    }

    const changeRequest = new ChangeRequest({
      local_id,
      created_by: req.userId,
      coins_5: coins_5 || 0,
      coins_10: coins_10 || 0,
      total_amount,
      notes
    });

    await changeRequest.save();
    await changeRequest.populate(['local_id', 'created_by']);

    res.status(201).json(changeRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar solicitudes
router.get('/', auth, async (req, res) => {
  try {
    const { status, local_id } = req.query;
    let query = {};

    if (status) query.status = status;
    if (local_id) query.local_id = local_id;

    // Si es local, solo sus solicitudes
    if (req.user.role === 'local') {
      const User = require('../models/User');
      const user = await User.findById(req.userId);
      query.local_id = user.assigned_local_id;
    }

    const requests = await ChangeRequest.find(query)
      .populate('local_id', 'name address')
      .populate('created_by', 'full_name')
      .populate('approved_by', 'full_name')
      .populate('assigned_to_moto', 'full_name')
      .sort({ created_at: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aprobar solicitud (admin)
router.post('/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const { assigned_to_moto } = req.body;

    const changeRequest = await ChangeRequest.findById(req.params.id);

    if (!changeRequest) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    changeRequest.status = 'approved';
    changeRequest.approved_by = req.userId;
    changeRequest.approved_at = new Date();
    if (assigned_to_moto) {
      changeRequest.assigned_to_moto = assigned_to_moto;
    }

    await changeRequest.save();
    await changeRequest.populate(['local_id', 'created_by', 'approved_by', 'assigned_to_moto']);

    res.json(changeRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rechazar solicitud (admin)
router.post('/:id/reject', auth, adminOnly, async (req, res) => {
  try {
    const { rejection_reason } = req.body;

    const changeRequest = await ChangeRequest.findById(req.params.id);

    if (!changeRequest) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    changeRequest.status = 'rejected';
    changeRequest.approved_by = req.userId;
    changeRequest.approved_at = new Date();
    changeRequest.rejection_reason = rejection_reason;

    await changeRequest.save();
    await changeRequest.populate(['local_id', 'created_by', 'approved_by']);

    res.json(changeRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Completar cambio (moto)
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const changeRequest = await ChangeRequest.findById(req.params.id);

    if (!changeRequest) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    changeRequest.status = 'completed';
    changeRequest.completed_at = new Date();

    await changeRequest.save();

    // Actualizar fondo del local
    const local = await Local.findById(changeRequest.local_id);
    local.current_fund -= changeRequest.total_amount;
    await local.save();

    res.json(changeRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
