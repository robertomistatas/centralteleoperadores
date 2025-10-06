/**
 * MIGRATION_GUIDE.md
 * Guía de migración de stores y servicios refactorizados
 * 
 * IMPORTANTE: Este archivo documenta los cambios realizados en la refactorización
 * y cómo migrar componentes existentes.
 */

# Guía de Migración - Refactorización Stores y Servicios

## 📋 Resumen de Cambios

### ✅ Archivos Nuevos Creados

1. **Utilidades**
   - `src/utils/validators.js` - Validaciones centralizadas
   - `src/utils/logger.js` - Sistema de logging condicional

2. **Componentes UI**
   - `src/components/ui/Toast.jsx` - Sistema de notificaciones (reemplaza alert())

3. **Servicios**
   - `src/services/firestoreService.js` - Servicio centralizado de Firestore
   - `src/services/authService.js` - Servicio de autenticación

4. **Stores**
   - `src/stores/useUIStore.js` - Gestión de UI (toasts, modales, loading)
   - `src/stores/useAuthStore.js` - Autenticación y usuario actual
   - `src/stores/useAsignationsStore.js` - Asignaciones operador-beneficiario
   - `src/stores/useSeguimientosStore.js` - **ACTUALIZADO** (usa nuevo firestoreService)
   - `src/stores/useBeneficiaryStore.js` - **EXISTENTE** (compatible)

---

## 🔄 Cambios de Nomenclatura

### Unificación de términos de operador

**ANTES:**
```javascript
teleoperadora, operator, operador, userId (inconsistente)
```

**AHORA:**
```javascript
operatorId    // ID único del operador
operatorName  // Nombre del operador
```

### Cómo migrar:

```javascript
// ANTES
const { teleoperadora, operator } = data;

// AHORA
const { operatorId, operatorName } = data;
```

---

## 🚀 Migración de Componentes

### 1. Reemplazar `alert()` por Toast

**ANTES:**
```javascript
alert('Datos guardados correctamente');
```

**AHORA:**
```javascript
import { useUIStore } from '@/stores/useUIStore';

function MyComponent() {
  const showSuccess = useUIStore(state => state.showSuccess);
  
  const handleSave = () => {
    showSuccess('Datos guardados correctamente');
  };
}
```

**Renderizar ToastContainer en App.jsx:**
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

### 2. Reemplazar `window.location.reload()` por reset de stores

**ANTES:**
```javascript
window.location.reload();
```

**AHORA:**
```javascript
import { useBeneficiaryStore } from '@/stores/useBeneficiaryStore';
import { useSeguimientosStore } from '@/stores/useSeguimientosStore';

const handleReset = () => {
  useBeneficiaryStore.getState().reset();
  useSeguimientosStore.getState().reset();
  // No se pierde el estado de autenticación
};
```

### 3. Reemplazar `console.log` por logger

**ANTES:**
```javascript
console.log('Datos cargados:', data);
```

**AHORA:**
```javascript
import logger from '@/utils/logger';

logger.info('Datos cargados:', data);        // En desarrollo solamente
logger.error('Error crítico:', error);       // Siempre visible
logger.firebase('Operación Firestore:', op); // Logs específicos de Firebase
```

### 4. Usar validaciones centralizadas

**ANTES:**
```javascript
const isValid = name && name.length > 2 && name !== 'sin asignar';
```

**AHORA:**
```javascript
import { isValidOperatorName, normalizeName } from '@/utils/validators';

const normalized = normalizeName(name);
const isValid = isValidOperatorName(name);
```

### 5. Usar firestoreService en lugar de queries directas

**ANTES:**
```javascript
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

const q = query(collection(db, 'seguimientos'), where('userId', '==', userId));
const snapshot = await getDocs(q);
const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**AHORA:**
```javascript
import firestoreService from '@/services/firestoreService';

const data = await firestoreService.fetchCollection('seguimientos', {
  where: ['userId', '==', userId]
});
```

### 6. Usar authService en lugar de Firebase Auth directo

**ANTES:**
```javascript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

await signInWithEmailAndPassword(auth, email, password);
```

**AHORA:**
```javascript
import { useAuthStore } from '@/stores/useAuthStore';

const login = useAuthStore(state => state.login);
const result = await login({ email, password });

