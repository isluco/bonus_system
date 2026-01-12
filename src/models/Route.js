const mongoose = require('mongoose');

const routeVisitSchema = new mongoose.Schema({
  local_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local'
  },
  activity: String,
  arrival_time: Date,
  departure_time: Date,
  photo_url: String
});

const routeSchema = new mongoose.Schema({
  moto_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Moto',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Tareas asociadas a esta ruta
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  start_location: {
    lat: Number,
    lng: Number,
    address: String
  },
  end_location: {
    lat: Number,
    lng: Number,
    address: String
  },
  start_time: Date,
  end_time: Date,
  distance_km: Number,
  duration_minutes: Number,
  path: [{
    lat: Number,
    lng: Number,
    timestamp: Date
  }],
  visits: [routeVisitSchema],
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Route', routeSchema);