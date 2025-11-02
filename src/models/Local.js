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
  services: {
    luz: {
      active: {
        type: Boolean,
        default: false
      },
      account: {
        type: String,
        default: ''
      },
      cutoff_date: {
        type: Number,
        min: 1,
        max: 31
      },
      amount: {
        type: Number,
        default: 0
      },
      notice_days: {
        type: Number,
        default: 3
      }
    },
    internet: {
      active: {
        type: Boolean,
        default: false
      },
      account: {
        type: String,
        default: ''
      },
      cutoff_date: {
        type: Number,
        min: 1,
        max: 31
      },
      amount: {
        type: Number,
        default: 0
      },
      provider: {
        type: String,
        default: ''
      }
    },
    agua: {
      active: {
        type: Boolean,
        default: false
      },
      amount: {
        type: Number,
        default: 0
      },
      cutoff_date: {
        type: Number,
        min: 1,
        max: 31
      }
    },
    renta: {
      active: {
        type: Boolean,
        default: false
      },
      amount: {
        type: Number,
        default: 0
      },
      payment_date: {
        type: Number,
        min: 1,
        max: 31
      }
    }
  },
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