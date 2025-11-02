const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['salary', 'service', 'bonus', 'aguinaldo'],
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  local_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local'
  },
  service_id: String, // referencia al servicio en Local.services
  amount: {
    type: Number,
    required: true
  },
  // Para servicios recurrentes del local
  service_type: {
    type: String,
    enum: ['luz', 'internet', 'agua', 'renta'],
  },
  period: {
    month: {
      type: Number,
      min: 1,
      max: 12
    },
    year: {
      type: Number
    }
  },
  service_details: {
    account: String,
    provider: String,
    cutoff_date: Number
  },
  // Para salarios
  salary_details: {
    gross_salary: Number,
    absences: Number,
    absences_discount: Number,
    late_arrivals: Number,
    late_discount: Number,
    loan_payment: Number,
    bonuses: Number,
    net_salary: Number
  },
  due_date: Date,
  paid_date: Date,
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  paid_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  evidence_url: String,
  digital_signature: String, // Base64
  notes: String,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
paymentSchema.index({ local_id: 1, type: 1, status: 1 });
paymentSchema.index({ status: 1, due_date: 1 });
paymentSchema.index({ local_id: 1, service_type: 1, period: 1 });

// Método para marcar como pagado
paymentSchema.methods.markAsPaid = function(paidBy) {
  this.status = 'paid';
  this.paid_date = new Date();
  if (paidBy) this.paid_by = paidBy;
  return this.save();
};

// Método estático para actualizar pagos vencidos
paymentSchema.statics.updateOverduePayments = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await this.updateMany(
    {
      status: 'pending',
      due_date: { $lt: today }
    },
    {
      status: 'overdue'
    }
  );

  return result;
};

module.exports = mongoose.model('Payment', paymentSchema);
