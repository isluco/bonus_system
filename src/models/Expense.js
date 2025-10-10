const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  local_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local'
  },
  type: {
    type: String,
    enum: ['gasoline', 'parts', 'wash', 'cleaning', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: String,
  photo_url: String,
  distance_km: Number, // para gasolina
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: Date,
  rejection_reason: String,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);