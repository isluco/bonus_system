const express = require('express');
const router = express.Router();
const SalaryPayment = require('../models/SalaryPayment');
const Loan = require('../models/Loan');
const User = require('../models/User');
const Expense = require('../models/Expense');
const { auth, motoOnly, adminOnly } = require('../middlewares/auth');
const { uploadImage } = require('../config/cloudinary');

// Crear pago de salario (moto)
router.post('/', auth, motoOnly, async (req, res) => {
  try {
    const {
      user_id,
      local_id,
      period_start,
      period_end,
      deductions,
      bonuses,
      digital_signature,
      evidence_photo,
      payment_method,
      notes
    } = req.body;

    // Obtener usuario
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const base_salary = user.weekly_salary || 0;

    // Buscar préstamo activo
    const activeLoan = await Loan.findOne({
      user_id,
      status: 'active',
      remaining_balance: { $gt: 0 }
    });

    let active_loan = null;
    let total_deductions = 0;
    let total_bonuses = 0;

    if (activeLoan) {
      active_loan = {
        loan_id: activeLoan._id,
        weekly_payment: activeLoan.weekly_payment,
        remaining_balance: activeLoan.remaining_balance
      };
      total_deductions += activeLoan.weekly_payment;

      // Actualizar préstamo
      activeLoan.remaining_balance -= activeLoan.weekly_payment;
      if (activeLoan.remaining_balance <= 0) {
        activeLoan.status = 'completed';
        activeLoan.remaining_balance = 0;
      }
      await activeLoan.save();
    }

    // Sumar deducciones adicionales
    if (deductions && deductions.length > 0) {
      total_deductions += deductions.reduce((sum, d) => sum + d.amount, 0);
    }

    // Sumar bonos
    if (bonuses && bonuses.length > 0) {
      total_bonuses = bonuses.reduce((sum, b) => sum + b.amount, 0);
    }

    const net_salary = base_salary - total_deductions + total_bonuses;

    let evidence_photo_url = null;
    if (evidence_photo && evidence_photo.startsWith('data:image')) {
      evidence_photo_url = await uploadImage(evidence_photo, 'salary-payments');
    }

    const salaryPayment = new SalaryPayment({
      user_id,
      local_id,
      paid_by: req.userId,
      period_start,
      period_end,
      base_salary,
      active_loan,
      deductions: deductions || [],
      bonuses: bonuses || [],
      total_deductions,
      total_bonuses,
      net_salary,
      digital_signature,
      payment_method: payment_method || 'cash',
      evidence_photo: evidence_photo_url,
      notes
    });

    await salaryPayment.save();
    await salaryPayment.populate(['user_id', 'local_id', 'paid_by', 'active_loan.loan_id']);

    // Registrar como gasto
    const expense = new Expense({
      user_id: req.userId,
      local_id,
      type: 'other',
      amount: net_salary,
      description: `Pago de salario a ${user.full_name} (${period_start} - ${period_end})`,
      status: 'approved'
    });
    await expense.save();

    res.status(201).json(salaryPayment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar pagos de salario
router.get('/', auth, async (req, res) => {
  try {
    const { user_id, local_id, status } = req.query;
    let query = {};

    if (user_id) query.user_id = user_id;
    if (local_id) query.local_id = local_id;
    if (status) query.status = status;

    const payments = await SalaryPayment.find(query)
      .populate('user_id', 'full_name employee_id')
      .populate('local_id', 'name')
      .populate('paid_by', 'full_name')
      .populate('active_loan.loan_id')
      .sort({ created_at: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener pago por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const payment = await SalaryPayment.findById(req.params.id)
      .populate('user_id')
      .populate('local_id')
      .populate('paid_by')
      .populate('active_loan.loan_id');

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancelar pago (admin) - solo si fue recién creado
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const payment = await SalaryPayment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    // Revertir préstamo si aplica
    if (payment.active_loan && payment.active_loan.loan_id) {
      const loan = await Loan.findById(payment.active_loan.loan_id);
      if (loan) {
        loan.remaining_balance += payment.active_loan.weekly_payment;
        if (loan.status === 'completed') {
          loan.status = 'active';
        }
        await loan.save();
      }
    }

    payment.status = 'cancelled';
    await payment.save();

    res.json({ message: 'Pago cancelado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
