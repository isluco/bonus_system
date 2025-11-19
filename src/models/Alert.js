const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
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
  alert_type: {
    type: String,
    enum: ['panic', 'emergency', 'security', 'technical', 'other'],
    default: 'panic'
  },
  description: String,
  photo_url: String,
  location: {
    lat: Number,
    lng: Number
  },
  status: {
    type: String,
    enum: ['active', 'attending', 'resolved', 'false_alarm'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'urgent'
  },
  attended_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  attended_at: Date,
  resolved_at: Date,
  resolution_notes: String,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);
