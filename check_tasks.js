require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('./src/models/Task');
const Local = require('./src/models/Local');
const User = require('./src/models/User');

async function checkTasks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener las últimas 10 tareas
    const tasks = await Task.find()
      .populate('local_id', 'name')
      .populate('assigned_to', 'full_name')
      .populate('created_by', 'full_name')
      .sort({ created_at: -1 })
      .limit(10);

    console.log(`\n📋 Últimas ${tasks.length} tareas:\n`);

    tasks.forEach((task, index) => {
      console.log(`${index + 1}. Tarea ID: ${task._id}`);
      console.log(`   Tipo: ${task.type}`);
      console.log(`   Estado: ${task.status}`);
      console.log(`   Prioridad: ${task.priority}`);
      console.log(`   Local: ${task.local_id?.name || 'N/A'}`);
      console.log(`   Creado por: ${task.created_by?.full_name || 'N/A'}`);
      console.log(`   Asignado a: ${task.assigned_to?.full_name || 'Sin asignar'}`);
      console.log(`   Descripción: ${task.description || 'N/A'}`);
      console.log(`   Fotos: ${task.photos?.length || 0}`);
      console.log(`   Creado: ${task.created_at}`);
      console.log('');
    });

    // Contar tareas por tipo
    const tasksByType = await Task.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('📊 Resumen por tipo:');
    tasksByType.forEach(item => {
      console.log(`   ${item._id}: ${item.count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTasks();
