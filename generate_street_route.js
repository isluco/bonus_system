// Generar ruta con coordenadas reales sobre calles de CDMX
// Primero obtenemos la ruta real de OSRM y luego la guardamos
const mongoose = require('mongoose');
require('dotenv').config();

async function generateStreetRoute() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    const Route = require('./src/models/Route');
    const Moto = require('./src/models/Moto');
    const User = require('./src/models/User');

    const moto = await Moto.findOne();
    const user = await User.findOne({ role: 'moto' }) || await User.findOne({ role: 'admin' });

    // Eliminar rutas de prueba anteriores
    await Route.deleteMany({});
    console.log('Rutas anteriores eliminadas');

    // Puntos de inicio y fin en CDMX
    const start = { lat: 19.4270, lng: -99.1677 }; // Ángel de la Independencia
    const end = { lat: 19.4110, lng: -99.1690 };   // Parque México, Condesa

    console.log('\nObteniendo ruta real de OSRM...');

    // Obtener ruta real de OSRM
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
    );

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || !data.routes[0]) {
      console.log('Error obteniendo ruta de OSRM');
      return;
    }

    // Convertir coordenadas de OSRM [lng, lat] a nuestro formato {lat, lng, timestamp}
    const osrmCoords = data.routes[0].geometry.coordinates;
    const now = new Date();
    const startTime = new Date(now.getTime() - 600000); // Hace 10 minutos

    // Crear path con timestamps cada 10 segundos
    const path = osrmCoords.map((coord, index) => ({
      lat: coord[1],
      lng: coord[0],
      timestamp: new Date(startTime.getTime() + (index * 10000))
    }));

    const endTime = path[path.length - 1].timestamp;
    const distanceKm = (data.routes[0].distance / 1000).toFixed(2);
    const durationMin = Math.round(data.routes[0].duration / 60);

    await Route.create({
      moto_id: moto._id,
      user_id: user._id,
      start_location: {
        lat: start.lat,
        lng: start.lng,
        address: 'Ángel de la Independencia, Reforma, CDMX'
      },
      end_location: {
        lat: end.lat,
        lng: end.lng,
        address: 'Parque México, Condesa, CDMX'
      },
      start_time: startTime,
      end_time: endTime,
      distance_km: parseFloat(distanceKm),
      duration_minutes: durationMin,
      path: path,
      visits: [],
      created_at: startTime
    });

    console.log('\n✅ Ruta creada con coordenadas reales de calles');
    console.log(`   Origen: Ángel de la Independencia`);
    console.log(`   Destino: Parque México`);
    console.log(`   Distancia: ${distanceKm} km`);
    console.log(`   Duración: ${durationMin} min`);
    console.log(`   Puntos GPS: ${path.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

generateStreetRoute();
