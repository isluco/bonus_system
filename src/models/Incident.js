const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moto_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Moto'
  },
  reason: {
    type: String,
    required: true
  },
  description: String,
  photo_url: String, // Evidencia del incidente
  location: {
    lat: Number,
    lng: Number
  },
  status: {
    type: String,
    enum: ['reported', 'reviewing', 'resolved', 'rejected'],
    default: 'reported'
  },
  resolved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution_notes: String,
  resolved_at: Date,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Incident', incidentSchema);
