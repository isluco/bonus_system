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

module.exports = mongoose.model('Payment', paymentSchema);
