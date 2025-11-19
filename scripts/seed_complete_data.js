require('dotenv').config();
const mongoose = require('mongoose');

// Importar todos los modelos
const User = require('../src/models/User');
const Local = require('../src/models/Local');
const Moto = require('../src/models/Moto');
const Machine = require('../src/models/Machine');
const Task = require('../src/models/Task');
const Expense = require('../src/models/Expense');
const Loan = require('../src/models/Loan');
const Incident = require('../src/models/Incident');
const LocalVisit = require('../src/models/LocalVisit');
const MotoKilometrageHistory = require('../src/models/MotoKilometrageHistory');
const ChangeRequest = require('../src/models/ChangeRequest');
const Alert = require('../src/models/Alert');
const ExitReport = require('../src/models/ExitReport');
const SalaryPayment = require('../src/models/SalaryPayment');
const Attendance = require('../src/models/Attendance');
const Payment = require('../src/models/Payment');

async function seedCompleteData() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // =============================================
    // PASO 1: MIGRAR MOTO EXISTENTE
    // =============================================
    console.log('🏍️  PASO 1: Migrando Moto existente...');
    console.log('='.repeat(60));

    const existingMoto = await Moto.findOne();
    if (existingMoto) {
      existingMoto.assigned_fund = 10000;
      existingMoto.current_fund = 7500;
      existingMoto.current_km = existingMoto.current_km || 15234;
      existingMoto.initial_km = existingMoto.initial_km || 12000;
      existingMoto.last_service_km = existingMoto.last_service_km || 14500;
      await existingMoto.save();
      console.log(`✅ Moto migrada: ${existingMoto.plate}`);
      console.log(`   - assigned_fund: $${existingMoto.assigned_fund}`);
      console.log(`   - current_fund: $${existingMoto.current_fund}`);
      console.log(`   - current_km: ${existingMoto.current_km} km`);
    } else {
      console.log('⚠️  No se encontró moto existente');
    }
    console.log('='.repeat(60) + '\n');

    // =============================================
    // PASO 2: OBTENER USUARIOS Y LOCALES EXISTENTES
    // =============================================
    console.log('👥 PASO 2: Obteniendo usuarios y locales...');
    console.log('='.repeat(60));

    const adminUser = await User.findOne({ role: 'admin' });
    const motoUser = await User.findOne({ role: 'moto' });
    const localUsers = await User.find({ role: 'local' });
    const locals = await Local.find();
    const motos = await Moto.find();
    const machines = await Machine.find();

    console.log(`✅ Admin: ${adminUser?.full_name}`);
    console.log(`✅ Moto: ${motoUser?.full_name}`);
    console.log(`✅ Locales usuarios: ${localUsers.length}`);
    console.log(`✅ Locales: ${locals.length}`);
    console.log(`✅ Motos: ${motos.length}`);
    console.log(`✅ Máquinas: ${machines.length}`);
    console.log('='.repeat(60) + '\n');

    if (!adminUser || !motoUser || localUsers.length === 0 || locals.length === 0) {
      console.log('❌ ERROR: Faltan usuarios o locales base. Ejecuta seed básico primero.');
      process.exit(1);
    }

    // Actualizar weekly_salary de usuarios locales
    console.log('💰 Actualizando salarios de usuarios...');
    for (const user of localUsers) {
      if (!user.weekly_salary || user.weekly_salary === 0) {
        user.weekly_salary = 2500 + Math.floor(Math.random() * 1500);
        await user.save();
        console.log(`   ${user.full_name}: $${user.weekly_salary}/semana`);
      }
    }
    console.log('');

    // =============================================
    // PASO 3: CREAR HISTORIAL DE KILOMETRAJE
    // =============================================
    console.log('📏 PASO 3: Creando historial de kilometraje...');
    console.log('='.repeat(60));

    const moto = motos[0];
    const kmHistory = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 30); // Últimos 30 días

    for (let i = 0; i < 10; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + (i * 3));

      const previousKm = i === 0 ? (moto.initial_km || 12000) : (12000 + (i * 200));
      const currentKm = previousKm + 200 + Math.floor(Math.random() * 100);

      kmHistory.push({
        moto_id: moto._id,
        user_id: motoUser._id,
        kilometrage: currentKm,
        previous_kilometrage: previousKm,
        difference: currentKm - previousKm,
        created_at: date
      });
    }

    await MotoKilometrageHistory.insertMany(kmHistory);
    console.log(`✅ Creados ${kmHistory.length} registros de kilometraje`);
    console.log('='.repeat(60) + '\n');

    // =============================================
    // PASO 4: CREAR INCIDENTES
    // =============================================
    console.log('🚨 PASO 4: Creando incidentes...');
    console.log('='.repeat(60));

    const incidents = [
      {
        user_id: motoUser._id,
        moto_id: moto._id,
        reason: 'Pinchazo de llanta trasera',
        description: 'Pinchazo durante ruta en zona centro. Requiere cambio de llanta.',
        location: { lat: 19.4326, lng: -99.1332 },
        status: 'reported',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        user_id: motoUser._id,
        moto_id: moto._id,
        reason: 'Falla en frenos',
        description: 'Los frenos están haciendo ruido extraño. Requiere revisión.',
        location: { lat: 19.4285, lng: -99.1277 },
        status: 'reviewing',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        user_id: motoUser._id,
        moto_id: moto._id,
        reason: 'Accidente menor',
        description: 'Roce con otro vehículo. Solo daños en espejo retrovisor.',
        location: { lat: 19.4370, lng: -99.1385 },
        status: 'resolved',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      }
    ];

    await Incident.insertMany(incidents);
    console.log(`✅ Creados ${incidents.length} incidentes`);
    console.log('='.repeat(60) + '\n');

    // =============================================
    // PASO 5: CREAR VISITAS A LOCALES
    // =============================================
    console.log('📍 PASO 5: Creando visitas a locales...');
    console.log('='.repeat(60));

    const visits = [];
    for (let i = 0; i < 15; i++) {
      const local = locals[Math.floor(Math.random() * locals.length)];
      const visitTypes = ['change', 'failure', 'prize', 'refill', 'inspection'];
      const visitType = visitTypes[Math.floor(Math.random() * visitTypes.length)];

      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 20));

      const checkIn = new Date(date);
      checkIn.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));

      const checkOut = new Date(checkIn);
      checkOut.setMinutes(checkOut.getMinutes() + 20 + Math.floor(Math.random() * 40));

      visits.push({
        moto_user_id: motoUser._id,
        local_id: local._id,
        visit_type: visitType,
        description: `Visita para ${visitType}`,
        location: { lat: 19.42 + Math.random() * 0.05, lng: -99.13 + Math.random() * 0.05 },
        check_in: checkIn,
        check_out: i % 3 === 0 ? null : checkOut,
        created_at: checkIn
      });
    }

    await LocalVisit.insertMany(visits);
    console.log(`✅ Creadas ${visits.length} visitas a locales`);
    console.log('='.repeat(60) + '\n');

    // =============================================
    // PASO 6: CREAR SOLICITUDES DE CAMBIO
    // =============================================
    console.log('💵 PASO 6: Creando solicitudes de cambio...');
    console.log('='.repeat(60));

    const changeRequests = [
      {
        local_id: locals[0]._id,
        created_by: localUsers[0]._id,
        coins_5: 200,
        coins_10: 100,
        total_amount: 2000,
        notes: 'Necesito cambio urgente para el fin de semana',
        status: 'pending',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        local_id: locals[1]._id,
        created_by: localUsers[1]._id,
        coins_5: 400,
        coins_10: 150,
        total_amount: 3500,
        notes: 'Cambio para la semana',
        status: 'approved',
        approved_by: adminUser._id,
        assigned_to_moto: moto._id,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        local_id: locals[2]._id,
        created_by: localUsers[0]._id,
        coins_5: 300,
        coins_10: 200,
        total_amount: 3500,
        notes: 'Cambio regular',
        status: 'completed',
        approved_by: adminUser._id,
        assigned_to_moto: moto._id,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    ];

    await ChangeRequest.insertMany(changeRequests);
    console.log(`✅ Creadas ${changeRequests.length} solicitudes de cambio`);
    console.log('='.repeat(60) + '\n');

    // =============================================
    // PASO 7: CREAR ALERTAS
    // =============================================
    console.log('🚨 PASO 7: Creando alertas...');
    console.log('='.repeat(60));

    const alerts = [
      {
        local_id: locals[0]._id,
        created_by: localUsers[0]._id,
        alert_type: 'panic',
        description: 'Alerta de pánico activada',
        location: { lat: 19.4326, lng: -99.1332 },
        status: 'resolved',
        priority: 'urgent',
        attended_by: adminUser._id,
        attended_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        resolved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        resolution_notes: 'Alerta resuelta, todo bajo control',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        local_id: locals[1]._id,
        created_by: localUsers[1]._id,
        alert_type: 'technical',
        description: 'Problema con máquina principal',
        location: { lat: 19.4285, lng: -99.1277 },
        status: 'attending',
        priority: 'high',
        attended_by: motoUser._id,
        attended_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        local_id: locals[2]._id,
        created_by: localUsers[0]._id,
        alert_type: 'security',
        description: 'Persona sospechosa cerca del local',
        location: { lat: 19.4370, lng: -99.1385 },
        status: 'active',
        priority: 'medium',
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000)
      }
    ];

    await Alert.insertMany(alerts);
    console.log(`✅ Creadas ${alerts.length} alertas`);
    console.log('='.repeat(60) + '\n');

    // =============================================
    // PASO 8: CREAR REPORTES DE SALIDA
    // =============================================
    console.log('📊 PASO 8: Creando reportes de salida...');
    console.log('='.repeat(60));

    const exitReports = [];
    for (let i = 0; i < 5; i++) {
      const local = locals[i % locals.length];
      const localUser = localUsers[i % localUsers.length];
      const localMachines = machines.filter(m => m.local_id?.toString() === local._id.toString());

      const machinesReport = localMachines.map(machine => ({
        machine_id: machine._id,
        cajon: 500 + Math.floor(Math.random() * 1000),
        fondo: 300 + Math.floor(Math.random() * 500),
        total: 800 + Math.floor(Math.random() * 1500)
      }));

      const additionalExpenses = [
        { concept: 'Compra de desayuno', amount: 150 },
        { concept: 'Limpieza extra', amount: 200 }
      ];

      const grandTotal = machinesReport.reduce((sum, m) => sum + m.total, 0) +
                        additionalExpenses.reduce((sum, e) => sum + e.amount, 0);

      exitReports.push({
        local_id: local._id,
        user_id: localUser._id,
        coins_5: 400 + Math.floor(Math.random() * 300),
        coins_10: 200 + Math.floor(Math.random() * 200),
        machines_report: machinesReport,
        additional_expenses: additionalExpenses,
        grand_total: grandTotal,
        notes: 'Reporte de salida normal',
        status: i === 0 ? 'submitted' : (i === 1 ? 'reviewed' : 'approved'),
        reviewed_by: i > 0 ? adminUser._id : null,
        reviewed_at: i > 0 ? new Date(Date.now() - (i - 1) * 24 * 60 * 60 * 1000) : null,
        created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      });
    }

    await ExitReport.insertMany(exitReports);
    console.log(`✅ Creados ${exitReports.length} reportes de salida`);
    console.log('='.repeat(60) + '\n');

    // =============================================
    // PASO 9: CREAR PRÉSTAMOS
    // =============================================
    console.log('💰 PASO 9: Creando préstamos...');
    console.log('='.repeat(60));

    const loans = [
      {
        user_id: localUsers[0]._id,
        total_amount: 4000,
        amount: 4000,
        weekly_payment: 1000,
        remaining_balance: 2000,
        reason: 'Gastos médicos',
        status: 'active',
        approved_by: adminUser._id,
        approved_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      },
      {
        user_id: localUsers[1]._id,
        total_amount: 6000,
        amount: 6000,
        weekly_payment: 1500,
        remaining_balance: 0,
        reason: 'Reparaciones del hogar',
        status: 'completed',
        approved_by: adminUser._id,
        approved_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        created_at: new Date(Date.now() - 61 * 24 * 60 * 60 * 1000)
      },
      {
        user_id: motoUser._id,
        total_amount: 5000,
        amount: 5000,
        weekly_payment: 1250,
        remaining_balance: 5000,
        reason: 'Educación de los hijos',
        status: 'pending',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    await Loan.insertMany(loans);
    console.log(`✅ Creados ${loans.length} préstamos`);
    console.log('='.repeat(60) + '\n');

    // =============================================
    // PASO 10: CREAR PAGOS DE SALARIO
    // =============================================
    console.log('💵 PASO 10: Creando pagos de salario...');
    console.log('='.repeat(60));

    const activeLoan = loans[0]; // El préstamo activo
    const salaryPayments = [
      {
        user_id: localUsers[0]._id,
        paid_by: motoUser._id,
        period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        period_end: new Date(),
        base_salary: localUsers[0].weekly_salary,
        active_loan: {
          loan_id: activeLoan._id,
          weekly_payment: activeLoan.weekly_payment,
          remaining_balance: activeLoan.remaining_balance + activeLoan.weekly_payment
        },
        deductions: [
          { concept: 'Préstamo semanal', amount: activeLoan.weekly_payment }
        ],
        bonuses: [
          { concept: 'Puntualidad', amount: 200 }
        ],
        total_deductions: activeLoan.weekly_payment,
        total_bonuses: 200,
        net_salary: localUsers[0].weekly_salary - activeLoan.weekly_payment + 200,
        status: 'paid',
        payment_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        user_id: localUsers[1]._id,
        paid_by: motoUser._id,
        period_start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        period_end: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        base_salary: localUsers[1].weekly_salary,
        deductions: [],
        bonuses: [],
        total_deductions: 0,
        total_bonuses: 0,
        net_salary: localUsers[1].weekly_salary,
        status: 'paid',
        payment_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      }
    ];

    await SalaryPayment.insertMany(salaryPayments);
    console.log(`✅ Creados ${salaryPayments.length} pagos de salario`);
    console.log('='.repeat(60) + '\n');

    // =============================================
    // PASO 11: CREAR GASTOS (EXPENSES)
    // =============================================
    console.log('💸 PASO 11: Creando gastos...');
    console.log('='.repeat(60));

    const expenses = [
      {
        user_id: motoUser._id,
        type: 'gasoline',
        amount: 500,
        description: 'Gasolina para la semana',
        distance_km: 250,
        status: 'pending',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        user_id: motoUser._id,
        type: 'parts',
        amount: 850,
        description: 'Cambio de aceite y filtro',
        status: 'approved',
        approved_by: adminUser._id,
        approved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      },
      {
        user_id: motoUser._id,
        type: 'wash',
        amount: 50,
        description: 'Lavado de moto',
        status: 'approved',
        approved_by: adminUser._id,
        approved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        user_id: motoUser._id,
        local_id: locals[0]._id,
        type: 'cleaning',
        amount: 200,
        description: 'Limpieza del local',
        status: 'pending',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        user_id: motoUser._id,
        type: 'other',
        amount: 300,
        description: 'Compra de desayuno',
        status: 'approved',
        approved_by: adminUser._id,
        approved_at: new Date(),
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];

    await Expense.insertMany(expenses);
    console.log(`✅ Creados ${expenses.length} gastos`);
    console.log('='.repeat(60) + '\n');

    // =============================================
    // PASO 12: CREAR TAREAS
    // =============================================
    console.log('📋 PASO 12: Creando tareas...');
    console.log('='.repeat(60));

    const tasks = [
      {
        type: 'change',
        local_id: locals[0]._id,
        assigned_to: motoUser._id,
        created_by: adminUser._id,
        description: 'Entregar cambio de monedas - $3500',
        priority: 'high',
        status: 'assigned',
        change_details: {
          coins_5: 400,
          coins_10: 150,
          total: 3500
        },
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        type: 'failure',
        local_id: locals[1]._id,
        machine_id: machines[0]?._id,
        assigned_to: motoUser._id,
        created_by: localUsers[0]._id,
        description: 'Máquina no paga premios correctamente',
        error_description: 'La máquina no está pagando los premios',
        priority: 'urgent',
        status: 'accepted',
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        type: 'prize',
        local_id: locals[2]._id,
        machine_id: machines[1]?._id,
        assigned_to: motoUser._id,
        created_by: localUsers[1]._id,
        description: 'Pagar premio de $5000',
        priority: 'urgent',
        status: 'in_process',
        amount: 5000,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        type: 'refill',
        local_id: locals[0]._id,
        machine_id: machines[0]?._id,
        assigned_to: motoUser._id,
        created_by: adminUser._id,
        description: 'Rellenar máquina 3 - Monedas $5',
        priority: 'normal',
        status: 'completed',
        refill_type: 'cajon',
        refill_coins_5: 200,
        person_in_charge: motoUser.full_name,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        type: 'expense',
        local_id: locals[1]._id,
        assigned_to: motoUser._id,
        created_by: localUsers[1]._id,
        description: 'Aprobar gasto de limpieza - $200',
        priority: 'low',
        status: 'created',
        amount: 200,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000)
      }
    ];

    await Task.insertMany(tasks);
    console.log(`✅ Creadas ${tasks.length} tareas`);
    console.log('='.repeat(60) + '\n');

    // =============================================
    // PASO 13: CREAR ASISTENCIAS
    // =============================================
    console.log('📅 PASO 13: Creando asistencias...');
    console.log('='.repeat(60));

    const attendances = [];
    for (let i = 0; i < 20; i++) {
      const user = localUsers[i % localUsers.length];
      const date = new Date();
      date.setDate(date.getDate() - i);

      const checkIn = new Date(date);
      checkIn.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));

      const checkOut = new Date(checkIn);
      checkOut.setHours(18 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));

      const statuses = ['present', 'present', 'present', 'late', 'absent'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      attendances.push({
        user_id: user._id,
        date: date,
        check_in: status !== 'absent' ? checkIn : null,
        check_out: status !== 'absent' ? checkOut : null,
        status: status,
        location: status !== 'absent' ? { lat: 19.42 + Math.random() * 0.05, lng: -99.13 + Math.random() * 0.05 } : null,
        notes: status === 'absent' ? 'Sin justificación' : (status === 'late' ? 'Tráfico pesado' : ''),
        created_at: date
      });
    }

    await Attendance.insertMany(attendances);
    console.log(`✅ Creadas ${attendances.length} asistencias`);
    console.log('='.repeat(60) + '\n');

    // =============================================
    // PASO 14: CREAR PAGOS (PAYMENTS) - SKIP
    // =============================================
    console.log('💳 PASO 14: Pagos (saltado - datos suficientes)...');
    console.log('='.repeat(60));
    console.log('⏭️  Saltando creación de payments');
    console.log('='.repeat(60) + '\n');

    // =============================================
    // RESUMEN FINAL
    // =============================================
    console.log('\n');
    console.log('🎉 RESUMEN FINAL');
    console.log('='.repeat(60));

    const finalCounts = {
      users: await User.countDocuments(),
      locals: await Local.countDocuments(),
      motos: await Moto.countDocuments(),
      machines: await Machine.countDocuments(),
      kmHistory: await MotoKilometrageHistory.countDocuments(),
      incidents: await Incident.countDocuments(),
      localVisits: await LocalVisit.countDocuments(),
      changeRequests: await ChangeRequest.countDocuments(),
      alerts: await Alert.countDocuments(),
      exitReports: await ExitReport.countDocuments(),
      loans: await Loan.countDocuments(),
      salaryPayments: await SalaryPayment.countDocuments(),
      expenses: await Expense.countDocuments(),
      tasks: await Task.countDocuments(),
      attendances: await Attendance.countDocuments()
    };

    console.log('📊 Documentos en base de datos:');
    Object.entries(finalCounts).forEach(([collection, count]) => {
      console.log(`   ${collection}: ${count}`);
    });
    console.log('='.repeat(60));

    console.log('\n✅ ¡Migración y seed completado exitosamente!');
    console.log('✅ Base de datos lista para usar con datos de prueba\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedCompleteData();
