const mongoose = require('mongoose');

const motoKilometrageHistorySchema = new mongoose.Schema({
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
  kilometrage: {
    type: Number,
    required: true
  },
  previous_kilometrage: Number,
  difference: Number, // km recorridos desde el último registro
  location: {
    lat: Number,
    lng: Number
  },
  photo_url: String, // Foto del odómetro (opcional)
  notes: String,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice para consultas rápidas por moto
motoKilometrageHistorySchema.index({ moto_id: 1, created_at: -1 });

module.exports = mongoose.model('MotoKilometrageHistory', motoKilometrageHistorySchema);
