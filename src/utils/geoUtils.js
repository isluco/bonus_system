/**
 * Utilidades para cálculos geográficos
 */

/**
 * Calcula la distancia entre dos puntos usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lon1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lon2 - Longitud del punto 2
 * @returns {number} Distancia en kilómetros
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convierte grados a radianes
 * @param {number} deg - Grados
 * @returns {number} Radianes
 */
function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Encuentra la moto más cercana a unas coordenadas dadas
 * @param {Array} motoLocations - Array de ubicaciones de motos [{user_id, location: {coordinates: [lng, lat]}}]
 * @param {number} targetLat - Latitud objetivo
 * @param {number} targetLng - Longitud objetivo
 * @returns {Object|null} La moto más cercana con su distancia, o null si no hay motos
 */
function findNearestMoto(motoLocations, targetLat, targetLng) {
  if (!motoLocations || motoLocations.length === 0) {
    return null;
  }

  let nearestMoto = null;
  let minDistance = Infinity;

  for (const moto of motoLocations) {
    if (!moto.location || !moto.location.coordinates) continue;

    // MongoDB guarda como [longitude, latitude]
    const motoLng = moto.location.coordinates[0];
    const motoLat = moto.location.coordinates[1];

    const distance = calculateDistance(targetLat, targetLng, motoLat, motoLng);

    if (distance < minDistance) {
      minDistance = distance;
      nearestMoto = {
        user_id: moto.user_id || moto._id,
        user_name: moto.user_name,
        distance: Math.round(distance * 100) / 100, // Redondear a 2 decimales
        location: moto.location
      };
    }
  }

  return nearestMoto;
}

/**
 * Ordena las motos por distancia a un punto
 * @param {Array} motoLocations - Array de ubicaciones de motos
 * @param {number} targetLat - Latitud objetivo
 * @param {number} targetLng - Longitud objetivo
 * @returns {Array} Motos ordenadas por distancia (más cercana primero)
 */
function sortMotosByDistance(motoLocations, targetLat, targetLng) {
  if (!motoLocations || motoLocations.length === 0) {
    return [];
  }

  return motoLocations
    .map(moto => {
      if (!moto.location || !moto.location.coordinates) {
        return { ...moto, distance: Infinity };
      }

      const motoLng = moto.location.coordinates[0];
      const motoLat = moto.location.coordinates[1];
      const distance = calculateDistance(targetLat, targetLng, motoLat, motoLng);

      return {
        user_id: moto.user_id || moto._id,
        user_name: moto.user_name,
        distance: Math.round(distance * 100) / 100,
        location: moto.location,
        created_at: moto.created_at
      };
    })
    .filter(moto => moto.distance !== Infinity)
    .sort((a, b) => a.distance - b.distance);
}

module.exports = {
  calculateDistance,
  findNearestMoto,
  sortMotosByDistance
};
