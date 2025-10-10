require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middlewares
app.use(cors());
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
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB Connected');
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
