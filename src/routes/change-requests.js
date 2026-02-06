const express = require('express');
const router = express.Router();
const ChangeRequest = require('../models/ChangeRequest');
const Local = require('../models/Local');
const MotoLocation = require('../models/MotoLocation');
const User = require('../models/User');
const { auth, localOnly, adminOnly } = require('../middlewares/auth');

// Función auxiliar para encontrar la moto más cercana
async function findNearestMoto(localCoordinates) {
  try {
    // Obtener todas las motos activas con sus últimas ubicaciones
    const motoLocations = await MotoLocation.getAllLastLocations();

    if (!motoLocations || motoLocations.length === 0) {
      return null;
    }

    // Calcular distancia a cada moto usando Haversine formula
    const calculateDistance = (coords1, coords2) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const R = 6371; // Radio de la Tierra en km

      const lat1 = coords1[1];
      const lon1 = coords1[0];
      const lat2 = coords2[1];
      const lon2 = coords2[0];

      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distancia en km
    };

    // Encontrar la moto más cercana
    let nearestMoto = null;
    let minDistance = Infinity;

    for (const motoLoc of motoLocations) {
      const distance = calculateDistance(
        localCoordinates,
        motoLoc.location.coordinates
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestMoto = motoLoc.user_id;
      }
    }

    return nearestMoto;
  } catch (error) {
    console.error('Error finding nearest moto:', error);
    return null;
  }
}

// Crear solicitud de cambio (local)
router.post('/', auth, localOnly, async (req, res) => {
  try {
    const { local_id, coins_5, coins_10, notes } = req.body;

    const total_amount = (coins_5 || 0) + (coins_10 || 0);

    // Verificar que el local tenga fondos suficientes
    const local = await Local.findById(local_id);
    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    if (local.current_fund < total_amount) {
      return res.status(400).json({
        error: 'Fondos insuficientes para este cambio',
        current_fund: local.current_fund,
        requested: total_amount
      });
    }

    // Buscar la moto más cercana basándose en las coordenadas del local
    let assigned_moto = null;
    if (local.location && local.location.coordinates) {
      assigned_moto = await findNearestMoto(local.location.coordinates);
    }

    const changeRequest = new ChangeRequest({
      local_id,
      created_by: req.userId,
      coins_5: coins_5 || 0,
      coins_10: coins_10 || 0,
      total_amount,
      notes,
      assigned_to_moto: assigned_moto, // Asignar automáticamente la moto más cercana
      status: 'pending' // La solicitud queda pendiente de aprobación del admin
    });

    await changeRequest.save();
    await changeRequest.populate(['local_id', 'created_by', 'assigned_to_moto']);

    res.status(201).json(changeRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar solicitudes
router.get('/', auth, async (req, res) => {
  try {
    const { status, local_id } = req.query;
    let query = {};

    if (status) query.status = status;
    if (local_id) query.local_id = local_id;

    // Si es local, solo sus solicitudes
    if (req.user.role === 'local') {
      const User = require('../models/User');
      const user = await User.findById(req.userId);
      query.local_id = user.assigned_local_id;
    }

    const requests = await ChangeRequest.find(query)
      .populate('local_id', 'name address')
      .populate('created_by', 'full_name')
      .populate('approved_by', 'full_name')
      .populate('assigned_to_moto', 'full_name')
      .sort({ created_at: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aprobar solicitud (admin)
router.post('/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const { assigned_to_moto } = req.body;

    const changeRequest = await ChangeRequest.findById(req.params.id);

    if (!changeRequest) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    changeRequest.status = 'approved';
    changeRequest.approved_by = req.userId;
    changeRequest.approved_at = new Date();
    if (assigned_to_moto) {
      changeRequest.assigned_to_moto = assigned_to_moto;
    }

    await changeRequest.save();
    await changeRequest.populate(['local_id', 'created_by', 'approved_by', 'assigned_to_moto']);

    res.json(changeRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rechazar solicitud (admin)
router.post('/:id/reject', auth, adminOnly, async (req, res) => {
  try {
    const { rejection_reason } = req.body;

    const changeRequest = await ChangeRequest.findById(req.params.id);

    if (!changeRequest) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    changeRequest.status = 'rejected';
    changeRequest.approved_by = req.userId;
    changeRequest.approved_at = new Date();
    changeRequest.rejection_reason = rejection_reason;

    await changeRequest.save();
    await changeRequest.populate(['local_id', 'created_by', 'approved_by']);

    res.json(changeRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Completar cambio (moto)
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const changeRequest = await ChangeRequest.findById(req.params.id);

    if (!changeRequest) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    changeRequest.status = 'completed';
    changeRequest.completed_at = new Date();

    await changeRequest.save();

    // Actualizar fondo del local
    const local = await Local.findById(changeRequest.local_id);
    local.current_fund -= changeRequest.total_amount;
    await local.save();

    res.json(changeRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
