const mongoose = require('mongoose');

const machineReportSchema = new mongoose.Schema({
  machine_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    required: true
  },
  cajon: {
    type: Number,
    default: 0
  },
  fondo: {
    type: Number,
    default: 0
  }
});

const exitReportSchema = new mongoose.Schema({
  local_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local',
    required: true
  },
  user_id: {
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
  total_coins: {
    type: Number,
    default: 0
  },
  machines_report: [machineReportSchema],
  additional_expenses: [{
    concept: String,
    amount: Number
  }],
  total_cajon: {
    type: Number,
    default: 0
  },
  total_fondo: {
    type: Number,
    default: 0
  },
  total_expenses: {
    type: Number,
    default: 0
  },
  grand_total: {
    type: Number,
    default: 0
  },
  notes: String,
  photo_url: String, // Foto de evidencia
  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'approved', 'rejected'],
    default: 'submitted'
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewed_at: Date,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ExitReport', exitReportSchema);
