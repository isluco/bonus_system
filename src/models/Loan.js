const mongoose = require('mongoose');

const loanPaymentSchema = new mongoose.Schema({
  scheduled_date: Date,
  payment_amount: Number,
  paid_date: Date,
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'missed'],
    default: 'scheduled'
  }
});

const loanSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  total_amount: {
    type: Number,
    required: true
  },
  weekly_payment: {
    type: Number,
    required: true
  },
  remaining_balance: {
    type: Number,
    required: true
  },
  reason: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  digital_signature: String, // Base64 de la firma
  payment_schedule: [loanPaymentSchema],
  created_at: {
    type: Date,
    default: Date.now
  },
  approved_at: Date,
  rejection_reason: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Loan', loanSchema);