const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  check_in: Date,
  check_out: Date,
  type: {
    type: String,
    enum: ['present', 'late', 'absent', 'permission'],
    required: true
  },
  minutes_late: {
    type: Number,
    default: 0
  },
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
