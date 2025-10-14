const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Local = require('../models/Local');
const { auth, adminOnly } = require('../middlewares/auth');
const { checkAttendanceType } = require('../utils/calculations');
const { uploadImage } = require('../config/cloudinary');

// Registrar entrada con foto y GPS
router.post('/check-in', auth, async (req, res) => {
  try {
    const {
      photo,
      location,
      device_time,
      local_id,
      scheduled_time // Opcional, si no se envía se usa el del local
    } = req.body;

    const serverTime = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verificar si ya existe registro hoy
    const existing = await Attendance.findOne({
      user_id: req.userId,
      date: today
    });

    if (existing && existing.check_in) {
      return res.status(400).json({ error: 'Ya registraste tu entrada hoy' });
    }

    // Obtener horario del local si no se envía
    let expectedTime = scheduled_time;
    if (!expectedTime && local_id) {
      const local = await Local.findById(local_id);
      if (local && local.opening_time) {
        expectedTime = local.opening_time;
      }
    }

    // Calcular minutos de retraso
    let minutesLate = 0;
    let attendanceType = 'present';

    if (expectedTime) {
      const expectedDateTime = new Date(today);
      const [hours, minutes] = expectedTime.split(':');
      expectedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      minutesLate = Math.max(0, Math.floor((serverTime - expectedDateTime) / 60000));
      attendanceType = checkAttendanceType(minutesLate);
    }

    // Subir foto a Cloudinary
    let photoUrl = null;
    if (photo) {
      photoUrl = await uploadImage(photo, 'attendance');
    }

    // Crear o actualizar registro
    const attendanceData = {
      user_id: req.userId,
      local_id: local_id || null,
      date: today,
      check_in: serverTime,
      check_in_device_time: device_time ? new Date(device_time) : serverTime,
      check_in_location: location || null,
      check_in_photo: photoUrl,
      type: attendanceType,
      minutes_late: minutesLate,
      expected_check_in: expectedTime ? new Date(today.setHours(...expectedTime.split(':').map(Number))) : null
    };

    const attendance = existing
      ? await Attendance.findByIdAndUpdate(existing._id, attendanceData, { new: true })
      : await Attendance.create(attendanceData);

    res.status(201).json({
      ...attendance.toObject(),
      message: minutesLate > 0 ? `Llegaste ${minutesLate} minutos tarde` : 'Entrada registrada a tiempo'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar salida con foto y GPS
router.post('/check-out', auth, async (req, res) => {
  try {
    const {
      photo,
      location,
      device_time
    } = req.body;

    const serverTime = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user_id: req.userId,
      date: today
    });

    if (!attendance) {
      return res.status(404).json({ error: 'No has registrado tu entrada hoy' });
    }

    if (attendance.check_out) {
      return res.status(400).json({ error: 'Ya registraste tu salida hoy' });
    }

    // Subir foto a Cloudinary
    let photoUrl = null;
    if (photo) {
      photoUrl = await uploadImage(photo, 'attendance');
    }

    // Actualizar registro
    attendance.check_out = serverTime;
    attendance.check_out_device_time = device_time ? new Date(device_time) : serverTime;
    attendance.check_out_location = location || null;
    attendance.check_out_photo = photoUrl;

    await attendance.save();

    // Calcular horas trabajadas
    const hoursWorked = ((attendance.check_out - attendance.check_in) / (1000 * 60 * 60)).toFixed(2);

    res.json({
      ...attendance.toObject(),
      hours_worked: hoursWorked,
      message: 'Salida registrada exitosamente'
    });
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
      .populate('user_id', 'full_name email')
      .populate('local_id', 'name address')
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