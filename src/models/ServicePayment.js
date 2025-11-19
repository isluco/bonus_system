const mongoose = require('mongoose');

const servicePaymentSchema = new mongoose.Schema({
  local_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local',
    required: true
  },
  service_type: {
    type: String,
    enum: ['luz', 'internet', 'agua', 'renta'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  due_date: {
    type: Date,
    required: true
  },
  paid_date: Date,
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  account_number: String, // Número de cuenta del servicio
  reference: String, // Referencia o folio del pago
  paid_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  payment_method: {
    type: String,
    enum: ['cash', 'transfer', 'card', 'other'],
    default: 'cash'
  },
  receipt_photo: String, // URL del comprobante de pago
  notes: String,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice para buscar pagos pendientes por local y tipo
servicePaymentSchema.index({ local_id: 1, service_type: 1, status: 1 });

// Índice para buscar pagos por fecha de vencimiento
servicePaymentSchema.index({ due_date: 1, status: 1 });

module.exports = mongoose.model('ServicePayment', servicePaymentSchema);
