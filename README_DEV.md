# Central de Teleoperadores - Guía de Desarrollo

## 📋 Descripción

Sistema de gestión centralizado para teleoperadores que permite:
- Gestión de beneficiarios y asignaciones
- Calendario de seguimientos en tiempo real
- Métricas y estadísticas de operaciones
- Sistema de gestiones y auditoría
- Administración de usuarios y permisos

## 🆕 Cambios Recientes - Refactorización v2.0

Esta versión incluye una refactorización completa con:
- ✅ Servicios centralizados para Firestore y Auth
- ✅ Stores modulares con Zustand
- ✅ Sistema de notificaciones Toast (reemplaza alert())
- ✅ Logger condicional por entorno
- ✅ Validaciones centralizadas
- ✅ Nomenclatura unificada (operatorId/operatorName)
- ✅ Eliminación de window.location.reload()

Ver `MIGRATION_GUIDE.md` para detalles completos de la migración.

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js >= 18.x
- npm >= 9.x
- Cuenta de Firebase configurada

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/robertomistatas/centralteleoperadores.git
cd centralteleoperadores

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Firebase
```

### Variables de Entorno

Crear archivo `.env` en la raíz con:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

### Desarrollo Local

```bash
# Iniciar servidor de desarrollo
npm run dev

# El servidor estará disponible en http://localhost:5173
```

### Construcción para Producción

```bash
# Build optimizado
npm run build

# Preview del build
npm run preview
```

---

## 📁 Estructura del Proyecto

```
src/
├── components/           # Componentes React
│   ├── ui/              # Componentes UI reutilizables (Toast, etc.)
│   ├── admin/           # Panel de administración
│   ├── beneficiaries/   # Gestión de beneficiarios
│   ├── dashboards/      # Dashboards por rol
│   ├── seguimientos/    # Módulo de seguimientos
│   └── gestiones/       # Módulo de gestiones
│
├── stores/              # Zustand stores
│   ├── useAuthStore.js         # Autenticación (nuevo)
│   ├── useUIStore.js           # UI global (nuevo)
│   ├── useAsignationsStore.js  # Asignaciones (nuevo)
│   ├── useBeneficiaryStore.js  # Beneficiarios (actualizado)
│   ├── useSeguimientosStore.js # Seguimientos (actualizado)
│   └── useMetricsStore.js      # Métricas (existente)
│
├── services/            # Servicios de backend
│   ├── firestoreService.js  # Servicio centralizado Firestore (nuevo)
│   ├── authService.js       # Servicio de autenticación (nuevo)
│   ├── beneficiaryService.js
│   ├── seguimientoService.js
│   └── userManagementService.js
│
├── utils/               # Utilidades
│   ├── validators.js    # Validaciones centralizadas (nuevo)
│   ├── logger.js        # Sistema de logging (nuevo)
│   ├── stringNormalization.js
│   └── operatorMapping.js
│
├── hooks/               # Custom hooks
├── firebase.js          # Configuración de Firebase
├── App.jsx              # Componente raíz
├── main.jsx             # Punto de entrada
└── index.css            # Estilos globales (con animaciones Toast)
```

---

## 🔧 Scripts Disponibles

```bash
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción
npm run preview          # Preview del build
npm run lint             # Ejecutar ESLint
npm run init-firestore   # Inicializar Firestore con datos de ejemplo
npm run deploy           # Deploy a GitHub Pages
```

---

## 🧪 Testing y Validación

### Compilación

```bash
# Verificar que el código compila sin errores
npm run build
```

### Linting

```bash
# Verificar código con ESLint
npm run lint
```

### Checklist de Verificación

Después de levantar el servidor (`npm run dev`), verifica:

1. **Autenticación**
   - [ ] Login funciona correctamente
   - [ ] Logout cierra sesión
   - [ ] Roles se asignan correctamente

2. **Beneficiarios**
   - [ ] Cargar lista de beneficiarios
   - [ ] Buscar beneficiarios
   - [ ] Upload de Excel funciona
   - [ ] Exportar a PDF/Excel

3. **Seguimientos**
   - [ ] Ver calendario de seguimientos
   - [ ] Crear nuevo seguimiento
   - [ ] Editar seguimiento existente
   - [ ] Eliminar seguimiento
   - [ ] Actualizaciones en tiempo real

4. **Asignaciones**
   - [ ] Asignar beneficiario a operador
   - [ ] Desasignar beneficiario
   - [ ] Ver asignaciones por operador

5. **UI/UX**
   - [ ] Toasts aparecen correctamente
   - [ ] No hay `alert()` nativo
   - [ ] Loading states funcionan
   - [ ] No hay errores en consola

---

## 🏗️ Arquitectura

### Flujo de Datos

```
Usuario → Componente React
    ↓
Zustand Store (estado local)
    ↓
Service Layer (lógica de negocio)
    ↓
