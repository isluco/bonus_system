const express = require('express');
const router = express.Router();
const ServicePayment = require('../models/ServicePayment');
const Local = require('../models/Local');
const { auth, adminOnly } = require('../middlewares/auth');
const cloudinary = require('../config/cloudinary');

// @route   GET /api/service-payments
// @desc    Get all service payments with filters
// @access  Private (admin)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { local_id, service_type, status, due_from, due_to } = req.query;

    const filter = {};
    if (local_id) filter.local_id = local_id;
    if (service_type) filter.service_type = service_type;
    if (status) filter.status = status;

    if (due_from || due_to) {
      filter.due_date = {};
      if (due_from) filter.due_date.$gte = new Date(due_from);
      if (due_to) filter.due_date.$lte = new Date(due_to);
    }

    const payments = await ServicePayment.find(filter)
      .populate('local_id', 'name address')
      .populate('paid_by', 'full_name')
      .sort({ due_date: 1 });

    res.json(payments);
  } catch (error) {
    console.error('Error getting service payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/service-payments/pending
// @desc    Get all pending service payments (including overdue)
// @access  Private (admin)
router.get('/pending', auth, adminOnly, async (req, res) => {
  try {
    const payments = await ServicePayment.find({
      status: { $in: ['pending', 'overdue'] }
    })
      .populate('local_id', 'name address')
      .populate('paid_by', 'full_name')
      .sort({ due_date: 1 });

    // Update overdue status
    const today = new Date();
    for (const payment of payments) {
      if (payment.status === 'pending' && new Date(payment.due_date) < today) {
        payment.status = 'overdue';
        await payment.save();
      }
    }

    res.json(payments);
  } catch (error) {
    console.error('Error getting pending payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/service-payments/local/:localId
// @desc    Get service payments for a specific local
// @access  Private
router.get('/local/:localId', auth, async (req, res) => {
  try {
    const { localId } = req.params;
    const { status } = req.query;

    const filter = { local_id: localId };
    if (status) filter.status = status;

    const payments = await ServicePayment.find(filter)
      .populate('paid_by', 'full_name')
      .sort({ due_date: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Error getting local payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/service-payments
// @desc    Create a new service payment
// @access  Private (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const {
      local_id,
      service_type,
      amount,
      due_date,
      account_number,
      notes
    } = req.body;

    // Validate local exists
    const local = await Local.findById(local_id);
    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    // Validate service is active
    if (!local.services[service_type]?.active) {
      return res.status(400).json({
        error: `El servicio ${service_type} no está activo en este local`
      });
    }

    const payment = new ServicePayment({
      local_id,
      service_type,
      amount,
      due_date,
      account_number,
      notes,
      status: 'pending'
    });

    await payment.save();
    await payment.populate('local_id', 'name address');

    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating service payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/service-payments/:id/pay
// @desc    Mark a service payment as paid
// @access  Private (admin)
router.put('/:id/pay', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      payment_method,
      reference,
      receipt_photo,
      notes
    } = req.body;

    const payment = await ServicePayment.findById(id);
    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    if (payment.status === 'paid') {
      return res.status(400).json({ error: 'Este pago ya fue marcado como pagado' });
    }

    // Upload receipt photo to Cloudinary if provided
    let receiptUrl = payment.receipt_photo;
    if (receipt_photo && receipt_photo.startsWith('data:image')) {
      try {
        const result = await cloudinary.uploader.upload(receipt_photo, {
          folder: 'service_receipts',
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto' }
          ]
        });
        receiptUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading receipt:', uploadError);
      }
    }

    payment.status = 'paid';
    payment.paid_date = new Date();
    payment.paid_by = req.user.id;
    payment.payment_method = payment_method || 'cash';
    payment.reference = reference || '';
    payment.receipt_photo = receiptUrl;
    if (notes) payment.notes = notes;

    await payment.save();
    await payment.populate('local_id', 'name address');
    await payment.populate('paid_by', 'full_name');

    // Deduct from local's current fund
    const local = await Local.findById(payment.local_id);
    if (local) {
      local.current_fund -= payment.amount;
      await local.save();
    }

    res.json(payment);
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/service-payments/:id
// @desc    Update a service payment
// @access  Private (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const payment = await ServicePayment.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('local_id', 'name address')
      .populate('paid_by', 'full_name');

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/service-payments/:id
// @desc    Delete a service payment
// @access  Private (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await ServicePayment.findById(id);
    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    if (payment.status === 'paid') {
      return res.status(400).json({
        error: 'No se puede eliminar un pago que ya fue marcado como pagado'
      });
    }

    await payment.deleteOne();
    res.json({ message: 'Pago eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/service-payments/generate-monthly
// @desc    Generate monthly service payments for all active services
// @access  Private (admin)
router.post('/generate-monthly', auth, adminOnly, async (req, res) => {
  try {
    const { month, year } = req.body;

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    const locals = await Local.find({ status: 'active' });
    const createdPayments = [];

    for (const local of locals) {
      // Generate Luz payment
      if (local.services.luz?.active && local.services.luz?.cutoff_date) {
        const dueDate = new Date(targetYear, targetMonth - 1, local.services.luz.cutoff_date);

        // Check if payment already exists
        const exists = await ServicePayment.findOne({
          local_id: local._id,
          service_type: 'luz',
          due_date: dueDate
        });

        if (!exists) {
          const payment = await ServicePayment.create({
            local_id: local._id,
            service_type: 'luz',
            amount: local.services.luz.amount || 0,
            due_date: dueDate,
            account_number: local.services.luz.account,
            status: 'pending'
          });
          createdPayments.push(payment);
        }
      }

      // Generate Internet payment
      if (local.services.internet?.active && local.services.internet?.cutoff_date) {
        const dueDate = new Date(targetYear, targetMonth - 1, local.services.internet.cutoff_date);

        const exists = await ServicePayment.findOne({
          local_id: local._id,
          service_type: 'internet',
          due_date: dueDate
        });

        if (!exists) {
          const payment = await ServicePayment.create({
            local_id: local._id,
            service_type: 'internet',
            amount: local.services.internet.amount || 0,
            due_date: dueDate,
            account_number: local.services.internet.account,
            status: 'pending'
          });
          createdPayments.push(payment);
        }
      }

      // Generate Agua payment
      if (local.services.agua?.active && local.services.agua?.cutoff_date) {
        const dueDate = new Date(targetYear, targetMonth - 1, local.services.agua.cutoff_date);

        const exists = await ServicePayment.findOne({
          local_id: local._id,
          service_type: 'agua',
          due_date: dueDate
        });

        if (!exists) {
          const payment = await ServicePayment.create({
            local_id: local._id,
            service_type: 'agua',
            amount: local.services.agua.amount || 0,
            due_date: dueDate,
            status: 'pending'
          });
          createdPayments.push(payment);
        }
      }

      // Generate Renta payment
      if (local.services.renta?.active && local.services.renta?.payment_date) {
        const dueDate = new Date(targetYear, targetMonth - 1, local.services.renta.payment_date);

        const exists = await ServicePayment.findOne({
          local_id: local._id,
          service_type: 'renta',
          due_date: dueDate
        });

        if (!exists) {
          const payment = await ServicePayment.create({
            local_id: local._id,
            service_type: 'renta',
            amount: local.services.renta.amount || 0,
            due_date: dueDate,
            status: 'pending'
          });
          createdPayments.push(payment);
        }
      }
    }

    res.json({
      message: `Se generaron ${createdPayments.length} pagos de servicios`,
      payments: createdPayments
    });
  } catch (error) {
    console.error('Error generating monthly payments:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
