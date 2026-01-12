// Script para generar préstamos de prueba con plan de pagos
const mongoose = require('mongoose');
require('dotenv').config();

async function generateLoans() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    const Loan = require('./src/models/Loan');
    const User = require('./src/models/User');

    // Obtener usuarios
    const users = await User.find({ role: { $in: ['moto', 'local'] } }).limit(3);
    const adminUser = await User.findOne({ role: 'admin' });

    if (users.length === 0) {
      console.log('No se encontraron usuarios para asignar préstamos');
      return;
    }

    // Eliminar préstamos anteriores de prueba
    await Loan.deleteMany({});
    console.log('Préstamos anteriores eliminados');

    const now = new Date();

    // Configuraciones de préstamos
    const loanConfigs = [
      {
        user: users[0],
        total: 5000,
        weekly: 200,
        weeksTotal: 25,
        weeksPaid: 10,
        name: 'Yolanda'
      },
      {
        user: users[1] || users[0],
        total: 3000,
        weekly: 150,
        weeksTotal: 20,
        weeksPaid: 5,
        name: 'Carlos'
      },
      {
        user: users[2] || users[0],
        total: 8000,
        weekly: 400,
        weeksTotal: 20,
        weeksPaid: 2,
        name: 'María'
      }
    ];

    for (const config of loanConfigs) {
      // Generar plan de pagos
      const paymentSchedule = [];
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - (config.weeksPaid * 7)); // Empezar hace X semanas

      for (let i = 0; i < config.weeksTotal; i++) {
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(scheduledDate.getDate() + (i * 7));

        const isPaid = i < config.weeksPaid;

        paymentSchedule.push({
          scheduled_date: scheduledDate,
          payment_amount: config.weekly,
          paid_date: isPaid ? scheduledDate : null,
          status: isPaid ? 'completed' : 'scheduled'
        });
      }

      // Calcular saldo restante
      const paidAmount = config.weeksPaid * config.weekly;
      const remainingBalance = config.total - paidAmount;

      const loan = await Loan.create({
        user_id: config.user._id,
        total_amount: config.total,
        weekly_payment: config.weekly,
        remaining_balance: remainingBalance,
        reason: 'Préstamo personal',
        status: 'active',
        approved_by: adminUser._id,
        approved_at: new Date(now.getTime() - (config.weeksPaid * 7 * 24 * 60 * 60 * 1000)),
        payment_schedule: paymentSchedule,
        created_at: new Date(now.getTime() - ((config.weeksPaid + 1) * 7 * 24 * 60 * 60 * 1000))
      });

      console.log(`\n✅ Préstamo creado para ${config.user.full_name || config.name}:`);
      console.log(`   Monto: $${config.total.toLocaleString()}`);
      console.log(`   Pago semanal: $${config.weekly}`);
      console.log(`   Saldo restante: $${remainingBalance.toLocaleString()}`);
      console.log(`   Pagos completados: ${config.weeksPaid}/${config.weeksTotal}`);
    }

    console.log('\n========== RESUMEN ==========');
    const totalLoans = await Loan.countDocuments();
    console.log(`Total de préstamos: ${totalLoans}`);

    const activeLoans = await Loan.countDocuments({ status: 'active' });
    console.log(`Préstamos activos: ${activeLoans}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

generateLoans();
