# Bonus System API

API REST para el sistema de gestión de máquinas tragamonedas.

## 🚀 Instalación

### 1. Clonar repositorio
```bash
git clone <url-repo>
cd bonus-system-api
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crear archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:
- MongoDB URI (usar MongoDB Atlas)
- JWT Secret
- Cloudinary credentials

### 4. Inicializar base de datos
```bash
node scripts/init-db.js
```

### 5. Correr en desarrollo
```bash
npm run dev
```

## 📦 Deploy en Vercel

### 1. Instalar Vercel CLI
```bash
npm i -g vercel
```

### 2. Login en Vercel
```bash
vercel login
```

### 3. Configurar variables de entorno en Vercel
```bash
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
vercel env add CLOUDINARY_CLOUD_NAME production
vercel env add CLOUDINARY_API_KEY production
vercel env add CLOUDINARY_API_SECRET production
```

### 4. Desplegar
```bash
vercel --prod
```

## 📚 Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/change-password` - Cambiar contraseña
- `POST /api/auth/reset-password/:userId` - Resetear contraseña (admin)
- `GET /api/auth/me` - Obtener usuario actual

### Usuarios
- `POST /api/users` - Crear usuario
- `GET /api/users` - Listar usuarios
- `GET /api/users/:id` - Obtener usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario
- `POST /api/users/:id/delegate-permissions` - Delegar permisos

### Locales
- `POST /api/locales` - Crear local
- `GET /api/locales` - Listar locales
- `GET /api/locales/:id` - Obtener local
- `PUT /api/locales/:id` - Actualizar local
- `DELETE /api/locales/:id` - Eliminar local
- `POST /api/locales/:id/update-fund` - Actualizar fondo

### Máquinas
- `POST /api/machines` - Crear máquina
- `GET /api/machines` - Listar máquinas
- `PUT /api/machines/:id` - Actualizar máquina
- `DELETE /api/machines/:id` - Eliminar máquina

### Tareas
- `POST /api/tasks` - Crear tarea
- `GET /api/tasks` - Listar tareas
- `GET /api/tasks/:id` - Obtener tarea
- `POST /api/tasks/:id/accept` - Aceptar tarea (moto)
- `POST /api/tasks/:id/status` - Cambiar estado
- `POST /api/tasks/:id/confirm` - Confirmar tarea
- `POST /api/tasks/panic-button` - Botón de pánico
- `POST /api/tasks/:id/reassign` - Reasignar (admin)

### Préstamos
- `POST /api/loans` - Solicitar préstamo
- `GET /api/loans` - Listar préstamos
- `GET /api/loans/:id` - Obtener préstamo
- `POST /api/loans/:id/approve` - Aprobar/Rechazar
- `POST /api/loans/:id/payment/:index` - Registrar pago

### Pagos
- `POST /api/payments/salary` - Pagar sueldo
- `POST /api/payments/service` - Pagar servicio
- `GET /api/payments` - Listar pagos
- `GET /api/payments/pending` - Pagos pendientes
- `GET /api/payments/:id/receipt` - Generar recibo PDF

### Gastos
- `POST /api/expenses` - Crear gasto
- `GET /api/expenses` - Listar gastos
- `POST /api/expenses/:id/approve` - Aprobar/Rechazar

### Asistencias
- `POST /api/attendances/check-in` - Registrar entrada
- `POST /api/attendances/check-out` - Registrar salida
- `POST /api/attendances/absence` - Registrar falta/permiso
- `GET /api/attendances` - Listar asistencias
- `GET /api/attendances/summary/:userId` - Resumen

### Motos
- `POST /api/motos` - Crear moto
- `GET /api/motos` - Listar motos
- `GET /api/motos/:id` - Obtener moto
- `PUT /api/motos/:id` - Actualizar moto
- `POST /api/motos/:id/update-km` - Actualizar kilometraje
- `POST /api/motos/:id/service` - Registrar servicio

### Rutas
- `POST /api/routes/start` - Iniciar ruta
- `POST /api/routes/:id/update-location` - Actualizar ubicación
- `POST /api/routes/:id/visit` - Registrar visita
- `POST /api/routes/:id/end` - Finalizar ruta
- `GET /api/routes` - Listar rutas
- `GET /api/routes/live-location` - Ubicación en vivo (admin)

