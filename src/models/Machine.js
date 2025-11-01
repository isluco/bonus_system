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
  serial_number: {
    type: String,
    default: ''
  },
  brand: {
    type: String,
    default: ''
  },
  model: {
    type: String,
    default: ''
  },
  local_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'stopped', 'maintenance', 'retired'],
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