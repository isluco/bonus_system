const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { auth, adminOnly } = require('../middlewares/auth');
const { checkAttendanceType } = require('../utils/calculations');

// Registrar entrada
router.post('/check-in', auth, async (req, res) => {
  try {
    const { scheduled_time } = req.body; // Hora programada de entrada
    const checkInTime = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verificar si ya existe registro hoy
    const existing = await Attendance.findOne({
      user_id: req.userId,
      date: today
    });

    if (existing) {
      return res.status(400).json({ error: 'Ya registraste tu entrada hoy' });
    }

    // Calcular minutos de retraso
    const scheduledDateTime = new Date(today);
    const [hours, minutes] = scheduled_time.split(':');
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

    const minutesLate = Math.max(0, Math.floor((checkInTime - scheduledDateTime) / 60000));
    const attendanceType = checkAttendanceType(minutesLate);

    const attendance = new Attendance({
      user_id: req.userId,
      date: today,
      check_in: checkInTime,
      type: attendanceType,
      minutes_late: minutesLate
    });

    await attendance.save();

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar salida
router.post('/check-out', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user_id: req.userId,
      date: today
    });

    if (!attendance) {
      return res.status(404).json({ error: 'No has registrado tu entrada hoy' });
    }

    attendance.check_out = new Date();
    await attendance.save();

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar falta/permiso (admin)
router.post('/absence', auth, adminOnly, async (req, res) => {
  try {
    const { user_id, date, type, permission_reason } = req.body;

    const attendance = new Attendance({
      user_id,
      date: new Date(date),
      type, // 'absent' or 'permission'
      permission_reason
    });

    await attendance.save();

    res.status(201).json(attendance);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya existe un registro para esta fecha' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Listar asistencias
router.get('/', auth, async (req, res) => {
  try {
    const { user_id, start_date, end_date, type } = req.query;
    let query = {};

    if (user_id) {
      query.user_id = user_id;
    } else if (req.user.role !== 'admin') {
      query.user_id = req.userId;
    }

    if (start_date && end_date) {
      query.date = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    if (type) query.type = type;

    const attendances = await Attendance.find(query)
      .populate('user_id', 'full_name')
      .sort({ date: -1 });

    res.json(attendances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resumen de asistencias por usuario
router.get('/summary/:userId', auth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const query = {
      user_id: req.params.userId,
      date: {
        $gte: new Date(start_date || Date.now() - 30*24*60*60*1000),
        $lte: new Date(end_date || Date.now())
      }
    };

    const attendances = await Attendance.find(query);

    const summary = {
      present: attendances.filter(a => a.type === 'present').length,
      late: attendances.filter(a => a.type === 'late').length,
      absent: attendances.filter(a => a.type === 'absent').length,
      permission: attendances.filter(a => a.type === 'permission').length,
      total_days: attendances.length
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;