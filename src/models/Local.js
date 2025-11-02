const mongoose = require('mongoose');

const localSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  initial_fund: {
    type: Number,
    required: true,
    default: 0
  },
  current_fund: {
    type: Number,
    required: true,
    default: 0
  },
  minimum_fund: {
    type: Number,
    required: true,
    default: 1500
  },
  photo_url: String,
  assigned_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assigned_machines: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine'
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  services: [{
    type: {
      type: String,
      enum: ['electricity', 'water', 'internet', 'rent']
    },
    provider: String,
    account_number: String,
    amount: Number,
    due_date: Number, // día del mes (1-31)
    reminder_days: {
      type: Number,
      default: 7
    },
    is_active: {
      type: Boolean,
      default: true
    }
  }],
  schedule: {
    open_time: {
      type: String,
      default: '10:00'
    },
    close_time: {
      type: String,
      default: '22:00'
    },
    days: {
      type: [String],
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Local', localSchema);