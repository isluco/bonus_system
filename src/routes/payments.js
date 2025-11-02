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

// ========================================
// RUTAS PARA SERVICIOS RECURRENTES
// ========================================

// Listar pagos de servicios recurrentes
router.get('/services/recurring', auth, async (req, res) => {
  try {
    const { local_id, status, service_type, month, year } = req.query;
    let query = { type: 'service' };

    if (local_id) query.local_id = local_id;
    if (status) query.status = status;
    if (service_type) query.service_type = service_type;
    if (month && year) {
      query['period.month'] = parseInt(month);
      query['period.year'] = parseInt(year);
    }

    const payments = await Payment.find(query)
      .populate('local_id', 'name')
      .populate('paid_by', 'full_name')
      .sort({ due_date: -1, created_at: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener pagos de servicios de un local específico
router.get('/services/local/:localId', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {
      local_id: req.params.localId,
      type: 'service',
      service_type: { $exists: true } // Solo servicios recurrentes
    };

    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('paid_by', 'full_name')
      .sort({ due_date: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear pago de servicio recurrente manualmente
router.post('/services/recurring', auth, adminOnly, async (req, res) => {
  try {
    const { local_id, service_type, amount, due_date, period, service_details, notes } = req.body;

    const payment = new Payment({
      type: 'service',
      local_id,
      service_type,
      amount,
      due_date,
      period,
      service_details,
      notes,
      status: 'pending'
    });

    await payment.save();
    await payment.populate('local_id', 'name');

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marcar pago como pagado
router.put('/services/:id/pay', auth, async (req, res) => {
  try {
    const { notes, evidence } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    // Subir evidencia si se proporciona
    if (evidence) {
      payment.evidence_url = await uploadImage(evidence, 'payments');
    }

    await payment.markAsPaid(req.userId);

    if (notes) payment.notes = notes;
    await payment.save();

    // Descontar del fondo del local
    const Local = require('../models/Local');
    const local = await Local.findById(payment.local_id);
    if (local) {
      local.current_fund -= payment.amount;
      await local.save();
    }

    await payment.populate('local_id', 'name');
    await payment.populate('paid_by', 'full_name');

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generar pagos automáticamente para un mes específico
router.post('/services/generate', auth, adminOnly, async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'Mes y año son requeridos' });
    }

    const Local = require('../models/Local');
    const locales = await Local.find({ status: 'active' });

    const paymentsCreated = [];
    const errors = [];

    for (const local of locales) {
      // Procesar cada servicio activo
      for (const [serviceType, serviceConfig] of Object.entries(local.services)) {
        if (!serviceConfig.active || !serviceConfig.amount || serviceConfig.amount <= 0) {
          continue;
        }

        // Verificar si ya existe un pago para este período
        const existingPayment = await Payment.findOne({
          local_id: local._id,
          service_type: serviceType,
          'period.month': month,
          'period.year': year
        });

        if (existingPayment) {
          continue;
        }

        // Calcular fecha de vencimiento
        let dueDate = new Date(year, month - 1, 1);

        if (serviceType === 'renta' && serviceConfig.payment_date) {
          dueDate.setDate(serviceConfig.payment_date);
        } else if (serviceConfig.cutoff_date) {
          dueDate.setDate(serviceConfig.cutoff_date);
        }

        // Crear el pago
        try {
          const payment = new Payment({
            type: 'service',
            local_id: local._id,
            service_type: serviceType,
            amount: serviceConfig.amount,
            due_date: dueDate,
            period: { month, year },
            service_details: {
              account: serviceConfig.account || '',
              provider: serviceConfig.provider || '',
              cutoff_date: serviceConfig.cutoff_date || serviceConfig.payment_date
            },
            status: 'pending'
          });

          await payment.save();
          paymentsCreated.push({
            local: local.name,
            service: serviceType,
            amount: payment.amount,
            due_date: dueDate
          });
        } catch (error) {
          errors.push({
            local: local.name,
            service: serviceType,
            error: error.message
          });
        }
      }
    }

    res.json({
      success: true,
      paymentsCreated: paymentsCreated.length,
      errors: errors.length,
      details: {
        payments: paymentsCreated,
        errors
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener resumen de pagos
router.get('/services/summary', auth, async (req, res) => {
  try {
    const { local_id, month, year } = req.query;
    let matchQuery = {
      type: 'service',
      service_type: { $exists: true }
    };

    if (local_id) matchQuery.local_id = local_id;
    if (month && year) {
      matchQuery['period.month'] = parseInt(month);
      matchQuery['period.year'] = parseInt(year);
    }

    const summary = await Payment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Formatear respuesta
    const result = {
      pending: { count: 0, total: 0 },
      paid: { count: 0, total: 0 },
      overdue: { count: 0, total: 0 }
    };

    summary.forEach(item => {
      if (result[item._id]) {
        result[item._id] = {
          count: item.count,
          total: item.total
        };
      }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar pagos vencidos (para ejecutar por cron)
router.post('/services/update-overdue', auth, adminOnly, async (req, res) => {
  try {
    const result = await Payment.updateOverduePayments();
    res.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;