const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { auth, adminOnly, motoOnly } = require('../middlewares/auth');
const { uploadImage } = require('../config/cloudinary');

// Crear gasto
router.post('/', auth, async (req, res) => {
  try {
    const { type, amount, description, photo, distance_km, local_id } = req.body;

    let photo_url = null;
    if (photo) {
      photo_url = await uploadImage(photo, 'expenses');
    }

    const expense = new Expense({
      user_id: req.userId,
      local_id,
      type,
      amount,
      description,
      photo_url,
      distance_km,
      status: 'pending'
    });

    await expense.save();
    await expense.populate(['user_id', 'local_id']);

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar gastos
router.get('/', auth, async (req, res) => {
  try {
    const { status, user_id, type } = req.query;
    let query = {};

    if (status) query.status = status;
    if (user_id) query.user_id = user_id;
    if (type) query.type = type;

    // Si es moto, solo sus gastos
    if (req.user.role === 'moto') {
      query.user_id = req.userId;
    }

    const expenses = await Expense.find(query)
      .populate('user_id', 'full_name')
      .populate('local_id', 'name')
      .populate('approved_by', 'full_name')
      .sort({ created_at: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aprobar/Rechazar gasto
router.post('/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const { approved, rejection_reason } = req.body;

    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    if (expense.status !== 'pending') {
      return res.status(400).json({ error: 'Este gasto ya fue procesado' });
    }

    expense.status = approved ? 'approved' : 'rejected';
    expense.approved_by = req.userId;
    expense.approved_at = new Date();
    
    if (!approved) {
      expense.rejection_reason = rejection_reason;
    }

    await expense.save();

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;