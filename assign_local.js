require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Local = require('./src/models/Local');

async function assignLocal() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Buscar el usuario
    const user = await User.findOne({ email: 'isluco2004@gmail.com' });
    if (!user) {
      console.log('❌ Usuario no encontrado');
      process.exit(1);
    }

    console.log('✅ Usuario encontrado:', user.full_name, '- Role:', user.role);

    // Buscar un local disponible
    const local = await Local.findOne();
    if (!local) {
      console.log('❌ No hay locales en la base de datos');
      process.exit(1);
    }

    console.log('✅ Local encontrado:', local.name);

    // Asignar el local al usuario
    user.assigned_local_id = local._id;
    await user.save();

    console.log('✅ Local asignado exitosamente!');
    console.log('Usuario:', user.full_name);
    console.log('Local:', local.name);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

assignLocal();
