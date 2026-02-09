const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const Local = require('../models/Local');
const MotoLocation = require('../models/MotoLocation');
const { auth, adminOnly, motoOnly, localOnly } = require('../middlewares/auth');
const { uploadImage } = require('../config/cloudinary');
const { notifyTaskAssigned, notifyPanicButton, createNotification } = require('../utils/notifications');
const { calculateETA, isFundSufficient } = require('../utils/calculations');
const { findNearestMoto } = require('../utils/geoUtils');
const pushNotificationService = require('../services/pushNotificationService');

// Crear tarea (cambio, falla, premio, etc.)
router.post('/', auth, async (req, res) => {
  try {
    const { type, local_id, description, change_details, machine_id, error_code, 
            error_description, client_name, amount, initial_fund, final_fund, 
            refill_type, refill_coins_5, refill_coins_10, person_in_charge, 
            photos, priority } = req.body;

    // Subir fotos si existen
    let photoUrls = [];
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        if (photo.startsWith('data:image')) {
          const url = await uploadImage(photo, 'tasks');
          photoUrls.push(url);
        }
      }
    }

    // Validar fondo para cambios
    if (type === 'change') {
      const local = await Local.findById(local_id);
      const totalChange = change_details.total;
      
      if (!isFundSufficient(local.current_fund, local.minimum_fund, totalChange)) {
        return res.status(400).json({ 
          error: 'Fondo insuficiente para este cambio',
          current_fund: local.current_fund,
          minimum_fund: local.minimum_fund,
          required: totalChange
        });
      }
    }

    // Asignar automáticamente a moto más cercano
    let assigned_to = null;
    let assignedDistance = null;

    if (req.user.role !== 'moto') {
      // Obtener coordenadas del local
      const local = await Local.findById(local_id);

      if (local && local.location && local.location.coordinates &&
          local.location.coordinates[0] !== 0 && local.location.coordinates[1] !== 0) {
        // El local tiene coordenadas, buscar moto más cercana
        const localLng = local.location.coordinates[0];
        const localLat = local.location.coordinates[1];

        // Obtener últimas ubicaciones de todas las motos
        const motoLocations = await MotoLocation.getAllLastLocations();

        if (motoLocations.length > 0) {
          // Encontrar la moto más cercana
          const nearestMoto = findNearestMoto(motoLocations, localLat, localLng);

          if (nearestMoto) {
            assigned_to = nearestMoto.user_id;
            assignedDistance = nearestMoto.distance;
            console.log(`📍 Tarea asignada a ${nearestMoto.user_name} (${nearestMoto.distance} km del local)`);
          }
        }
      }

      // Si no se pudo asignar por ubicación, asignar al primer moto disponible
      if (!assigned_to) {
        const motos = await User.find({ role: 'moto', is_active: true });
        if (motos.length > 0) {
          assigned_to = motos[0]._id;
          console.log('📍 Tarea asignada al primer moto disponible (sin ubicación)');
        }
      }
    }

    const task = new Task({
      type,
      local_id,
      created_by: req.userId,
      assigned_to,
      status: assigned_to ? 'assigned' : 'created',
      priority: priority || (type === 'failure' ? 'high' : 'normal'),
      description,
      change_details,
      machine_id,
      error_code,
      error_description,
      client_name,
      amount,
      initial_fund,
      final_fund,
      refill_type,
      refill_coins_5,
      refill_coins_10,
      person_in_charge,
      photos: photoUrls,
      assigned_at: assigned_to ? new Date() : null
    });

    await task.save();
    await task.populate(['local_id', 'assigned_to', 'created_by']);

    // Notificar al moto asignado
    if (assigned_to) {
      await notifyTaskAssigned(assigned_to, task._id, type);
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar tareas
router.get('/', auth, async (req, res) => {
  try {
    const { status, type, local_id, assigned_to } = req.query;
    let query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (local_id) query.local_id = local_id;
    if (assigned_to) query.assigned_to = assigned_to;

    // Si es moto, solo sus tareas
    if (req.user.role === 'moto') {
      query.assigned_to = req.userId;
    }

    // Si es local, solo tareas de su local
    if (req.user.role === 'local') {
      const user = await User.findById(req.userId);
      query.local_id = user.assigned_local_id;
    }

    const tasks = await Task.find(query)
      .populate('local_id', 'name address')
      .populate('assigned_to', 'full_name')
      .populate('created_by', 'full_name')
      .populate('machine_id', 'type folio')
      .sort({ created_at: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener tarea por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('local_id')
      .populate('assigned_to')
      .populate('created_by')
      .populate('machine_id');

    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aceptar tarea (moto)
router.post('/:id/accept', auth, motoOnly, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    // Verificar que la tarea esté asignada al usuario actual
    if (!task.assigned_to || task.assigned_to.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Esta tarea no está asignada a ti' });
    }

    // Permitir aceptar si está en 'created' o 'assigned'
    if (!['created', 'assigned'].includes(task.status)) {
      return res.status(400).json({ error: 'La tarea no está disponible para aceptar' });
    }

    task.status = 'accepted';
    task.accepted_at = new Date();
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cambiar estado de tarea
router.post('/:id/status', auth, async (req, res) => {
  try {
    const { status, location } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    task.status = status;

    if (status === 'in_route') task.in_route_at = new Date();
    if (status === 'on_site') task.on_site_at = new Date();
    if (status === 'completed') {
      task.completed_at = new Date();
      
      // Actualizar fondo si es cambio o relleno
      if (task.type === 'refill' && task.refill_type === 'fondo') {
        const local = await Local.findById(task.local_id);
        const totalRefill = (task.refill_coins_5 || 0) + (task.refill_coins_10 || 0);
        local.current_fund += totalRefill;
        await local.save();
      }
    }

    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Confirmar tarea (local y moto)
router.post('/:id/confirm', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    if (req.user.role === 'local') {
      task.local_confirmation = true;
    } else if (req.user.role === 'moto') {
      task.moto_confirmation = true;
    }

    // Si ambos confirmaron, completar automáticamente
    if (task.local_confirmation && task.moto_confirmation && task.status !== 'completed') {
      task.status = 'completed';
      task.completed_at = new Date();
    }

    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Botón de pánico
router.post('/panic-button', auth, localOnly, async (req, res) => {
  try {
    const { local_id, location, photo } = req.body;

    let photo_url = null;
    if (photo) {
      photo_url = await uploadImage(photo, 'panic');
    }

    // Obtener información del local y usuario
    const local = await Local.findById(local_id);
    const user = await User.findById(req.userId);

    // Crear tarea especial de pánico
    const task = new Task({
      type: 'alert',
      local_id,
      created_by: req.userId,
      priority: 'urgent',
      description: `ALERTA DE PÁNICO - ${location}`,
      photos: photo_url ? [photo_url] : [],
      status: 'created'
    });

    await task.save();

    // Notificar a todos los admins (sistema antiguo)
    await notifyPanicButton(local_id, location, photo_url);

    // ========================================
    // ENVIAR PUSH NOTIFICATION A TODOS
    // ========================================
    const localName = local?.name || 'Local';
    const userName = user?.full_name || 'Usuario';

    const notification = {
      title: '🚨 ALERTA DE EMERGENCIA',
      body: `${userName} ha activado el botón de pánico en ${localName}`,
      data: {
        type: 'panic_alert',
        alert_id: task._id.toString(),
        local_id: local_id,
        local_name: localName,
        location: location,
        route: '/admin/activities',
        priority: 'urgent'
      }
    };

    // Enviar a TODOS los usuarios (topic 'all')
    const notificationResult = await pushNotificationService.sendToAll(notification);
    console.log('📬 Push notification sent to all users:', notificationResult);

    // También enviar específicamente a admins con prioridad crítica
    await pushNotificationService.sendToTopic('admins', {
      title: '🚨 EMERGENCIA - ACCIÓN REQUERIDA',
      body: `Alerta de pánico en ${localName}. Requiere atención inmediata.`,
      data: {
        type: 'panic_alert',
        alert_id: task._id.toString(),
        local_id: local_id,
        local_name: localName,
        priority: 'critical',
        route: '/admin/activities'
      }
    });

    res.status(201).json({
      message: 'Alerta enviada exitosamente',
      task,
      notification_sent: notificationResult.success
    });
  } catch (error) {
    console.error('Error en panic button:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reasignar tarea (admin)
router.post('/:id/reassign', auth, adminOnly, async (req, res) => {
  try {
    const { assigned_to } = req.body;

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { 
        assigned_to,
        status: 'assigned',
        assigned_at: new Date()
      },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    // Notificar al nuevo moto
    await notifyTaskAssigned(assigned_to, task._id, task.type);

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;