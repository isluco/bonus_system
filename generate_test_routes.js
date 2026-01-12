// Script para generar rutas de prueba en Ciudad de México
const mongoose = require('mongoose');
require('dotenv').config();

async function generateTestRoutes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    const Route = require('./src/models/Route');
    const Moto = require('./src/models/Moto');
    const User = require('./src/models/User');

    // Obtener una moto y usuario
    const moto = await Moto.findOne();
    const user = await User.findOne({ role: 'moto' });

    if (!moto || !user) {
      console.log('No se encontró moto o usuario moto');
      // Intentar con admin si no hay moto
      const adminUser = await User.findOne({ role: 'admin' });
      if (!adminUser) {
        console.log('No hay usuarios disponibles');
        return;
      }
    }

    const motoId = moto?._id;
    const userId = user?._id || (await User.findOne({ role: 'admin' }))?._id;

    console.log(`Moto: ${moto?.plate || 'N/A'}`);
    console.log(`Usuario: ${user?.full_name || 'Admin'}`);

    const now = new Date();

    // ============================================
    // RUTA 1: Centro Histórico -> Coyoacán
    // Recorrido por el centro de CDMX
    // ============================================
    const route1Path = [
      // Zócalo - Inicio
      { lat: 19.4326, lng: -99.1332, timestamp: new Date(now.getTime() - 3600000 * 3) },
      // Bellas Artes
      { lat: 19.4352, lng: -99.1412, timestamp: new Date(now.getTime() - 3600000 * 2.9) },
      // Alameda Central
      { lat: 19.4359, lng: -99.1441, timestamp: new Date(now.getTime() - 3600000 * 2.8) },
      // Paseo de la Reforma / Ángel
      { lat: 19.4270, lng: -99.1677, timestamp: new Date(now.getTime() - 3600000 * 2.6) },
      // Chapultepec
      { lat: 19.4204, lng: -99.1817, timestamp: new Date(now.getTime() - 3600000 * 2.4) },
      // Condesa
      { lat: 19.4115, lng: -99.1731, timestamp: new Date(now.getTime() - 3600000 * 2.2) },
      // Roma Norte
      { lat: 19.4195, lng: -99.1621, timestamp: new Date(now.getTime() - 3600000 * 2) },
      // Av. División del Norte
      { lat: 19.3892, lng: -99.1567, timestamp: new Date(now.getTime() - 3600000 * 1.8) },
      // Metro Coyoacán
      { lat: 19.3501, lng: -99.1623, timestamp: new Date(now.getTime() - 3600000 * 1.5) },
      // Centro de Coyoacán
      { lat: 19.3500, lng: -99.1620, timestamp: new Date(now.getTime() - 3600000 * 1.3) },
      // Viveros de Coyoacán
      { lat: 19.3549, lng: -99.1689, timestamp: new Date(now.getTime() - 3600000 * 1) },
      // Universidad - Fin
      { lat: 19.3300, lng: -99.1867, timestamp: new Date(now.getTime() - 3600000 * 0.5) },
    ];

    // ============================================
    // RUTA 2: Polanco -> Santa Fe
    // Zona de negocios
    // ============================================
    const route2Path = [
      // Polanco - Inicio (Av. Presidente Masaryk)
      { lat: 19.4333, lng: -99.1950, timestamp: new Date(now.getTime() - 7200000 * 2) },
      // Auditorio Nacional
      { lat: 19.4253, lng: -99.1922, timestamp: new Date(now.getTime() - 7200000 * 1.9) },
      // Bosque de Chapultepec
      { lat: 19.4194, lng: -99.1989, timestamp: new Date(now.getTime() - 7200000 * 1.8) },
      // Lomas de Chapultepec
      { lat: 19.4231, lng: -99.2156, timestamp: new Date(now.getTime() - 7200000 * 1.6) },
      // Av. Constituyentes
      { lat: 19.4089, lng: -99.2267, timestamp: new Date(now.getTime() - 7200000 * 1.4) },
      // Periférico Sur
      { lat: 19.3956, lng: -99.2456, timestamp: new Date(now.getTime() - 7200000 * 1.2) },
      // Santa Fe (Centro Comercial)
      { lat: 19.3594, lng: -99.2747, timestamp: new Date(now.getTime() - 7200000 * 1) },
      // Corporativo Santa Fe
      { lat: 19.3650, lng: -99.2612, timestamp: new Date(now.getTime() - 7200000 * 0.8) },
      // Plaza Santa Fe
      { lat: 19.3589, lng: -99.2756, timestamp: new Date(now.getTime() - 7200000 * 0.6) },
      // Centro de Santa Fe - Fin
      { lat: 19.3570, lng: -99.2780, timestamp: new Date(now.getTime() - 7200000 * 0.4) },
    ];

    // Crear Ruta 1
    const existingRoute1 = await Route.findOne({
      'start_location.lat': route1Path[0].lat,
      moto_id: motoId
    });

    if (!existingRoute1) {
      await Route.create({
        moto_id: motoId,
        user_id: userId,
        start_location: {
          lat: route1Path[0].lat,
          lng: route1Path[0].lng,
          address: 'Zócalo, Centro Histórico, CDMX'
        },
        end_location: {
          lat: route1Path[route1Path.length - 1].lat,
          lng: route1Path[route1Path.length - 1].lng,
          address: 'Ciudad Universitaria, CDMX'
        },
        start_time: route1Path[0].timestamp,
        end_time: route1Path[route1Path.length - 1].timestamp,
        distance_km: 15.8,
        duration_minutes: 150,
        path: route1Path,
        visits: [],
        created_at: route1Path[0].timestamp
      });
      console.log('\n✅ Ruta 1 creada: Centro Histórico -> CU');
      console.log(`   Distancia: 15.8 km | Puntos GPS: ${route1Path.length}`);
    } else {
      console.log('\n⚠️ Ruta 1 ya existe');
    }

    // Crear Ruta 2
    const existingRoute2 = await Route.findOne({
      'start_location.lat': route2Path[0].lat,
      moto_id: motoId
    });

    if (!existingRoute2) {
      await Route.create({
        moto_id: motoId,
        user_id: userId,
        start_location: {
          lat: route2Path[0].lat,
          lng: route2Path[0].lng,
          address: 'Polanco, CDMX'
        },
        end_location: {
          lat: route2Path[route2Path.length - 1].lat,
          lng: route2Path[route2Path.length - 1].lng,
          address: 'Santa Fe, CDMX'
        },
        start_time: route2Path[0].timestamp,
        end_time: route2Path[route2Path.length - 1].timestamp,
        distance_km: 12.3,
        duration_minutes: 96,
        path: route2Path,
        visits: [],
        created_at: route2Path[0].timestamp
      });
      console.log('\n✅ Ruta 2 creada: Polanco -> Santa Fe');
      console.log(`   Distancia: 12.3 km | Puntos GPS: ${route2Path.length}`);
    } else {
      console.log('\n⚠️ Ruta 2 ya existe');
    }

    console.log('\n========== RESUMEN ==========');
    const totalRoutes = await Route.countDocuments();
    console.log(`Total de rutas en BD: ${totalRoutes}`);
    console.log('\n¡Datos de prueba generados!');
    console.log('Ahora puedes ver las rutas en admin/routes');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

generateTestRoutes();
