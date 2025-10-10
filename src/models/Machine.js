const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  folio: {
    type: String,
    required: true,
    unique: true
  },
  local_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'stopped', 'maintenance'],
    default: 'active'
  },
  installation_date: {
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

module.exports = mongoose.model('Machine', machineSchema);