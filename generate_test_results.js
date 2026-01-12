// Script para generar datos de prueba para resultados de local
const mongoose = require('mongoose');
require('dotenv').config();

const LOCAL_ID = '695dd367f8956d7ff8a8efbb';

async function generateTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Importar modelos
    const ExitReport = require('./src/models/ExitReport');
    const Task = require('./src/models/Task');
    const Expense = require('./src/models/Expense');
    const ServicePayment = require('./src/models/ServicePayment');
    const Local = require('./src/models/Local');
    const User = require('./src/models/User');

    // Verificar que el local existe
    const local = await Local.findById(LOCAL_ID);
    if (!local) {
      console.log('Local no encontrado');
      return;
    }
    console.log(`Local encontrado: ${local.name}`);

    // Obtener un usuario admin para los registros
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('No se encontró usuario admin');
      return;
    }

    const now = new Date();
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5);

    // 1. Crear ExitReports (Corte bruto)
    console.log('\n--- Creando ExitReports ---');
    const exitReports = [
      {
        local_id: LOCAL_ID,
        user_id: adminUser._id,
        coins_5: 5000,
        coins_10: 8000,
        total_coins: 13000,
        machines_report: [],
        total_cajon: 25000,
        total_fondo: 12000,
        total_expenses: 1300,
        grand_total: 48700,
        status: 'approved',
        created_at: weekAgo
      },
      {
        local_id: LOCAL_ID,
        user_id: adminUser._id,
        coins_5: 3000,
        coins_10: 5000,
        total_coins: 8000,
        machines_report: [],
        total_cajon: 18000,
        total_fondo: 8000,
        total_expenses: 800,
        grand_total: 33200,
        status: 'approved',
        created_at: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3)
      }
    ];

    for (const report of exitReports) {
      const existing = await ExitReport.findOne({
        local_id: LOCAL_ID,
        grand_total: report.grand_total
      });
      if (!existing) {
        await ExitReport.create(report);
        console.log(`ExitReport creado: $${report.grand_total}`);
      } else {
        console.log(`ExitReport ya existe: $${report.grand_total}`);
      }
    }

    // 2. Crear Tasks de tipo prize (Premios)
    console.log('\n--- Creando Premios ---');
    const prizes = [
      { amount: 12000, client_name: 'Juan Pérez', created_at: weekAgo },
      { amount: 8500, client_name: 'María García', created_at: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4) },
      { amount: 5400, client_name: 'Carlos López', created_at: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2) }
    ];

    for (const prize of prizes) {
      const existing = await Task.findOne({
        local_id: LOCAL_ID,
        type: 'prize',
        amount: prize.amount
      });
      if (!existing) {
        await Task.create({
          local_id: LOCAL_ID,
          type: 'prize',
          amount: prize.amount,
          client_name: prize.client_name,
          status: 'completed',
          created_by: adminUser._id,
          created_at: prize.created_at
        });
        console.log(`Premio creado: $${prize.amount} - ${prize.client_name}`);
      } else {
        console.log(`Premio ya existe: $${prize.amount}`);
      }
    }

    // 3. Crear Expenses de moto
    console.log('\n--- Creando Gastos de Moto ---');
    const motoExpenses = [
      { type: 'gasoline', amount: 250, description: 'Gasolina semana' },
      { type: 'parts', amount: 150, description: 'Cambio de aceite' }
    ];

    for (const expense of motoExpenses) {
      const existing = await Expense.findOne({
        local_id: LOCAL_ID,
        type: expense.type,
        amount: expense.amount
      });
      if (!existing) {
        await Expense.create({
          local_id: LOCAL_ID,
          user_id: adminUser._id,
          type: expense.type,
          amount: expense.amount,
          description: expense.description,
          status: 'approved',
          created_at: weekAgo
        });
        console.log(`Gasto moto creado: $${expense.amount} - ${expense.description}`);
      } else {
        console.log(`Gasto moto ya existe: $${expense.amount}`);
      }
    }

    // 4. Crear Expenses de limpieza
    console.log('\n--- Creando Gastos de Limpieza ---');
    const cleaningExpense = {
      type: 'cleaning',
      amount: 600,
      description: 'Limpieza semanal del local'
    };

    const existingCleaning = await Expense.findOne({
      local_id: LOCAL_ID,
      type: 'cleaning',
      amount: cleaningExpense.amount
    });
    if (!existingCleaning) {
      await Expense.create({
        local_id: LOCAL_ID,
        user_id: adminUser._id,
        ...cleaningExpense,
        status: 'approved',
        created_at: weekAgo
      });
      console.log(`Gasto limpieza creado: $${cleaningExpense.amount}`);
    } else {
      console.log(`Gasto limpieza ya existe: $${cleaningExpense.amount}`);
    }

    // 5. Crear ServicePayments (Servicios fijos)
    console.log('\n--- Creando Pagos de Servicios ---');
    const services = [
      { service_type: 'luz', amount: 350 },
      { service_type: 'internet', amount: 450 },
      { service_type: 'agua', amount: 180 },
      { service_type: 'renta', amount: 3500 }
    ];

    for (const service of services) {
      const existing = await ServicePayment.findOne({
        local_id: LOCAL_ID,
        service_type: service.service_type,
        'period.month': now.getMonth() + 1,
        'period.year': now.getFullYear()
      });
      if (!existing) {
        await ServicePayment.create({
          local_id: LOCAL_ID,
          service_type: service.service_type,
          amount: service.amount,
          period: {
            month: now.getMonth() + 1,
            year: now.getFullYear()
          },
          due_date: new Date(now.getFullYear(), now.getMonth(), 15),
          paid_date: weekAgo,
          status: 'paid',
          created_at: weekAgo
        });
        console.log(`Servicio creado: ${service.service_type} - $${service.amount}`);
      } else {
        console.log(`Servicio ya existe: ${service.service_type}`);
      }
    }

    // Resumen
    console.log('\n========== RESUMEN ==========');
    const totalCorteBruto = exitReports.reduce((sum, r) => sum + r.grand_total, 0);
    const totalPremios = prizes.reduce((sum, p) => sum + p.amount, 0);
    const totalMoto = motoExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalLimpieza = cleaningExpense.amount;
    const totalServicios = services.reduce((sum, s) => sum + s.amount, 0);
    const totalGastos = totalPremios + totalMoto + totalLimpieza + totalServicios;

    console.log(`Corte Bruto: $${totalCorteBruto.toLocaleString()}`);
    console.log(`Premios: $${totalPremios.toLocaleString()}`);
    console.log(`Moto: $${totalMoto.toLocaleString()}`);
    console.log(`Limpieza: $${totalLimpieza.toLocaleString()}`);
    console.log(`Servicios: $${totalServicios.toLocaleString()}`);
    console.log(`Total Gastos: $${totalGastos.toLocaleString()}`);
    console.log(`Resultado Final: $${(totalCorteBruto - totalGastos).toLocaleString()}`);

    console.log('\n¡Datos de prueba generados exitosamente!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

generateTestData();
