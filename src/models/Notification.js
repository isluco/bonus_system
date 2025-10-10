const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['task', 'payment', 'alert', 'approval', 'reminder', 'panic'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: String,
  related_entity_type: String,
  related_entity_id: mongoose.Schema.Types.ObjectId,
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  is_read: {
    type: Boolean,
    default: false
  },
  read_at: Date,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);