const mongoose = require('mongoose');

const motoLocationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  accuracy: {
    type: Number, // metros de precisión
    default: 0
  },
  speed: {
    type: Number, // km/h
    default: 0
  },
  heading: {
    type: Number, // dirección en grados
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now,
    expires: 259200 // TTL: 3 días en segundos (3 * 24 * 60 * 60)
  }
});

// Índice geoespacial para búsquedas por ubicación
motoLocationSchema.index({ location: '2dsphere' });

// Índice para buscar por usuario y obtener la última ubicación
motoLocationSchema.index({ user_id: 1, created_at: -1 });

// Método estático para obtener la última ubicación de un usuario
motoLocationSchema.statics.getLastLocation = async function(userId) {
  return this.findOne({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(1);
};

// Método estático para obtener las últimas ubicaciones de todas las motos activas
motoLocationSchema.statics.getAllLastLocations = async function() {
  return this.aggregate([
    {
      $sort: { created_at: -1 }
    },
    {
      $group: {
        _id: '$user_id',
        location: { $first: '$location' },
        accuracy: { $first: '$accuracy' },
        speed: { $first: '$speed' },
        created_at: { $first: '$created_at' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $match: {
        'user.role': 'moto',
        'user.status': 'active'
      }
    },
    {
      $project: {
        user_id: '$_id',
        user_name: '$user.full_name',
        location: 1,
        accuracy: 1,
        speed: 1,
        created_at: 1
      }
    }
  ]);
};

module.exports = mongoose.model('MotoLocation', motoLocationSchema);
