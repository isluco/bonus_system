const mongoose = require('mongoose');

const changeRequestSchema = new mongoose.Schema({
  local_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local',
    required: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coins_5: {
    type: Number,
    default: 0
  },
  coins_10: {
    type: Number,
    default: 0
  },
  total_amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: Date,
  assigned_to_moto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completed_at: Date,
  rejection_reason: String,
  notes: String,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChangeRequest', changeRequestSchema);
