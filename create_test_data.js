require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Task = require('./src/models/Task');
const Local = require('./src/models/Local');
const Machine = require('./src/models/Machine');

async function createTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar usuario
    const user = await User.findOne({ email: 'isluco2004@gmail.com' });
    if (!user) {
      console.log('❌ Usuario no encontrado');
      process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${user.full_name}`);
    console.log(`   Local asignado: ${user.assigned_local_id}`);

    if (!user.assigned_local_id) {
      console.log('❌ Usuario no tiene local asignado');
      process.exit(1);
    }

    // Obtener local
    const local = await Local.findById(user.assigned_local_id);
    if (!local) {
      console.log('❌ Local no encontrado');
      process.exit(1);
    }

    console.log(`✅ Local encontrado: ${local.name}`);

    // Obtener máquinas del local
    const machines = await Machine.find({ local_id: local._id });
    console.log(`✅ Máquinas encontradas: ${machines.length}`);

    // Fecha de hoy
    const today = new Date();
    today.setHours(8, 0, 0, 0); // 8 AM

    const tasksToCreate = [];

    // 1. Tarea de relleno de cajón
    if (machines.length > 0) {
      tasksToCreate.push({
        type: 'refill',
        local_id: local._id,
        created_by: user._id,
        machine_id: machines[0]._id,
        status: 'completed',
        priority: 'normal',
        description: 'Relleno de cajón',
        refill_type: 'cajon',
        refill_coins_5: 1000,
        refill_coins_10: 800,
        person_in_charge: user.full_name,
        created_at: new Date(today.getTime() + 1 * 60 * 60 * 1000), // 9 AM
        completed_at: new Date(today.getTime() + 1.5 * 60 * 60 * 1000) // 9:30 AM
      });
    }

    // 2. Tarea de relleno de fondo
    if (machines.length > 1) {
      tasksToCreate.push({
        type: 'refill',
        local_id: local._id,
        created_by: user._id,
        machine_id: machines[1]._id,
        status: 'completed',
        priority: 'normal',
        description: 'Relleno de fondo',
        refill_type: 'fondo',
        refill_coins_5: 500,
        refill_coins_10: 300,
        person_in_charge: user.full_name,
        created_at: new Date(today.getTime() + 2 * 60 * 60 * 1000), // 10 AM
        completed_at: new Date(today.getTime() + 2.5 * 60 * 60 * 1000) // 10:30 AM
      });
    }

    // 3. Tarea de premio
    if (machines.length > 0) {
      tasksToCreate.push({
        type: 'prize',
        local_id: local._id,
        created_by: user._id,
        machine_id: machines[0]._id,
        status: 'completed',
        priority: 'high',
        description: 'Pago de premio',
        amount: 1500,
        created_at: new Date(today.getTime() + 3 * 60 * 60 * 1000), // 11 AM
        completed_at: new Date(today.getTime() + 3.2 * 60 * 60 * 1000) // 11:12 AM
      });
    }

    // 4. Tarea de gasto
    tasksToCreate.push({
      type: 'expense',
      local_id: local._id,
      created_by: user._id,
      status: 'completed',
      priority: 'normal',
      description: 'Compra de desayuno',
      amount: 150,
      created_at: new Date(today.getTime() + 0.5 * 60 * 60 * 1000), // 8:30 AM
      completed_at: new Date(today.getTime() + 0.6 * 60 * 60 * 1000) // 8:36 AM
    });

    // 5. Tarea de cambio
    tasksToCreate.push({
      type: 'change',
      local_id: local._id,
      created_by: user._id,
      status: 'completed',
      priority: 'normal',
      description: 'Cambio de monedas',
      change_details: {
        coins_5: 2000,
        coins_10: 1500,
        total: 3500
      },
      created_at: new Date(today.getTime() + 4 * 60 * 60 * 1000), // 12 PM
      completed_at: new Date(today.getTime() + 4.5 * 60 * 60 * 1000) // 12:30 PM
    });

    // 6. Otro gasto
    tasksToCreate.push({
      type: 'expense',
      local_id: local._id,
      created_by: user._id,
      status: 'completed',
      priority: 'normal',
      description: 'Limpieza de máquinas',
      amount: 200,
      created_at: new Date(today.getTime() + 5 * 60 * 60 * 1000), // 1 PM
      completed_at: new Date(today.getTime() + 5.3 * 60 * 60 * 1000) // 1:18 PM
    });

    // Crear todas las tareas
    const createdTasks = await Task.insertMany(tasksToCreate);
    console.log(`\n✅ Se crearon ${createdTasks.length} tareas de prueba:`);

    createdTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.type} - ${task.description || 'Sin descripción'}`);
    });

    console.log('\n✅ Datos de prueba creados exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestData();
