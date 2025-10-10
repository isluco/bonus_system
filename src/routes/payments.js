const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { auth, adminOnly } = require('../middlewares/auth');
const { uploadImage } = require('../config/cloudinary');
const { calculateNetSalary } = require('../utils/calculations');

// Crear pago de salario
router.post('/salary', auth, adminOnly, async (req, res) => {
  try {
    const { user_id, digital_signature } = req.body;

    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener asistencias del período (última semana)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const attendances = await Attendance.find({
      user_id,
      date: { $gte: weekAgo }
    });

    const absences = attendances.filter(a => a.type === 'absent').length;
    const lateArrivals = attendances.filter(a => a.type === 'late').length;

    // Verificar préstamo activo
    const activeLoan = await Loan.findOne({ 
      user_id, 
      status: 'active' 
    });

    const loanPayment = activeLoan ? activeLoan.weekly_payment : 0;

    // Calcular sueldo
    const salaryDetails = calculateNetSalary(
      user.weekly_salary,
      absences,
      lateArrivals,
      loanPayment,
      0 // bonuses
    );

    const payment = new Payment({
      type: 'salary',
      user_id,
      amount: salaryDetails.net_salary,
      salary_details: salaryDetails,
      status: 'paid',
      paid_by: req.userId,
      paid_date: new Date(),
      digital_signature
    });

    await payment.save();

    // Si hay préstamo, registrar el pago
    if (activeLoan) {
      const nextPayment = activeLoan.payment_schedule.find(p => p.status === 'scheduled');
      if (nextPayment) {
        nextPayment.status = 'completed';
        nextPayment.paid_date = new Date();
        activeLoan.remaining_balance -= nextPayment.payment_amount;
        
        if (activeLoan.remaining_balance <= 0) {
          activeLoan.status = 'completed';
        }
        
        await activeLoan.save();
      }
    }

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear pago de servicio
router.post('/service', auth, adminOnly, async (req, res) => {
  try {
    const { local_id, service_id, amount, evidence, digital_signature } = req.body;

    let evidence_url = null;
    if (evidence) {
      evidence_url = await uploadImage(evidence, 'payments');
    }

    const payment = new Payment({
      type: 'service',
      local_id,
      service_id,
      amount,
      evidence_url,
      digital_signature,
      status: 'paid',
      paid_by: req.userId,
      paid_date: new Date()
    });

    await payment.save();

    // Actualizar fondo del local
    const Local = require('../models/Local');
    const local = await Local.findById(local_id);
    local.current_fund -= amount;
    await local.save();

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar pagos
router.get('/', auth, async (req, res) => {
  try {
    const { type, status, user_id, local_id } = req.query;
    let query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (user_id) query.user_id = user_id;
    if (local_id) query.local_id = local_id;

    const payments = await Payment.find(query)
      .populate('user_id', 'full_name employee_id')
      .populate('local_id', 'name')
      .populate('paid_by', 'full_name')
      .sort({ created_at: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener pagos pendientes
router.get('/pending', auth, adminOnly, async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const pendingPayments = await Payment.find({
      status: 'pending',
      due_date: { $lte: sevenDaysFromNow }
    })
      .populate('local_id', 'name')
      .populate('user_id', 'full_name')
      .sort({ due_date: 1 });

    res.json(pendingPayments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generar recibo de pago (PDF)
router.get('/:id/receipt', auth, async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const payment = await Payment.findById(req.params.id)
      .populate('user_id', 'full_name employee_id')
      .populate('paid_by', 'full_name');

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo-${payment._id}.pdf`);
    
    doc.pipe(res);

    // Encabezado
    doc.fontSize(20).text('RECIBO DE PAGO', { align: 'center' });
    doc.moveDown();

    // Datos del empleado
    doc.fontSize(12);
    doc.text(`Empleado: ${payment.user_id.full_name}`);
    doc.text(`ID Empleado: ${payment.user_id.employee_id}`);
    doc.text(`Fecha: ${payment.paid_date.toLocaleDateString()}`);
    doc.moveDown();

    // Detalles del pago
    if (payment.type === 'salary' && payment.salary_details) {
      const sd = payment.salary_details;
      doc.text('DETALLES DE PAGO:');
      doc.text(`Sueldo Bruto: ${sd.gross_salary}`);
      doc.text(`Faltas (${sd.absences}): -${sd.absences_discount}`);
      doc.text(`Retardos (${sd.late_arrivals}): -${sd.late_discount}`);
      doc.text(`Abono Préstamo: -${sd.loan_payment}`);
      doc.text(`Bonos: +${sd.bonuses}`);
      doc.moveDown();
      doc.fontSize(14).text(`TOTAL NETO: ${sd.net_salary}`, { underline: true });
    } else {
      doc.text(`Monto: ${payment.amount}`);
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;