# 📊 Central Teleoperadores - Sistema de Métricas Automatizadas

## 🎯 Descripción

Sistema completo de análisis de llamadas telefónicas con **arquitectura backend-first** usando Firebase Cloud Functions. El sistema procesa automáticamente archivos Excel con datos de llamadas y genera métricas en tiempo real que se muestran en dashboards interactivos.

## 🏗️ Arquitectura

### Backend (Firebase Cloud Functions)
- **Procesamiento automático**: Se dispara al subir Excel a Storage
- **Normalización de datos**: Limpia fechas, nombres, teléfonos inválidos
- **Cálculo de métricas**: Genera estadísticas por teleoperadora, beneficiario y globales
- **Almacenamiento**: Guarda métricas calculadas en Firestore

### Frontend (React + Zustand)
- **Solo consumo**: Lee métricas ya calculadas desde Firestore
- **Tiempo real**: Actualizaciones automáticas con `onSnapshot`
- **Dashboards interactivos**: Visualización con Recharts y shadcn/ui

## 📁 Estructura del Proyecto

```
centralteleoperadores/
├── functions/                    # Cloud Functions (Node.js)
│   ├── package.json             # Dependencias del backend
│   └── index.js                 # Lógica de procesamiento
├── src/
│   ├── components/
│   │   ├── dashboards/          # Dashboards principales
│   │   │   ├── GlobalDashboard.jsx      # Métricas globales
│   │   │   ├── TeleoperadoraDashboard.jsx # Métricas por operadora
│   │   │   └── BeneficiaryDashboard.jsx  # Métricas por beneficiario
│   │   ├── ui/                  # Componentes shadcn/ui
│   │   └── MetricsApp.jsx       # App principal con navegación
│   ├── stores/
│   │   └── useMetricsStore.js   # Store Zustand para métricas
│   ├── lib/
│   │   └── utils.js             # Utilidades CSS
│   └── scripts/
│       └── initializeFirestore.js # Script de inicialización
├── firebase.json                # Configuración Firebase
├── firestore.rules             # Reglas de seguridad Firestore
├── storage.rules               # Reglas de seguridad Storage
├── deploy-full.ps1             # Script de deployment (PowerShell)
└── deploy-full.sh              # Script de deployment (Bash)
```

## 🚀 Instalación y Configuración

### 1. Configurar Firebase

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login en Firebase
firebase login

# Inicializar proyecto (si no existe)
firebase init
```

### 2. Instalar Dependencias

```bash
# Dependencias del frontend
npm install

# Dependencias de Cloud Functions
cd functions
npm install
cd ..
```

### 3. Configurar Firebase en el Frontend

Crear/actualizar `src/lib/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // Tu configuración de Firebase aquí
  apiKey: "tu-api-key",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "tu-app-id"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
```

### 4. Inicializar Firestore

```bash
# Ejecutar script de inicialización
node src/scripts/initializeFirestore.js
```

### 5. Desplegar el Sistema

```bash
# PowerShell (Windows)
.\deploy-full.ps1

# Bash (Linux/Mac)
./deploy-full.sh

# O manualmente:
firebase deploy
```

## 📊 Estructura de Datos en Firestore

### Colecciones Principales

```
/metrics/
├── global                       # Métricas globales del sistema
├── teleoperadoras/
│   └── operators/
│       └── {operatorId}         # Métricas por teleoperadora
├── beneficiarios/
│   └── beneficiaries/
│       └── {beneficiaryId}      # Métricas por beneficiario
└── noAsignados                  # Beneficiarios sin teleoperadora

/calls/                          # Llamadas procesadas
└── {callId}                     # Datos de cada llamada

/processing_log/                 # Historial de procesamiento
└── {logId}                      # Log de cada archivo procesado

