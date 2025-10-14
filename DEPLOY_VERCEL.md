# Guía de Despliegue en Vercel - Bonus System API

## 📋 Requisitos Previos

- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (base de datos en la nube)
- Cuenta en [Cloudinary](https://cloudinary.com) (almacenamiento de imágenes)
- Repositorio Git (GitHub, GitLab, o Bitbucket)

## 🚀 Pasos para Desplegar

### 1. Preparar MongoDB Atlas

1. Ve a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea un cluster gratuito (M0)
3. En "Database Access", crea un usuario con contraseña
4. En "Network Access", agrega `0.0.0.0/0` para permitir acceso desde cualquier IP (Vercel usa IPs dinámicas)
5. Obtén tu connection string:
   - Formato: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/bonus-system?retryWrites=true&w=majority`

### 2. Preparar Cloudinary

1. Ve a [Cloudinary](https://cloudinary.com)
2. Regístrate o inicia sesión
3. En el Dashboard, copia:
   - Cloud Name
   - API Key
   - API Secret

### 3. Subir Código a Git

```bash
cd bonus-system-api
git init
git add .
git commit -m "Initial commit - Bonus System API"
git remote add origin <tu-repositorio-url>
git push -u origin main
```

### 4. Desplegar en Vercel

#### Opción A: Desde la Web de Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en "Add New" → "Project"
3. Importa tu repositorio Git
4. Configura el proyecto:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (o la carpeta donde está la API)
   - **Build Command**: (dejar vacío)
   - **Output Directory**: (dejar vacío)

#### Opción B: Desde CLI de Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desde la carpeta bonus-system-api
cd bonus-system-api

# Login en Vercel
vercel login

# Desplegar
vercel

# Para producción
vercel --prod
```

### 5. Configurar Variables de Entorno en Vercel

1. En el proyecto de Vercel, ve a **Settings** → **Environment Variables**
2. Agrega las siguientes variables:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://...` | Connection string de MongoDB Atlas |
| `JWT_SECRET` | `tu-secreto-super-seguro-aqui` | Clave secreta para JWT (genera una aleatoria) |
| `CLOUDINARY_CLOUD_NAME` | `tu-cloud-name` | Cloud Name de Cloudinary |
| `CLOUDINARY_API_KEY` | `123456789012345` | API Key de Cloudinary |
| `CLOUDINARY_API_SECRET` | `tu-api-secret` | API Secret de Cloudinary |
| `NODE_ENV` | `production` | Ambiente de ejecución |

**IMPORTANTE**: Marca todas las variables para los 3 ambientes: Production, Preview, Development

### 6. Re-deployar con Variables

Después de agregar las variables de entorno:

1. Ve a **Deployments**
2. Click en los "..." del último deployment
3. Click en "Redeploy"
4. Selecciona "Use existing Build Cache" → NO
5. Click en "Redeploy"

### 7. Verificar el Despliegue

Tu API estará disponible en: `https://tu-proyecto.vercel.app`

Prueba el endpoint de health check:
```bash
curl https://tu-proyecto.vercel.app/
```

Respuesta esperada:
```json
{
  "message": "Bonus System API",
  "status": "running",
  "version": "1.0.0"
}
```

## 🔧 Actualizar el Frontend

Una vez desplegada la API, actualiza la URL en tu frontend:

### En `bonus-system-web/src/services/api.js`:

```javascript
const API_URL = process.env.VITE_API_URL || 'https://tu-proyecto.vercel.app/api';
```

### Crea un archivo `.env` en `bonus-system-web`:

```env
VITE_API_URL=https://tu-proyecto.vercel.app/api
```

## 🔒 Configuración de CORS

La API ya está configurada para aceptar peticiones desde:
- `http://localhost:5173` (Vite dev)
- `http://localhost:3000` (React dev)
- `https://bonus-system.vercel.app` (Producción)

Para agregar más dominios, edita `src/index.js`:

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://bonus-system.vercel.app',
  'https://tu-dominio-personalizado.com', // ← Agrega aquí
];
```

## 📱 Conectar la APK con la API de Vercel

### En `bonus-system-web/src/services/api.js`:

Actualiza la configuración para producción:

```javascript
const getBaseURL = () => {
  // En producción (APK) usar la API de Vercel
  if (typeof window !== 'undefined' && window.cordova) {
    return 'https://tu-proyecto.vercel.app/api';
  }

  // En desarrollo usar localhost o variable de entorno
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

Luego **recompila la APK** con la nueva configuración:

```bash
cd bonus-system-web
npm run build
cd cordova-app
cordova build android
```

## 🐛 Troubleshooting

### Error: CORS Policy

**Problema**: La app no puede hacer peticiones a la API

**Solución**:
1. Verifica que el dominio del frontend esté en `allowedOrigins` en `src/index.js`
2. Haz re-deploy en Vercel después del cambio
3. Limpia la caché del navegador

### Error: Cannot connect to MongoDB

**Problema**: La API no puede conectarse a MongoDB

**Solución**:
1. Verifica que `MONGODB_URI` esté configurada correctamente en Vercel
2. Asegúrate de que MongoDB Atlas permita conexiones desde `0.0.0.0/0`
3. Verifica que el usuario tenga permisos de lectura/escritura

### Error: Cloudinary upload failed

**Problema**: Las imágenes no se pueden subir

**Solución**:
1. Verifica las credenciales de Cloudinary en las variables de entorno
2. Asegúrate de que el API Key y API Secret sean correctos
3. Verifica que tu cuenta de Cloudinary esté activa

### Error: Function timeout

**Problema**: Las peticiones tardan más de 10 segundos

**Solución**:
- Vercel Free tiene un límite de 10 segundos por función
- Considera actualizar a Vercel Pro para 60 segundos
- Optimiza las consultas de base de datos
- Usa índices en MongoDB

## 📊 Monitoreo

1. **Logs**: Ve a tu proyecto en Vercel → Deployments → View Function Logs
2. **Analytics**: Vercel → Analytics (en el plan Pro)
3. **MongoDB Monitoring**: MongoDB Atlas → Metrics

## 🔄 Actualizar la API

### Método Automático (Recomendado)

Cada vez que hagas `git push` a tu repositorio, Vercel desplegará automáticamente.

```bash
git add .
git commit -m "Actualizacion de la API"
git push origin main
```

### Método Manual

```bash
cd bonus-system-api
vercel --prod
```

## 📝 Notas Importantes

- ✅ Vercel Free incluye 100GB de ancho de banda mensual
- ✅ 10 segundos de timeout por función (60s en Pro)
- ✅ Despliegues ilimitados
- ✅ SSL/HTTPS automático
- ✅ CDN global
- ⚠️ La API debe ser stateless (Vercel usa funciones serverless)
- ⚠️ MongoDB Atlas Free tiene límite de 512MB

## 🎯 Checklist Final

- [ ] MongoDB Atlas configurado con IP `0.0.0.0/0`
- [ ] Cloudinary configurado
- [ ] Variables de entorno agregadas en Vercel
- [ ] API desplegada exitosamente
- [ ] Health check funciona: `https://tu-proyecto.vercel.app/`
- [ ] Frontend actualizado con nueva URL
- [ ] APK recompilada con URL de producción
- [ ] CORS configurado correctamente
- [ ] Logs verificados sin errores

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs en Vercel Dashboard
2. Verifica las variables de entorno
3. Prueba los endpoints con Postman
4. Revisa la conexión a MongoDB Atlas

---

✅ **Tu API está lista para producción en Vercel** 🎉