Firestore (persistencia)
```

### Principios de Diseño

1. **Separación de Responsabilidades**
   - Componentes: UI y interacción
   - Stores: Estado de la aplicación
   - Services: Lógica de negocio y API
   - Utils: Funciones puras y helpers

2. **Estado Global vs Local**
   - Zustand para estado compartido entre componentes
   - useState para estado local del componente

3. **Inmutabilidad**
   - Nunca mutar estado directamente
   - Usar operadores de spread o métodos inmutables

4. **Validación en Capas**
   - Frontend: Validación de UX (validators.js)
   - Backend: Firestore Rules (firestore.rules)

---

## 📚 Guías de Uso

### Crear un Nuevo Seguimiento

```javascript
import { useSeguimientosStore } from '@/stores';
import { useUIStore } from '@/stores';

function MyComponent() {
  const createSeguimiento = useSeguimientosStore(state => state.createSeguimiento);
  const showSuccess = useUIStore(state => state.showSuccess);
  
  const handleCreate = async (data) => {
    try {
      await createSeguimiento({
        beneficiarioId: data.beneficiaryId,
        beneficiarioNombre: data.name,
        telefono: data.phone,
        fechaContacto: new Date(),
        resultado: 'exitoso',
        observaciones: data.notes,
      });
      
      showSuccess('Seguimiento creado correctamente');
    } catch (error) {
      showError('Error al crear seguimiento: ' + error.message);
    }
  };
}
```

### Validar y Normalizar Datos

```javascript
import { isValidOperatorName, normalizeName, isValidPhone } from '@/utils/validators';

const validateOperator = (name) => {
  const normalized = normalizeName(name); // Quita tildes, lowercase, trim
  
  if (!isValidOperatorName(normalized)) {
    return { valid: false, error: 'Nombre de operador inválido' };
  }
  
  return { valid: true, normalized };
};
```

### Mostrar Notificaciones

```javascript
import { useUIStore } from '@/stores';

function MyComponent() {
  const { showSuccess, showError, showInfo, showWarning } = useUIStore();
  
  const handleAction = async () => {
    try {
      await performAction();
      showSuccess('Operación completada exitosamente');
    } catch (error) {
      showError('Error: ' + error.message);
    }
  };
}
```

### Logging Condicional

```javascript
import logger from '@/utils/logger';

// Solo se muestra en desarrollo
logger.info('Datos cargados:', data);
logger.debug('Detalle de debugging:', detail);

// Se muestra siempre
logger.error('Error crítico:', error);
logger.warn('Advertencia importante:', warning);

// Logs específicos
logger.firebase('Operación Firestore completada');
logger.store('Estado actualizado en Zustand');
logger.auth('Usuario autenticado');
```

---

## 🔐 Firebase Setup

### Reglas de Firestore

El archivo `firestore.rules` contiene las reglas de seguridad. Asegúrate de desplegarlas:

```bash
firebase deploy --only firestore:rules
```

### Índices de Firestore

Los índices necesarios están en `firestore.indexes.json`. Desplegarlos con:

```bash
firebase deploy --only firestore:indexes
```

O crearlos manualmente desde la consola de Firebase siguiendo los links que aparecen en errores de queries.

### Colecciones Principales

- `users`: Perfiles de usuarios
- `beneficiarios`: Base de beneficiarios
- `seguimientos`: Seguimientos y contactos
- `assignments`: Asignaciones operador-beneficiario
- `gestiones`: Gestiones administrativas
- `metrics`: Métricas agregadas (opcional)

---

## 🐛 Troubleshooting

### Error: "Firebase not initialized"

**Causa:** Variables de entorno no configuradas.

**Solución:** Verificar que `.env` existe y contiene todas las variables de Firebase.

### Error: "Permission denied"

**Causa:** Reglas de Firestore no permiten la operación.

**Solución:** 
1. Verificar que el usuario está autenticado
2. Revisar `firestore.rules` y actualizar permisos
3. Deploy de reglas: `firebase deploy --only firestore:rules`

### Toasts no aparecen

**Causa:** `ToastContainer` no está renderizado.

**Solución:** Añadir en `App.jsx`:

```javascript
import { ToastContainer } from '@/components/ui/Toast';
import { useUIStore } from '@/stores/useUIStore';

function App() {
  const toasts = useUIStore(state => state.toasts);
  const dismissToast = useUIStore(state => state.dismissToast);
  
  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* resto de la app */}
    </>
  );
}
```

### Build falla con errores de imports

**Causa:** Imports con alias `@/` no configurados en Vite.

**Solución:** Verificar `vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: Amazing Feature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Convenciones de Código

- **Componentes:** PascalCase (`MyComponent.jsx`)
- **Funciones:** camelCase (`handleClick`)
- **Constantes:** UPPER_SNAKE_CASE (`API_URL`)
- **Archivos:** kebab-case o camelCase consistente
- **Commits:** Conventional Commits (feat:, fix:, docs:, etc.)

---

## 📝 Licencia

Este proyecto es privado y de uso interno.

---

## 📞 Contacto

Roberto Mistatas - [@robertomistatas](https://github.com/robertomistatas)

---

## 🔗 Links Útiles

- [Documentación de React](https://react.dev)
- [Documentación de Zustand](https://docs.pmnd.rs/zustand)
- [Documentación de Firebase](https://firebase.google.com/docs)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)
- [Guía de Migración](./MIGRATION_GUIDE.md)

---

**Última actualización:** 2025-10-03  
**Versión:** 2.0.0 (Refactorización completa)
