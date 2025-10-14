require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// CORS Configuration - Compatible with Vercel
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'https://bonus-system.vercel.app',
  // Agrega aquí tu dominio de producción cuando lo tengas
];

// CORS middleware optimizado para Vercel
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow all origins in development, specific in production
  if (process.env.NODE_ENV === 'development' || !origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Set UTF-8 charset for all responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB Connected');

    // Test database connection with a simple query
    const Moto = require('./models/Moto');
    const testMoto = await Moto.findOne().limit(1);
    console.log('🔍 [DB TEST] Motos collection:', testMoto ? `Found: ${testMoto.plate || 'moto found'}` : 'Empty collection');

    const User = require('./models/User');
    const userCount = await User.countDocuments();
    console.log('🔍 [DB TEST] Users count:', userCount);

    const adminUser = await User.findOne({ role: 'admin' });
    console.log('🔍 [DB TEST] Admin user exists:', adminUser ? `Yes (${adminUser.email})` : 'No');

  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
  }
};

connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/locales', require('./routes/locales'));
app.use('/api/machines', require('./routes/machines'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/motos', require('./routes/motos'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/attendances', require('./routes/attendances'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/config', require('./routes/config'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/debug', require('./routes/debug'));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bonus System API',
    status: 'running',
    version: '1.0.0'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
