require('dotenv').config();
const mongoose = require('mongoose');

async function verifyDatabase() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const db = mongoose.connection.db;

    // Listar todas las colecciones
    const collections = await db.listCollections().toArray();
    console.log('📊 COLECCIONES EXISTENTES:');
    console.log('='.repeat(50));
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    console.log('='.repeat(50));
    console.log(`Total: ${collections.length} colecciones\n`);

    // Contar documentos en cada colección
    console.log('📈 CANTIDAD DE DOCUMENTOS POR COLECCIÓN:');
    console.log('='.repeat(50));
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  ${col.name}: ${count} documentos`);
    }
    console.log('='.repeat(50));

    // Verificar colecciones nuevas específicas
    const newCollections = [
      'incidents',
      'localvisits',
      'motokilometragehistories',
      'changerequests',
      'alerts',
      'exitreports',
      'salarypayments'
    ];

    console.log('\n🎯 VERIFICACIÓN DE COLECCIONES NUEVAS:');
    console.log('='.repeat(50));
    for (const colName of newCollections) {
      const exists = collections.some(c => c.name === colName);
      const count = exists ? await db.collection(colName).countDocuments() : 0;
      const status = exists ? '✅ EXISTE' : '❌ NO EXISTE';
      console.log(`  ${colName}: ${status} (${count} docs)`);
    }
    console.log('='.repeat(50));

    // Verificar modelo Moto tiene campos nuevos
    console.log('\n🏍️ VERIFICACIÓN MODELO MOTO:');
    console.log('='.repeat(50));
    const moto = await db.collection('motos').findOne();
    if (moto) {
      console.log('  ✅ assigned_fund:', moto.assigned_fund !== undefined ? 'SÍ' : 'NO');
      console.log('  ✅ current_fund:', moto.current_fund !== undefined ? 'SÍ' : 'NO');
      console.log('  Ejemplo de moto:', JSON.stringify({
        _id: moto._id,
        plate: moto.plate,
        assigned_fund: moto.assigned_fund,
        current_fund: moto.current_fund
      }, null, 2));
    } else {
      console.log('  ⚠️ No hay motos en la colección');
    }
    console.log('='.repeat(50));

    // Verificar modelo User tiene weekly_salary
    console.log('\n👤 VERIFICACIÓN MODELO USER:');
    console.log('='.repeat(50));
    const user = await db.collection('users').findOne({ role: 'local' });
    if (user) {
      console.log('  ✅ weekly_salary:', user.weekly_salary !== undefined ? 'SÍ' : 'NO');
      console.log('  ✅ monthly_salary:', user.monthly_salary !== undefined ? 'SÍ' : 'NO');
      console.log('  Ejemplo de user:', JSON.stringify({
        _id: user._id,
        full_name: user.full_name,
        role: user.role,
        weekly_salary: user.weekly_salary,
        monthly_salary: user.monthly_salary
      }, null, 2));
    } else {
      console.log('  ⚠️ No hay usuarios de tipo local');
    }
    console.log('='.repeat(50));

    // Verificar modelo SalaryPayment tiene campos de abonos
    console.log('\n💰 VERIFICACIÓN MODELO SALARY PAYMENT:');
    console.log('='.repeat(50));
    const salaryPayment = await db.collection('salarypayments').findOne();
    if (salaryPayment) {
      console.log('  ✅ deductions:', salaryPayment.deductions !== undefined ? 'SÍ' : 'NO');
      console.log('  ✅ bonuses:', salaryPayment.bonuses !== undefined ? 'SÍ' : 'NO');
      console.log('  Ejemplo:', JSON.stringify({
        _id: salaryPayment._id,
        base_salary: salaryPayment.base_salary,
        deductions: salaryPayment.deductions,
        bonuses: salaryPayment.bonuses,
        net_salary: salaryPayment.net_salary
      }, null, 2));
    } else {
      console.log('  ⚠️ No hay registros de salary payments');
    }
    console.log('='.repeat(50));

    // Verificar modelo Expense tiene photo_url
    console.log('\n💸 VERIFICACIÓN MODELO EXPENSE:');
    console.log('='.repeat(50));
    const expense = await db.collection('expenses').findOne();
    if (expense) {
      console.log('  ✅ photo_url:', expense.photo_url !== undefined ? 'SÍ' : 'NO');
      console.log('  Ejemplo:', JSON.stringify({
        _id: expense._id,
        type: expense.type,
        amount: expense.amount,
        photo_url: expense.photo_url ? 'tiene' : 'no tiene'
      }, null, 2));
    } else {
      console.log('  ⚠️ No hay gastos registrados');
    }
    console.log('='.repeat(50));

    console.log('\n✅ Verificación completada');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyDatabase();
