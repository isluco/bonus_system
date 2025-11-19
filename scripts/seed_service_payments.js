require('dotenv').config();
const mongoose = require('mongoose');
const Local = require('../src/models/Local');
const ServicePayment = require('../src/models/ServicePayment');

async function seedServicePayments() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // =============================================
    // PASO 1: ACTUALIZAR LOCALES CON SERVICIOS ACTIVOS
    // =============================================
    console.log('🏢 PASO 1: Actualizando locales con servicios activos...');
    console.log('='.repeat(60));

    const locals = await Local.find();
    console.log(`Encontrados ${locals.length} locales\n`);

    for (let i = 0; i < locals.length; i++) {
      const local = locals[i];

      // Activar servicios para cada local con datos realistas
      local.services = {
        luz: {
          active: true,
          account: `CFE-${1000 + i}${Math.floor(Math.random() * 9000)}`,
          cutoff_date: 15 + (i * 5) % 15, // Fechas distribuidas: 15, 20, 25, 30
          amount: 800 + Math.floor(Math.random() * 700), // Entre $800 y $1500
          notice_days: 3
        },
        internet: {
          active: i % 2 === 0, // Solo algunos tienen internet
          account: `INT-${2000 + i}${Math.floor(Math.random() * 9000)}`,
          cutoff_date: 1 + (i * 7) % 28, // Fechas distribuidas
          amount: 400 + Math.floor(Math.random() * 400), // Entre $400 y $800
          provider: ['Telmex', 'Totalplay', 'Izzi', 'Megacable'][i % 4]
        },
        agua: {
          active: i % 3 !== 0, // La mayoría tiene agua
          amount: 200 + Math.floor(Math.random() * 300), // Entre $200 y $500
          cutoff_date: 10 + (i * 6) % 20 // Fechas distribuidas
        },
        renta: {
          active: true,
          amount: 3000 + Math.floor(Math.random() * 3000), // Entre $3000 y $6000
          payment_date: 1 + (i * 2) % 5 // Fechas: 1, 3, 5 del mes
        }
      };

      await local.save();
      console.log(`✅ ${local.name}:`);
      console.log(`   - Luz: ${local.services.luz.active ? `$${local.services.luz.amount} (Corte día ${local.services.luz.cutoff_date})` : 'Inactivo'}`);
      console.log(`   - Internet: ${local.services.internet.active ? `$${local.services.internet.amount} (${local.services.internet.provider})` : 'Inactivo'}`);
      console.log(`   - Agua: ${local.services.agua.active ? `$${local.services.agua.amount}` : 'Inactivo'}`);
      console.log(`   - Renta: $${local.services.renta.amount} (Día ${local.services.renta.payment_date})\n`);
    }

    console.log('='.repeat(60) + '\n');

    // =============================================
    // PASO 2: GENERAR PAGOS DE SERVICIOS
    // =============================================
    console.log('💳 PASO 2: Generando pagos de servicios...');
    console.log('='.repeat(60));

    // Limpiar pagos existentes (opcional)
    await ServicePayment.deleteMany({});
    console.log('🗑️  Pagos anteriores eliminados\n');

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const payments = [];

    for (const local of locals) {
      // Generar pagos para los últimos 3 meses y próximos 2 meses
      for (let monthOffset = -3; monthOffset <= 2; monthOffset++) {
        const targetDate = new Date(currentYear, currentMonth + monthOffset, 1);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();

        // Pago de LUZ
        if (local.services.luz?.active) {
          const dueDate = new Date(targetYear, targetMonth, local.services.luz.cutoff_date);
          const isPast = dueDate < currentDate;
          const isNear = Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24)) <= 7;

          let status = 'pending';
          let paidDate = null;

          // Los pagos del pasado están pagados (80%)
          if (isPast && Math.random() > 0.2) {
            status = 'paid';
            paidDate = new Date(dueDate.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000);
          } else if (isPast) {
            status = 'overdue';
          }

          payments.push({
            local_id: local._id,
            service_type: 'luz',
            amount: local.services.luz.amount,
            due_date: dueDate,
            paid_date: paidDate,
            status,
            account_number: local.services.luz.account
          });
        }

        // Pago de INTERNET
        if (local.services.internet?.active) {
          const dueDate = new Date(targetYear, targetMonth, local.services.internet.cutoff_date);
          const isPast = dueDate < currentDate;

          let status = 'pending';
          let paidDate = null;

          if (isPast && Math.random() > 0.15) {
            status = 'paid';
            paidDate = new Date(dueDate.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000);
          } else if (isPast) {
            status = 'overdue';
          }

          payments.push({
            local_id: local._id,
            service_type: 'internet',
            amount: local.services.internet.amount,
            due_date: dueDate,
            paid_date: paidDate,
            status,
            account_number: local.services.internet.account
          });
        }

        // Pago de AGUA
        if (local.services.agua?.active) {
          const dueDate = new Date(targetYear, targetMonth, local.services.agua.cutoff_date);
          const isPast = dueDate < currentDate;

          let status = 'pending';
          let paidDate = null;

          if (isPast && Math.random() > 0.25) {
            status = 'paid';
            paidDate = new Date(dueDate.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000);
          } else if (isPast) {
            status = 'overdue';
          }

          payments.push({
            local_id: local._id,
            service_type: 'agua',
            amount: local.services.agua.amount,
            due_date: dueDate,
            paid_date: paidDate,
            status,
            account_number: 'AGUA-' + Math.floor(Math.random() * 100000)
          });
        }

        // Pago de RENTA
        if (local.services.renta?.active) {
          const dueDate = new Date(targetYear, targetMonth, local.services.renta.payment_date);
          const isPast = dueDate < currentDate;

          let status = 'pending';
          let paidDate = null;

          if (isPast && Math.random() > 0.1) {
            status = 'paid';
            paidDate = new Date(dueDate.getTime() - Math.random() * 2 * 24 * 60 * 60 * 1000);
          } else if (isPast) {
            status = 'overdue';
          }

          payments.push({
            local_id: local._id,
            service_type: 'renta',
            amount: local.services.renta.amount,
            due_date: dueDate,
            paid_date: paidDate,
            status
          });
        }
      }
    }

    // Insertar todos los pagos
    const created = await ServicePayment.insertMany(payments);
    console.log(`✅ Creados ${created.length} pagos de servicios\n`);

    // =============================================
    // PASO 3: ESTADÍSTICAS
    // =============================================
    console.log('📊 PASO 3: Estadísticas de pagos generados...');
    console.log('='.repeat(60));

    const stats = {
      total: await ServicePayment.countDocuments(),
      pending: await ServicePayment.countDocuments({ status: 'pending' }),
      paid: await ServicePayment.countDocuments({ status: 'paid' }),
      overdue: await ServicePayment.countDocuments({ status: 'overdue' }),
      byType: {
        luz: await ServicePayment.countDocuments({ service_type: 'luz' }),
        internet: await ServicePayment.countDocuments({ service_type: 'internet' }),
        agua: await ServicePayment.countDocuments({ service_type: 'agua' }),
        renta: await ServicePayment.countDocuments({ service_type: 'renta' })
      }
    };

    console.log(`Total de pagos: ${stats.total}`);
    console.log(`\nPor estado:`);
    console.log(`  - Pendientes: ${stats.pending}`);
    console.log(`  - Pagados: ${stats.paid}`);
    console.log(`  - Vencidos: ${stats.overdue}`);
    console.log(`\nPor tipo de servicio:`);
    console.log(`  - Luz: ${stats.byType.luz}`);
    console.log(`  - Internet: ${stats.byType.internet}`);
    console.log(`  - Agua: ${stats.byType.agua}`);
    console.log(`  - Renta: ${stats.byType.renta}`);

    // Calcular totales
    const pendingPayments = await ServicePayment.find({ status: { $in: ['pending', 'overdue'] } });
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    console.log(`\n💰 Total pendiente de pago: $${totalPending.toLocaleString('es-MX')}`);
    console.log('='.repeat(60));

    console.log('\n✅ ¡Seed de pagos de servicios completado exitosamente!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedServicePayments();
