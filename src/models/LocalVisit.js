const mongoose = require('mongoose');

const localVisitSchema = new mongoose.Schema({
  moto_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  local_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local',
    required: true
  },
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  visit_type: {
    type: String,
    enum: ['change', 'failure', 'prize', 'refill', 'inspection', 'other'],
    required: true
  },
  description: String,
  photo_url: String, // Evidencia de la visita
  check_in: {
    type: Date,
    default: Date.now
  },
  check_out: Date,
  location: {
    lat: Number,
    lng: Number
  },
  notes: String,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LocalVisit', localVisitSchema);
