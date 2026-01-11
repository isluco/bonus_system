const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['change', 'failure', 'prize', 'refill', 'expense', 'prize_payment', 'alert'],
    required: true
  },
  local_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local',
    required: true
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['created', 'assigned', 'accepted', 'in_route', 'on_site', 'in_process', 'completed', 'cancelled', 'rejected', 'expired'],
    default: 'created'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  description: String,
  
  // Para cambios
  change_details: {
    coins_5: Number,
    coins_10: Number,
    total: Number
  },
  
  // Para fallas
  machine_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine'
  },
  error_code: String, // 01-15
  error_description: String,
  client_name: String,
  
  // Para premios y rellenos
  amount: Number,
  initial_fund: Number,
  final_fund: Number,
  
  // Para rellenos
  refill_type: {
    type: String,
    enum: ['cajon', 'fondo']
  },
  refill_coins_5: Number,
  refill_coins_10: Number,
  person_in_charge: String,
  
  // Evidencias
  photos: [String],
  
  // Tiempos
  created_at: {
    type: Date,
    default: Date.now
  },
  assigned_at: Date,
  accepted_at: Date,
  in_route_at: Date,
  on_site_at: Date,
  completed_at: Date,
  
  // Confirmaciones
  local_confirmation: {
    type: Boolean,
    default: false
  },
  moto_confirmation: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);