/system/
└── config                       # Configuración del sistema
```

### Ejemplo de Métricas Globales

```json
{
  "totalCalls": 1250,
  "successfulCalls": 980,
  "failedCalls": 270,
  "successRate": 78.4,
  "totalDuration": 18750,
  "averageDuration": 15,
  "dayDistribution": {
    "lunes": 180,
    "martes": 220,
    "miércoles": 200
  },
  "hourDistribution": {
    "9": 45,
    "10": 67,
    "11": 82
  },
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

## 🔧 Reglas de Negocio

### Estados de Beneficiarios

- **Al día**: Llamada exitosa en los últimos 15 días
- **Pendiente**: Llamada exitosa entre 15-30 días atrás
- **Urgente**: Sin llamadas exitosas en más de 30 días

### Validaciones de Datos

- **Teléfonos inválidos**: `000000000` se ignora automáticamente
- **Normalización**: Nombres sin tildes, minúsculas para comparación
- **Fechas**: Conversión automática desde formato Excel

## 📈 Uso de los Dashboards

### Dashboard Global
- KPIs principales del sistema
- Gráficos de distribución temporal
- Estado general de beneficiarios
- Top teleoperadoras

### Dashboard de Teleoperadora
- Métricas individuales de performance
- Historial detallado de llamadas
- Filtros por período y tipo de llamada
- Lista de beneficiarios atendidos

### Dashboard de Beneficiarios
- Vista general con estados
- Búsqueda y filtros avanzados
- Detalle individual con historial completo
- Timeline de contactos

## 🔄 Flujo de Procesamiento

1. **Upload**: Usuario sube Excel a Firebase Storage
2. **Trigger**: Cloud Function se ejecuta automáticamente
3. **Parsing**: Excel → JSON con validaciones
4. **Análisis**: Cálculo de todas las métricas
5. **Storage**: Métricas guardadas en Firestore
6. **Update**: Frontend se actualiza en tiempo real

## 🛡️ Seguridad

### Firestore Rules
- Solo usuarios autenticados pueden leer métricas
- Cloud Functions tienen acceso administrativo

### Storage Rules
- Solo archivos Excel permitidos
- Usuarios autenticados pueden subir archivos

## 🚀 Comandos Útiles

```bash
# Desarrollo local
npm run dev                      # Frontend en desarrollo
firebase emulators:start        # Emuladores locales

# Deployment
firebase deploy --only functions # Solo Functions
firebase deploy --only firestore # Solo reglas Firestore
firebase deploy --only hosting   # Solo frontend

# Monitoreo
firebase functions:log           # Logs de Functions
firebase functions:log --only processExcelFile # Logs específicos

# Testing
firebase emulators:exec --only functions "npm test" # Tests locales
```

## 📋 Lista de Verificación Post-Deployment

- [ ] Firebase Authentication configurado
- [ ] Firestore inicializado con estructura correcta
- [ ] Storage configurado con reglas de seguridad
- [ ] Cloud Functions desplegadas y funcionando
- [ ] Frontend desplegado en Hosting
- [ ] Prueba de subida de Excel funcional
- [ ] Dashboards mostrando datos correctamente

## 🔧 Troubleshooting

### Error en Cloud Functions
```bash
# Ver logs detallados
firebase functions:log --limit 50

# Verificar configuración
firebase functions:config:get
```

### Error en Firestore
```bash
# Verificar reglas
firebase firestore:rules:get

# Verificar índices
firebase firestore:indexes
```

### Error en el Frontend
- Verificar configuración de Firebase en `src/lib/firebase.js`
- Comprobar que el usuario está autenticado
- Revisar consola del navegador para errores de permisos

## 📞 Soporte

Para soporte técnico:
1. Revisar logs de Firebase Functions
2. Verificar estructura de datos en Firestore Console
3. Comprobar reglas de seguridad
4. Validar formato del archivo Excel

## 🔄 Actualizaciones Futuras

- [ ] Notificaciones automáticas por email
- [ ] Exportación de reportes en PDF
- [ ] API REST para integraciones externas
- [ ] Dashboard móvil responsivo
- [ ] Sistema de alertas configurables