### Reportes
- `GET /api/reports/attendances` - Reporte de asistencias (Excel)
- `GET /api/reports/changes-by-local` - Cambios por local (Excel)
- `GET /api/reports/failures` - Historial de fallas (Excel)
- `GET /api/reports/prizes` - Historial de premios (Excel)
- `GET /api/reports/moto-expenses` - Gastos de moto (Excel)
- `GET /api/reports/consolidated` - Reporte consolidado (JSON)

### Configuraciones
- `GET /api/config` - Obtener configuraciones
- `PUT /api/config` - Actualizar configuraciones (admin)

### Notificaciones
- `GET /api/notifications` - Listar notificaciones
- `PUT /api/notifications/:id/read` - Marcar como leída
- `PUT /api/notifications/read-all` - Marcar todas como leídas

## 🔐 Autenticación

Todas las rutas (excepto login) requieren token JWT en el header:
```
Authorization: Bearer <token>
```

## 👥 Roles y Permisos

### Admin
- Acceso completo a todas las rutas
- Crear/editar/eliminar usuarios, locales, motos
- Aprobar préstamos
- Pagar sueldos
- Ver todos los reportes
- Configurar sistema

### Moto
- Ver y gestionar sus tareas asignadas
- Reportar gastos
- Solicitar préstamos
- Ver su perfil y cambiar contraseña
- Registrar rutas y visitas

### Local
- Solicitar cambio
- Reportar fallas, premios, rellenos, gastos
- Botón de pánico
- Registro de salida
- Solicitar préstamos
- Ver su perfil y cambiar contraseña

## 📊 Reglas de Negocio Implementadas

### Fondos
- Fondo mínimo configurable (default: $1,500)
- Validación de fondo suficiente para cambios
- Actualización automática en transacciones

### Tiempos
- Falla urgente: 2 horas máximo
- Falla normal: 4 horas desde llegada al local
- Notificación automática si se excede

### Préstamos
- Máximo: $5,000
- Solo 1 préstamo activo por empleado
- Sin intereses
- Pago semanal automático con nómina
- Descuento de finiquito si renuncia

### Nómina
- Pago semanal
- Descuento por falta: 1 día de sueldo
- Descuento por retardo: cada 3 retardos = 0.5 día
- Permisos: sin descuento
- Abono de préstamo automático

### Asistencias
- Tolerancia: 15 minutos
- Hasta 30 min: retardo
- Más de 30 min: falta

### Motos
- Servicio cada 3,000 km
- Alerta 100 km antes
- Bloqueo si excede 200 km del servicio (con autorización admin puede trabajar)

### Cambios
- Máximo 5 solicitudes simultáneas por local
- Validación de fondo suficiente
- Asignación automática a moto más cercano

## 🗄️ Estructura de Base de Datos

### Colecciones Principales:
- `users` - Usuarios del sistema
- `locales` - Locales/establecimientos
- `machines` - Máquinas tragamonedas
- `tasks` - Tareas (cambios, fallas, premios, etc.)
- `loans` - Préstamos
- `payments` - Pagos (sueldos, servicios)
- `expenses` - Gastos de motos
- `attendances` - Asistencias
- `motos` - Información de motos
- `routes` - Rutas de motos
- `notifications` - Notificaciones
- `systemconfigs` - Configuraciones del sistema
- `auditlogs` - Log de auditoría

## 🔧 Tecnologías Utilizadas

- **Node.js** + **Express** - Backend
- **MongoDB** + **Mongoose** - Base de datos
- **JWT** - Autenticación
- **Bcrypt** - Encriptación de contraseñas
- **Cloudinary** - Almacenamiento de imágenes
- **ExcelJS** - Generación de reportes Excel
- **PDFKit** - Generación de PDFs
- **Canvas** - Procesamiento de firma digital

## 📝 Usuarios de Prueba

Después de ejecutar `init-db.js`:

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@bonussystem.com | Admin123! | admin |
| moto@bonussystem.com | Moto123! | moto |
| local@bonussystem.com | Local123! | local |

## 🐛 Troubleshooting

### Error de conexión a MongoDB
- Verificar que MONGODB_URI esté correctamente configurado
- Asegurar que IP esté en whitelist de MongoDB Atlas

### Error al subir imágenes
- Verificar credenciales de Cloudinary
- Verificar que las imágenes estén en formato base64

### Error 401 Unauthorized
- Verificar que el token JWT esté en el header
- Verificar que el token no haya expirado (7 días)

## 📄 Licencia

Propiedad de Bonus System - Todos los derechos reservados
