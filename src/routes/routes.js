const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const { auth, motoOnly, adminOnly } = require('../middlewares/auth');
const { uploadImage } = require('../config/cloudinary');

// Iniciar ruta
router.post('/start', auth, motoOnly, async (req, res) => {
  try {
    const { moto_id, start_location } = req.body;

    const route = new Route({
      moto_id,
      user_id: req.userId,
      start_location,
      start_time: new Date(),
      path: [{ ...start_location, timestamp: new Date() }]
    });

    await route.save();

    res.status(201).json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar ubicación en ruta
router.post('/:id/update-location', auth, motoOnly, async (req, res) => {
  try {
    const { location } = req.body;

    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    route.path.push({
      ...location,
      timestamp: new Date()
    });

    await route.save();

    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar visita a local
router.post('/:id/visit', auth, motoOnly, async (req, res) => {
  try {
    const { local_id, activity, photo } = req.body;

    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    let photo_url = null;
    if (photo) {
      photo_url = await uploadImage(photo, 'visits');
    }

    route.visits.push({
      local_id,
      activity,
      arrival_time: new Date(),
      photo_url
    });

    await route.save();

    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finalizar ruta
router.post('/:id/end', auth, motoOnly, async (req, res) => {
  try {
    const { end_location, distance_km } = req.body;

    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    route.end_location = end_location;
    route.end_time = new Date();
    route.distance_km = distance_km;
    
    const duration = (route.end_time - route.start_time) / 60000; // minutos
    route.duration_minutes = Math.floor(duration);

    await route.save();

    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener ruta activa del usuario
router.get('/active', auth, motoOnly, async (req, res) => {
  try {
    const activeRoute = await Route.findOne({
      user_id: req.userId,
      end_time: null
    }).populate('moto_id', 'brand model plate');

    if (!activeRoute) {
      return res.status(404).json({ error: 'No hay ruta activa' });
    }

    res.json(activeRoute);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar rutas
router.get('/', auth, async (req, res) => {
  try {
    const { moto_id, user_id, start_date, end_date } = req.query;
    let query = {};

    if (moto_id) query.moto_id = moto_id;
    if (user_id) query.user_id = user_id;

    if (req.user.role === 'moto') {
      query.user_id = req.userId;
    }

    if (start_date && end_date) {
      query.start_time = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    const routes = await Route.find(query)
      .populate('moto_id', 'brand model plate')
      .populate('user_id', 'full_name')
      .populate('visits.local_id', 'name address')
      .sort({ start_time: -1 });

    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener ubicación actual de motos (admin)
router.get('/live-location', auth, adminOnly, async (req, res) => {
  try {
    // Obtener última ubicación de cada moto activa
    const activeRoutes = await Route.find({ end_time: null })
      .populate('moto_id', 'brand model plate')
      .populate('user_id', 'full_name');

    const locations = activeRoutes.map(route => {
      const lastLocation = route.path[route.path.length - 1];
      return {
        moto_id: route.moto_id._id,
        moto: route.moto_id,
        user: route.user_id,
        location: lastLocation,
        start_time: route.start_time
      };
    });

    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
