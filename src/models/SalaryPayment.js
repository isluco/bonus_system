const mongoose = require('mongoose');

const salaryPaymentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  local_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local'
  },
  paid_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  period_start: {
    type: Date,
    required: true
  },
  period_end: {
    type: Date,
    required: true
  },
  base_salary: {
    type: Number,
    required: true
  },
  active_loan: {
    loan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan'
    },
    weekly_payment: Number,
    remaining_balance: Number
  },
  deductions: [{
    concept: String,
    amount: Number
  }],
  bonuses: [{
    concept: String,
    amount: Number
  }],
  total_deductions: {
    type: Number,
    default: 0
  },
  total_bonuses: {
    type: Number,
    default: 0
  },
  net_salary: {
    type: Number,
    required: true
  },
  digital_signature: String, // Base64 de la firma del empleado
  payment_method: {
    type: String,
    enum: ['cash', 'transfer', 'check'],
    default: 'cash'
  },
  evidence_photo: String, // Foto del recibo firmado
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'paid'
  },
  payment_date: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SalaryPayment', salaryPaymentSchema);