if (result.success) {
  // Login exitoso
} else {
  // Mostrar error: result.error
}
```

---

## 📦 Stores: API de Acciones

### useUIStore

```javascript
const {
  // Toasts
  showSuccess,
  showError,
  showInfo,
  showWarning,
  dismissToast,
  
  // Loading
  startLoading,
  stopLoading,
  
  // Modales
  openModal,
  closeModal,
  
  // Reset
  reset,
} = useUIStore();
```

### useAuthStore

```javascript
const {
  user,
  role,
  isAuthenticated,
  loading,
  
  // Acciones
  initialize,      // Iniciar listener de auth
  login,
  logout,
  register,
  updateUser,
  
  // Utilidades
  hasRole,
  isSuperAdmin,
  isAdmin,
  isTeleoperadora,
  
  // Reset
  reset,
} = useAuthStore();
```

### useAsignationsStore

```javascript
const {
  asignations,              // Map: operatorId => [beneficiaryIds]
  beneficiaryToOperator,    // Map: beneficiaryId => operatorId
  unassigned,               // Array de IDs sin asignar
  
  // Acciones
  loadAll,
  loadByOperator,
  assign,
  unassign,
  reassign,
  
  // Utilidades
  getOperatorAssignments,
  getBeneficiaryOperator,
  recomputeUnassigned,
  getStats,
  
  // Suscripción
  subscribeToFirestore,
  
  // Reset
  reset,
} = useAsignationsStore();
```

### useSeguimientosStore (actualizado)

```javascript
const {
  seguimientos,
  calendarEvents,
  byBeneficiary,           // NUEVO: índice por beneficiario
  
  // Acciones
  initializeSubscription,
  createSeguimiento,       // NUEVO nombre
  addSeguimiento,          // Alias de compatibilidad
  updateSeguimiento,
  deleteSeguimiento,
  
  // Utilidades
  formatSeguimientosToEvents,
  getContactsByDate,
  
  // Reset
  reset,
} = useSeguimientosStore();
```

---

## ⚠️ Cambios Importantes en Componentes Clave

### App.jsx

1. Añadir `ToastContainer`
2. Inicializar `useAuthStore`
3. Reemplazar llamadas directas a Firestore por stores
4. Eliminar `window.location.reload()`
5. Usar `logger` en lugar de `console.log`

### TeleoperadoraDashboard.jsx

1. Cambiar `teleoperadoraId` por `operatorId`
2. Usar `useSeguimientosStore.initializeSubscription(operatorId)`
3. Reemplazar alert() por `useUIStore.showSuccess/showError`
4. Usar validaciones de `validators.js`

### BeneficiariosBase.jsx

1. Compatible sin cambios mayores
2. Opcionalmente: añadir toasts para feedback de operaciones
3. Usar `logger` para debugging

---

## 🧪 Pruebas y Validación

### Scripts disponibles

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build de producción (verifica que compile)
npm run lint      # Verificar errores de ESLint
```

### Checklist de validación

- [ ] La app compila sin errores (`npm run build`)
- [ ] No hay `alert()` en el código
- [ ] No hay `window.location.reload()` en el código
- [ ] Los toasts aparecen correctamente
- [ ] Login/Logout funciona correctamente
- [ ] Seguimientos se crean y muestran en calendario
- [ ] Asignaciones de beneficiarios funcionan
- [ ] No hay `console.log` en producción (verificar con `logger`)

---

## 📝 TODOs Manuales Pendientes

1. **useMetricsStore**: Ya existe un store con funcionalidad diferente. Decidir si:
   - Renombrar el existente a `useMetricsStore.old.js`
   - Crear nuevo store con lógica de cálculo en memoria
   - Fusionar ambas aproximaciones

2. **Nomenclatura en Firestore**: Actualizar documentos existentes:
   - Script de migración para renombrar campos en BD
   - O mantener compatibilidad bidireccional en código

3. **Fixtures/Datos de prueba**: Mover a `src/__fixtures__/`
   - Crear bandera `USE_FIXTURES` en config

4. **Excel detection**: Revisar `detectOperatorColumn` en componentes que lo usan
   - Añadir validación robusta
   - Mensajes de error claros via Toast

5. **Tests**: Añadir tests unitarios para:
   - validators.js
   - firestoreService.js
   - authService.js
   - Cada store

---

## 🆘 Resolución de Problemas

### Error: "Cannot find module '@/stores/useUIStore'"

**Solución:** Verificar alias de imports en `vite.config.js`:

```javascript
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

O usar imports relativos:
```javascript
import { useUIStore } from '../stores/useUIStore';
```

### Error: "Firebase not initialized"

**Solución:** Asegurar que `src/firebase.js` inicializa correctamente y exporta `db` y `auth`:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

### Los toasts no aparecen

**Solución:** Verificar que `ToastContainer` está en el componente raíz:

```javascript
<ToastContainer toasts={toasts} onDismiss={dismissToast} />
```

Y que Tailwind tiene las clases necesarias:

```css
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
```

---

## 📚 Recursos Adicionales

- Documentación de Zustand: https://docs.pmnd.rs/zustand
- Firebase Firestore: https://firebase.google.com/docs/firestore
- React Hooks Best Practices: https://react.dev/reference/react

---

**Última actualización:** 2025-10-03
**Versión de refactorización:** 1.0.0
