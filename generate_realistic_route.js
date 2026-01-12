// Ruta realista: 3km con puntos GPS cada 10 segundos
const mongoose = require('mongoose');
require('dotenv').config();

async function generateRealisticRoute() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    const Route = require('./src/models/Route');
    const Moto = require('./src/models/Moto');
    const User = require('./src/models/User');

    const moto = await Moto.findOne();
    const user = await User.findOne({ role: 'moto' }) || await User.findOne({ role: 'admin' });

    if (!moto || !user) {
      console.log('No se encontró moto o usuario');
      return;
    }

    // Eliminar rutas de prueba anteriores para limpiar
    await Route.deleteMany({ distance_km: { $in: [15.8, 12.3, 3.2] } });
    console.log('Rutas de prueba anteriores eliminadas');

    const now = new Date();
    const startTime = new Date(now.getTime() - 600000); // Hace 10 minutos

    // ============================================
    // RUTA REALISTA: Roma Norte -> Condesa (3km)
    // Puntos GPS cada ~10 segundos
    // Velocidad promedio: 25-30 km/h en ciudad
    // 3km = ~6-7 minutos = ~40 puntos GPS
    // ============================================

    const path = [
      // Inicio: Álvaro Obregón y Orizaba (Roma Norte)
      { lat: 19.4178, lng: -99.1621 },
      { lat: 19.4175, lng: -99.1628 },
      { lat: 19.4172, lng: -99.1635 },
      { lat: 19.4169, lng: -99.1642 },
      { lat: 19.4166, lng: -99.1649 },
      // Av. Álvaro Obregón hacia el oeste
      { lat: 19.4163, lng: -99.1656 },
      { lat: 19.4160, lng: -99.1663 },
      { lat: 19.4157, lng: -99.1670 },
      { lat: 19.4154, lng: -99.1677 },
      { lat: 19.4151, lng: -99.1684 },
      // Cruce con Insurgentes
      { lat: 19.4148, lng: -99.1691 },
      { lat: 19.4145, lng: -99.1698 },
      { lat: 19.4142, lng: -99.1705 },
      { lat: 19.4139, lng: -99.1712 },
      { lat: 19.4136, lng: -99.1719 },
      // Entrando a la Condesa
      { lat: 19.4133, lng: -99.1726 },
      { lat: 19.4130, lng: -99.1733 },
      { lat: 19.4127, lng: -99.1740 },
      { lat: 19.4124, lng: -99.1747 },
      { lat: 19.4121, lng: -99.1754 },
      // Av. Amsterdam (circuito)
      { lat: 19.4115, lng: -99.1758 },
      { lat: 19.4109, lng: -99.1762 },
      { lat: 19.4103, lng: -99.1766 },
      { lat: 19.4097, lng: -99.1770 },
      { lat: 19.4091, lng: -99.1774 },
      // Siguiendo Amsterdam
      { lat: 19.4085, lng: -99.1771 },
      { lat: 19.4079, lng: -99.1768 },
      { lat: 19.4073, lng: -99.1765 },
      { lat: 19.4067, lng: -99.1762 },
      { lat: 19.4061, lng: -99.1759 },
      // Hacia Parque México
      { lat: 19.4058, lng: -99.1752 },
      { lat: 19.4055, lng: -99.1745 },
      { lat: 19.4052, lng: -99.1738 },
      { lat: 19.4049, lng: -99.1731 },
      { lat: 19.4046, lng: -99.1724 },
      // Llegando al Parque México
      { lat: 19.4110, lng: -99.1720 },
      { lat: 19.4107, lng: -99.1715 },
      { lat: 19.4104, lng: -99.1710 },
      { lat: 19.4101, lng: -99.1705 },
      // Fin: Parque México
      { lat: 19.4098, lng: -99.1700 },
    ];

    // Agregar timestamps (cada 10 segundos)
    const pathWithTimestamps = path.map((point, index) => ({
      lat: point.lat,
      lng: point.lng,
      timestamp: new Date(startTime.getTime() + (index * 10000)) // +10 segundos cada punto
    }));

    const endTime = pathWithTimestamps[pathWithTimestamps.length - 1].timestamp;
    const durationMs = endTime - startTime;
    const durationMinutes = Math.round(durationMs / 60000);

    await Route.create({
      moto_id: moto._id,
      user_id: user._id,
      start_location: {
        lat: path[0].lat,
        lng: path[0].lng,
        address: 'Álvaro Obregón y Orizaba, Roma Norte, CDMX'
      },
      end_location: {
        lat: path[path.length - 1].lat,
        lng: path[path.length - 1].lng,
        address: 'Parque México, Condesa, CDMX'
      },
      start_time: startTime,
      end_time: endTime,
      distance_km: 3.2,
      duration_minutes: durationMinutes,
      path: pathWithTimestamps,
      visits: [],
      created_at: startTime
    });

    console.log('\n✅ Ruta realista creada: Roma Norte -> Condesa');
    console.log(`   Distancia: 3.2 km`);
    console.log(`   Duración: ${durationMinutes} minutos`);
    console.log(`   Puntos GPS: ${path.length} (cada 10 segundos)`);
    console.log(`   Inicio: Álvaro Obregón y Orizaba`);
    console.log(`   Fin: Parque México`);

    const totalRoutes = await Route.countDocuments();
    console.log(`\nTotal de rutas en BD: ${totalRoutes}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

generateRealisticRoute();
