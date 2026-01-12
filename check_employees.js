const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  require('./src/models/Local');
  const User = require('./src/models/User');
  const users = await User.find({ role: 'local' })
    .select('full_name weekly_salary assigned_local_id is_active')
    .populate('assigned_local_id', 'name');
  
  console.log('Empleados de locales:');
  console.log('-------------------');
  users.forEach(u => {
    const salary = u.weekly_salary || 'NO CONFIGURADO';
    const local = u.assigned_local_id ? u.assigned_local_id.name : 'Sin local';
    console.log('- ' + u.full_name + ': salario=' + salary + ', local=' + local + ', activo=' + u.is_active);
  });
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
