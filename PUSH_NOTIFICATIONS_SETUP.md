# Configuración de Push Notifications - Backend

## ✅ Cambios Implementados

1. ✅ **firebase-admin** instalado
2. ✅ Servicio de Push Notifications creado (`src/services/pushNotificationService.js`)
3. ✅ Modelo User actualizado con campos FCM
4. ✅ Endpoint `/api/users/fcm-token` para guardar tokens
5. ✅ Endpoint `/api/tasks/panic-button` modificado para enviar notificaciones
6. ✅ `.gitignore` actualizado

## 🔧 Configuración Requerida

### Opción 1: Variables de Entorno (Recomendado para Producción/Vercel)

Agrega estas variables de entorno en Vercel o en tu `.env`:

```bash
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXXX\n-----END PRIVATE KEY-----\n"
```

**Cómo obtener estos valores:**

1. Ve a Firebase Console → Project Settings → Service Accounts
2. Clic en "Generate new private key"
3. Se descargará un archivo JSON con estos valores:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (copia el valor completo con \n)

**En Vercel:**
1. Ve a tu proyecto → Settings → Environment Variables
2. Agrega las 3 variables
3. Redeploy el proyecto

### Opción 2: Archivo JSON (Solo para Desarrollo Local)

Si vas a probar localmente:

1. Descarga el archivo Service Account JSON de Firebase
2. Renómbralo a `firebase-service-account.json`
3. Colócalo en la raíz del proyecto backend
4. ⚠️ **NO lo subas a Git** (ya está en .gitignore)

## 📱 Cómo Funciona

### Cuando un usuario abre la app:

1. La app solicita permiso para notificaciones
2. Obtiene el token FCM del dispositivo
3. Envía el token al backend: `POST /api/users/fcm-token`
4. El token se guarda en el campo `fcm_token` del usuario
5. El usuario se suscribe a topics según su rol

### Cuando se presiona el Panic Button:

1. Se crea la tarea/alerta en la BD
2. Se envía notificación a **TODOS** los usuarios (topic `all`)
3. Se envía notificación adicional a **admins** (topic `admins`)
4. Todos los usuarios con la app reciben la notificación

## 🧪 Probar las Notificaciones

### 1. Probar desde Firebase Console (sin código)

1. Ve a Firebase Console → Cloud Messaging
2. Clic en "Send your first message"
3. Título: "Prueba de notificación"
4. Texto: "Esta es una prueba"
5. Target: "Topic" → escribe `all`
6. Clic en "Review" → "Publish"

Todos los dispositivos con la app deberían recibir la notificación.

### 2. Probar el Panic Button

1. Asegúrate de tener las variables de entorno configuradas
2. Instala la APK en un dispositivo
3. Abre la app y haz login
4. Ve a "Reportar Alerta" (Panic Button)
5. Envía una alerta
6. Todos los usuarios con la app deberían recibir la notificación

### 3. Verificar Logs

En los logs del servidor deberías ver:

```
✅ Firebase Admin initialized
✅ FCM token saved for user [nombre]
📬 Push notification sent to all users: { success: true, ... }
```

## 📋 Endpoints Disponibles

### Guardar Token FCM
```http
POST /api/users/fcm-token
Authorization: Bearer <token>

{
  "user_id": "64abc123...",
  "fcm_token": "eF7kL3mN...",
  "platform": "android"
}
```

### Panic Button (ya modificado)
```http
POST /api/tasks/panic-button
Authorization: Bearer <token>

{
  "local_id": "64abc123...",
  "location": "19.4326,-99.1332",
  "photo": "data:image/jpeg;base64,..."
}
```

## 🔔 Enviar Notificaciones Manualmente

Puedes usar el servicio en cualquier ruta:

```javascript
const pushNotificationService = require('../services/pushNotificationService');

// Enviar a todos
await pushNotificationService.sendToAll({
  title: 'Título',
  body: 'Mensaje',
  data: { route: '/admin/activities' }
});

// Enviar a un topic
await pushNotificationService.sendToTopic('admins', {
  title: 'Solo para admins',
  body: 'Mensaje exclusivo',
  data: {}
});

// Enviar a un usuario específico
await pushNotificationService.sendToUser(userId, {
  title: 'Notificación personal',
  body: 'Solo para ti',
  data: { route: '/motos/tasks' }
});
```

## ⚠️ Troubleshooting

### "Firebase not initialized"
- Verifica que las variables de entorno estén configuradas en Vercel
- O que el archivo `firebase-service-account.json` exista localmente

### "User has no FCM token"
- El usuario debe abrir la app al menos una vez
- Verifica que el endpoint `/api/users/fcm-token` esté funcionando

### Notificaciones no llegan
- Verifica los logs del servidor
- Prueba enviar desde Firebase Console primero
- Asegúrate de que el usuario esté suscrito al topic correcto

## 📚 Recursos

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
