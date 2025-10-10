require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const SystemConfig = require('../src/models/SystemConfig');

const initDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Limpiar base de datos (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      await User.deleteMany({});
      await SystemConfig.deleteMany({});
      console.log('🗑️  Base de datos limpiada');
    }

    // Crear usuarios de prueba
    const adminUser = await User.create({
      email: 'admin@bonussystem.com',
      password: 'Admin123!',
      role: 'admin',
      full_name: 'Administrador Principal',
      phone: '5512345678',
      employee_id: 'EMP00001',
      is_active: true
    });

    const motoUser = await User.create({
      email: 'moto@bonussystem.com',
      password: 'Moto123!',
      role: 'moto',
      full_name: 'Juan Pérez',
      phone: '5512345679',
      employee_id: 'EMP00002',
      weekly_salary: 2500,
      is_active: true
    });

    const localUser = await User.create({
      email: 'local@bonussystem.com',
      password: 'Local123!',
      role: 'local',
      full_name: 'María García',
      phone: '5512345680',
      employee_id: 'EMP00003',
      weekly_salary: 2000,
      is_active: true
    });

    console.log('✅ Usuarios creados:');
    console.log('   - Admin: admin@bonussystem.com / Admin123!');
    console.log('   - Moto: moto@bonussystem.com / Moto123!');
    console.log('   - Local: local@bonussystem.com / Local123!');

    // Configuraciones del sistema
    const configs = [
      {
        key: 'late_tolerance_minutes',
        value: 15,
        description: 'Tolerancia para retardo en minutos',
        data_type: 'number'
      },
      {
        key: 'urgent_failure_max_hours',
        value: 2,
        description: 'Tiempo máximo para atender falla urgente (horas)',
        data_type: 'number'
      },
      {
        key: 'normal_failure_max_hours',
        value: 4,
        description: 'Tiempo máximo para atender falla normal (horas)',
        data_type: 'number'
      },
      {
        key: 'oil_change_km',
        value: 3000,
        description: 'Kilometraje para cambio de aceite',
        data_type: 'number'
      },
      {
        key: 'service_warning_km',
        value: 100,
        description: 'Kilometraje de advertencia antes del servicio',
        data_type: 'number'
      },
      {
        key: 'service_block_km',
        value: 200,
        description: 'Kilometraje de bloqueo después del servicio vencido',
        data_type: 'number'
      },
      {
        key: 'payment_reminder_days',
        value: 7,
        description: 'Días de anticipación para recordar pagos',
        data_type: 'number'
      },
      {
        key: 'max_loan_amount',
        value: 5000,
        description: 'Monto máximo de préstamo',
        data_type: 'number'
      },
      {
        key: 'max_active_loans',
        value: 1,
        description: 'Número máximo de préstamos activos por empleado',
        data_type: 'number'
      },
      {
        key: 'retards_for_discount',
        value: 3,
        description: 'Número de retardos antes de aplicar descuento',
        data_type: 'number'
      },
      {
        key: 'minimum_local_fund',
        value: 1500,
        description: 'Fondo mínimo default para locales',
        data_type: 'number'
      },
      {
        key: 'max_change_requests',
        value: 5,
        description: 'Máximo de solicitudes de cambio simultáneas por local',
        data_type: 'number'
      }
    ];

    await SystemConfig.insertMany(configs);
    console.log('✅ Configuraciones del sistema creadas');

    console.log('\n🎉 Base de datos inicializada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

initDatabase();
