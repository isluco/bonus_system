const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan');
const { auth, adminOnly } = require('../middlewares/auth');
const { createNotification } = require('../utils/notifications');

// Solicitar préstamo
router.post('/', auth, async (req, res) => {
  try {
    const { total_amount, weekly_payment: requested_weekly_payment, reason, digital_signature, user_id } = req.body;

    // Si es moto registrando préstamo de un empleado, usar user_id del body
    // Si no, usar el usuario autenticado
    const targetUserId = user_id || req.userId;

    // Verificar que no tenga préstamos activos
    const activeLoan = await Loan.findOne({
      user_id: targetUserId,
      status: { $in: ['pending', 'approved', 'active'] }
    });

    if (activeLoan) {
      return res.status(400).json({
        error: 'El empleado ya tiene un préstamo activo o pendiente de aprobación'
      });
    }

    // Verificar monto máximo (3000-5000)
    if (total_amount > 5000) {
      return res.status(400).json({ error: 'Monto máximo de préstamo es $5,000' });
    }

    // Usar el pago semanal proporcionado o calcular automáticamente
    const weekly_payment = requested_weekly_payment || (total_amount / 12); // 12 pagos semanales por defecto

    // Crear plan de pagos
    const payment_schedule = [];
    const today = new Date();
    const numberOfPayments = Math.ceil(total_amount / weekly_payment);

    for (let i = 0; i < numberOfPayments; i++) {
      const scheduledDate = new Date(today);
      scheduledDate.setDate(scheduledDate.getDate() + (7 * (i + 1)));

      // El último pago puede ser menor si no es exacto
      const isLastPayment = i === numberOfPayments - 1;
      const payment_amount = isLastPayment
        ? total_amount - (weekly_payment * (numberOfPayments - 1))
        : weekly_payment;

      payment_schedule.push({
        scheduled_date: scheduledDate,
        payment_amount: payment_amount,
        status: 'scheduled'
      });
    }

    const loan = new Loan({
      user_id: targetUserId,
      total_amount,
      weekly_payment,
      remaining_balance: total_amount,
      reason,
      digital_signature,
      payment_schedule,
      status: 'pending',
      registered_by: req.userId // Quien registró la solicitud
    });

    await loan.save();
    await loan.populate('user_id', 'full_name email employee_id');

    // Notificar a admin
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin', is_active: true });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'approval',
        'Nueva solicitud de préstamo',
        `${loan.user_id.full_name} ha solicitado un préstamo de ${total_amount}`,
        { type: 'loan', id: loan._id },
        'high'
      );
    }

    res.status(201).json(loan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar préstamos
router.get('/', auth, async (req, res) => {
  try {
    const { status, user_id } = req.query;
    let query = {};

    if (status) query.status = status;
    if (user_id) query.user_id = user_id;

    // Si no es admin, solo ver sus préstamos
    if (req.user.role !== 'admin') {
      query.user_id = req.userId;
    }

    const loans = await Loan.find(query)
      .populate('user_id', 'full_name email employee_id')
      .populate('approved_by', 'full_name')
      .sort({ created_at: -1 });

    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener préstamo por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('user_id', 'full_name email employee_id weekly_salary')
      .populate('approved_by', 'full_name');

    if (!loan) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }

    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aprobar/Rechazar préstamo
router.post('/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const { approved, rejection_reason } = req.body;

    const loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ error: 'Este préstamo ya fue procesado' });
    }

    if (approved) {
      loan.status = 'active';
      loan.approved_by = req.userId;
      loan.approved_at = new Date();
    } else {
      loan.status = 'rejected';
      loan.rejection_reason = rejection_reason;
    }

    await loan.save();
    await loan.populate('user_id', 'full_name');

    // Notificar al empleado
    await createNotification(
      loan.user_id._id,
      'approval',
      approved ? 'Préstamo aprobado' : 'Préstamo rechazado',
      approved 
        ? `Tu préstamo de ${loan.total_amount} ha sido aprobado`
        : `Tu préstamo fue rechazado. Razón: ${rejection_reason}`,
      { type: 'loan', id: loan._id },
      'high'
    );

    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar pago de préstamo
router.post('/:id/payment/:paymentIndex', auth, adminOnly, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }

    const paymentIndex = parseInt(req.params.paymentIndex);
    const payment = loan.payment_schedule[paymentIndex];

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    payment.status = 'completed';
    payment.paid_date = new Date();
    
    loan.remaining_balance -= payment.payment_amount;

    // Si ya no hay saldo, marcar préstamo como completado
    if (loan.remaining_balance <= 0) {
      loan.status = 'completed';
    }

    await loan.save();

    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;