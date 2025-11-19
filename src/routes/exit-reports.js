const express = require('express');
const router = express.Router();
const ExitReport = require('../models/ExitReport');
const { auth, localOnly, adminOnly } = require('../middlewares/auth');
const { uploadImage } = require('../config/cloudinary');

// Crear reporte de salida (local)
router.post('/', auth, localOnly, async (req, res) => {
  try {
    const {
      local_id,
      coins_5,
      coins_10,
      machines_report,
      additional_expenses,
      notes,
      photo
    } = req.body;

    let photo_url = null;
    if (photo && photo.startsWith('data:image')) {
      photo_url = await uploadImage(photo, 'exit-reports');
    }

    // Calcular totales
    const total_coins = (coins_5 || 0) + (coins_10 || 0);

    const total_cajon = machines_report?.reduce((sum, m) => sum + (m.cajon || 0), 0) || 0;
    const total_fondo = machines_report?.reduce((sum, m) => sum + (m.fondo || 0), 0) || 0;
    const total_expenses = additional_expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const grand_total = total_coins + total_cajon + total_fondo - total_expenses;

    const exitReport = new ExitReport({
      local_id,
      user_id: req.userId,
      coins_5: coins_5 || 0,
      coins_10: coins_10 || 0,
      total_coins,
      machines_report,
      additional_expenses,
      total_cajon,
      total_fondo,
      total_expenses,
      grand_total,
      notes,
      photo_url
    });

    await exitReport.save();
    await exitReport.populate(['local_id', 'user_id', 'machines_report.machine_id']);

    res.status(201).json(exitReport);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar reportes
router.get('/', auth, async (req, res) => {
  try {
    const { status, local_id, user_id } = req.query;
    let query = {};

    if (status) query.status = status;
    if (local_id) query.local_id = local_id;
    if (user_id) query.user_id = user_id;

    // Si es local, solo sus reportes
    if (req.user.role === 'local') {
      const User = require('../models/User');
      const user = await User.findById(req.userId);
      query.local_id = user.assigned_local_id;
    }

    const reports = await ExitReport.find(query)
      .populate('local_id', 'name address')
      .populate('user_id', 'full_name')
      .populate('reviewed_by', 'full_name')
      .populate('machines_report.machine_id', 'type folio')
      .sort({ created_at: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener reporte por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await ExitReport.findById(req.params.id)
      .populate('local_id')
      .populate('user_id')
      .populate('reviewed_by')
      .populate('machines_report.machine_id');

    if (!report) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aprobar reporte (admin)
router.post('/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const report = await ExitReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    report.status = 'approved';
    report.reviewed_by = req.userId;
    report.reviewed_at = new Date();

    await report.save();
    await report.populate(['local_id', 'user_id', 'reviewed_by']);

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rechazar reporte (admin)
router.post('/:id/reject', auth, adminOnly, async (req, res) => {
  try {
    const report = await ExitReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    report.status = 'rejected';
    report.reviewed_by = req.userId;
    report.reviewed_at = new Date();

    await report.save();
    await report.populate(['local_id', 'user_id', 'reviewed_by']);

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
