const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'moto', 'local'],
    required: true
  },
  full_name: {
    type: String,
    required: true
  },
  phone: String,
  address: String,
  photo_url: String,
  ine_document: String,
  nss: String,
  license: String, // solo para motos
  employee_id: {
    type: String,
    unique: true,
    sparse: true
  },
  assigned_local_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Local'
  },
  weekly_salary: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  },
  delegated_permissions: [{
    type: String
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  last_login: Date,
  // Push Notifications (Firebase Cloud Messaging)
  fcm_token: {
    type: String,
    default: null
  },
  fcm_platform: {
    type: String,
    enum: ['android', 'ios'],
    default: 'android'
  },
  fcm_updated_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Método para comparar passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// No retornar password en JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
