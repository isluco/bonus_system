// Script para generar solicitudes de cambio de prueba
const mongoose = require('mongoose');
require('dotenv').config();

async function generateChangeRequests() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    const ChangeRequest = require('./src/models/ChangeRequest');
    const Local = require('./src/models/Local');
    const User = require('./src/models/User');

    // Obtener locales y usuarios
    const locales = await Local.find().limit(5);
    const localUser = await User.findOne({ role: 'local' }) || await User.findOne({ role: 'admin' });
    const motoUser = await User.findOne({ role: 'moto' });
    const adminUser = await User.findOne({ role: 'admin' });

    if (!locales.length || !localUser) {
      console.log('No se encontraron locales o usuarios');
      return;
    }

    // Eliminar solicitudes de prueba anteriores
    await ChangeRequest.deleteMany({});
    console.log('Solicitudes anteriores eliminadas');

    const now = new Date();

    // Diferentes configuraciones de solicitudes
    const requestConfigs = [
      // Pendientes con diferentes montos
      { coins_5: 500, coins_10: 300, status: 'pending', daysAgo: 0 },
      { coins_5: 1000, coins_10: 500, status: 'pending', daysAgo: 1 },
      { coins_5: 250, coins_10: 750, status: 'pending', daysAgo: 0 },
      { coins_5: 2000, coins_10: 1000, status: 'pending', daysAgo: 2 },

      // Aprobadas
      { coins_5: 800, coins_10: 400, status: 'approved', daysAgo: 3 },
      { coins_5: 1500, coins_10: 800, status: 'approved', daysAgo: 5 },

      // Completadas
      { coins_5: 600, coins_10: 600, status: 'completed', daysAgo: 7 },
      { coins_5: 1200, coins_10: 300, status: 'completed', daysAgo: 10 },
      { coins_5: 400, coins_10: 900, status: 'completed', daysAgo: 14 },

      // Rechazadas
      { coins_5: 5000, coins_10: 3000, status: 'rejected', daysAgo: 4, rejection_reason: 'Monto excede límite diario' },
      { coins_5: 100, coins_10: 50, status: 'rejected', daysAgo: 6, rejection_reason: 'Local sin fondos suficientes' },
    ];

    let created = 0;
    for (let i = 0; i < requestConfigs.length; i++) {
      const config = requestConfigs[i];
      const local = locales[i % locales.length];
      const total = config.coins_5 + config.coins_10;
      const createdAt = new Date(now.getTime() - (config.daysAgo * 24 * 60 * 60 * 1000));

      const requestData = {
        local_id: local._id,
        created_by: localUser._id,
        coins_5: config.coins_5,
        coins_10: config.coins_10,
        total_amount: total,
        status: config.status,
        created_at: createdAt
      };

      // Agregar datos según el estado
      if (config.status === 'approved' && motoUser) {
        requestData.approved_by = adminUser._id;
        requestData.approved_at = new Date(createdAt.getTime() + 3600000); // 1 hora después
        requestData.assigned_to_moto = motoUser._id;
      }

      if (config.status === 'completed' && motoUser) {
        requestData.approved_by = adminUser._id;
        requestData.approved_at = new Date(createdAt.getTime() + 3600000);
        requestData.assigned_to_moto = motoUser._id;
        requestData.completed_at = new Date(createdAt.getTime() + 7200000); // 2 horas después
      }

      if (config.status === 'rejected') {
        requestData.rejection_reason = config.rejection_reason;
      }

      await ChangeRequest.create(requestData);
      created++;
      console.log(`✅ Solicitud ${created}: $${total} (${config.status}) - ${local.name}`);
    }

    console.log(`\n========== RESUMEN ==========`);
    console.log(`Total creadas: ${created}`);

    const counts = await ChangeRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total_amount' } } }
    ]);

    counts.forEach(c => {
      console.log(`  ${c._id}: ${c.count} solicitudes, $${c.total.toLocaleString()} total`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

generateChangeRequests();
