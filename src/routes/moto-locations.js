const express = require('express');
const router = express.Router();
const MotoLocation = require('../models/MotoLocation');
const { auth } = require('../middlewares/auth');
const { findNearestMoto, sortMotosByDistance } = require('../utils/geoUtils');

// POST /moto-locations - Guardar ubicación de moto
router.post('/', auth, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, speed, heading } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Se requieren latitude y longitude' });
    }

    // Validar que el usuario sea tipo moto
    if (req.user.role !== 'moto') {
      return res.status(403).json({ error: 'Solo usuarios tipo moto pueden enviar ubicación' });
    }

    const location = new MotoLocation({
      user_id: req.userId,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude] // MongoDB usa [lng, lat]
      },
      accuracy: accuracy || 0,
      speed: speed || 0,
      heading: heading || 0
    });

    await location.save();

    res.status(201).json({
      success: true,
      message: 'Ubicación guardada',
      location: {
        lat: latitude,
        lng: longitude,
        timestamp: location.created_at
      }
    });
  } catch (error) {
    console.error('Error saving moto location:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /moto-locations/me - Obtener mi última ubicación
router.get('/me', auth, async (req, res) => {
  try {
    const location = await MotoLocation.getLastLocation(req.userId);

    if (!location) {
      return res.status(404).json({ error: 'No hay ubicación registrada' });
    }

    res.json({
      lat: location.location.coordinates[1],
      lng: location.location.coordinates[0],
      accuracy: location.accuracy,
      speed: location.speed,
      timestamp: location.created_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /moto-locations/all - Obtener última ubicación de todas las motos (admin)
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const locations = await MotoLocation.getAllLastLocations();

    // Transformar formato para el frontend
    const formattedLocations = locations.map(loc => ({
      user_id: loc.user_id,
      user_name: loc.user_name,
      lat: loc.location.coordinates[1],
      lng: loc.location.coordinates[0],
      accuracy: loc.accuracy,
      speed: loc.speed,
      last_update: loc.created_at
    }));

    res.json(formattedLocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /moto-locations/nearest - Encontrar moto más cercana a unas coordenadas
router.get('/nearest', auth, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Se requieren lat y lng' });
    }

    const targetLat = parseFloat(lat);
    const targetLng = parseFloat(lng);

    const motoLocations = await MotoLocation.getAllLastLocations();
    const nearestMoto = findNearestMoto(motoLocations, targetLat, targetLng);

    if (!nearestMoto) {
      return res.status(404).json({ error: 'No hay motos disponibles con ubicación' });
    }

    res.json({
      user_id: nearestMoto.user_id,
      user_name: nearestMoto.user_name,
      distance_km: nearestMoto.distance,
      lat: nearestMoto.location.coordinates[1],
      lng: nearestMoto.location.coordinates[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /moto-locations/sorted - Obtener motos ordenadas por distancia
router.get('/sorted', auth, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Se requieren lat y lng' });
    }

    const targetLat = parseFloat(lat);
    const targetLng = parseFloat(lng);

    const motoLocations = await MotoLocation.getAllLastLocations();
    const sortedMotos = sortMotosByDistance(motoLocations, targetLat, targetLng);

    const formattedMotos = sortedMotos.map(moto => ({
      user_id: moto.user_id,
      user_name: moto.user_name,
      distance_km: moto.distance,
      lat: moto.location.coordinates[1],
      lng: moto.location.coordinates[0],
      last_update: moto.created_at
    }));

    res.json(formattedMotos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
