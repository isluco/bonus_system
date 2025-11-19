const mongoose = require('mongoose');

const motoServiceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['oil_change', 'brake_pads', 'general'],
    required: true
  },
  km_at_service: Number,
  cost: Number,
  description: String,
  completed: {
    type: Boolean,
    default: false
  },
  completed_at: Date
});

const motoSchema = new mongoose.Schema({
  assigned_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  brand: String,
  model: String,
  plate: {
    type: String,
    unique: true
  },
  circulation_card: String,
  initial_km: Number,
  current_km: Number,
  last_service_km: Number,
  photo_url: String,
  assigned_fund: {
    type: Number,
    default: 0
  },
  current_fund: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'in_service', 'inactive'],
    default: 'active'
  },
  services: [motoServiceSchema],
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Moto', motoSchema);