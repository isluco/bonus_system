const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  local_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local'
  },
  date: {
    type: Date,
    required: true
  },
  // Check-in data
  check_in: Date, // Hora del servidor
  check_in_device_time: Date, // Hora del dispositivo
  check_in_location: {
    lat: Number,
    lng: Number,
    accuracy: Number // Precisión del GPS en metros
  },
  check_in_photo: String, // URL de Cloudinary

  // Check-out data
  check_out: Date, // Hora del servidor
  check_out_device_time: Date, // Hora del dispositivo
  check_out_location: {
    lat: Number,
    lng: Number,
    accuracy: Number
  },
  check_out_photo: String, // URL de Cloudinary

  // Status y control
  type: {
    type: String,
    enum: ['present', 'late', 'absent', 'permission'],
    default: 'present'
  },
  minutes_late: {
    type: Number,
    default: 0
  },

  // Horarios esperados (del local)
  expected_check_in: Date,
  expected_check_out: Date,

  permission_reason: String,
  notes: String,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice compuesto para evitar duplicados
attendanceSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
