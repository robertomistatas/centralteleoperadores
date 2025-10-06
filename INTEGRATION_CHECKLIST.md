/**
 * INTEGRATION_CHECKLIST.md
 * Lista de verificación para integrar la refactorización
 */

# ✅ Checklist de Integración - Refactorización v2.0

## 🎯 Antes de Empezar

- [ ] Hacer backup del código actual (commit o branch)
- [ ] Leer `REFACTORING_SUMMARY.md` completo
- [ ] Revisar `MIGRATION_GUIDE.md` para entender cambios
- [ ] Tener terminal abierta con `npm run dev` corriendo

---

## 📦 Paso 1: Verificar Archivos Nuevos (Ya completado ✅)

- [x] `src/utils/validators.js` existe
- [x] `src/utils/logger.js` existe
- [x] `src/components/ui/Toast.jsx` existe
- [x] `src/services/firestoreService.js` existe
- [x] `src/services/authService.js` existe
- [x] `src/stores/useUIStore.js` existe
- [x] `src/stores/useAuthStore.js` existe
- [x] `src/stores/useAsignationsStore.js` existe
- [x] `src/stores/useSeguimientosStore.js` actualizado
- [x] `src/stores/index.js` actualizado
- [x] `src/index.css` con animaciones Toast
- [x] Build exitoso (`npm run build` ✓)

---

## 🔧 Paso 2: Integrar Toast en App.jsx (PRIORITARIO)

**Archivo:** `src/App.jsx`

### 2.1 Añadir Imports
```jsx
import { ToastContainer } from './components/ui/Toast';
import { useUIStore } from './stores/useUIStore';
```

### 2.2 Usar el Store
```jsx
const TeleasistenciaApp = () => {
  const toasts = useUIStore(state => state.toasts);
  const dismissToast = useUIStore(state => state.dismissToast);
  const showSuccess = useUIStore(state => state.showSuccess);
  const showError = useUIStore(state => state.showError);
  
  // ... resto del código
```

### 2.3 Renderizar ToastContainer
```jsx
return (
  <>
    <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    {/* resto del JSX */}
  </>
);
```

### 2.4 Verificación
- [ ] ToastContainer renderizado
- [ ] No hay errores en consola
- [ ] Página carga correctamente

**Referencia:** Ver `src/App.INTEGRATION_EXAMPLE.jsx` líneas 1-50

---

## 🚫 Paso 3: Reemplazar alert() en App.jsx

**Archivo:** `src/App.jsx`

**Buscar todas las líneas con `alert(` (9 ocurrencias detectadas)**

### 3.1 Ejemplo de Reemplazo

**ANTES:**
```jsx
alert('Error al crear teleoperador. Intenta nuevamente.');
```

**AHORA:**
```jsx
showError('Error al crear teleoperador. Inténtelo nuevamente.');
```

### 3.2 Checklist de Reemplazos
- [ ] Línea ~533: `alert('Error al crear...')` → `showError(...)`
- [ ] Línea ~584: `alert('✅ Teleoperadora eliminada...')` → `showSuccess(...)`
- [ ] Línea ~588: `alert('❌ Error al eliminar...')` → `showError(...)`
- [ ] Línea ~612: `alert('✅ No se encontraron...')` → `showInfo(...)`
- [ ] Línea ~635: `alert('✅ Proceso de limpieza...')` → `showSuccess(...)`
- [ ] Línea ~706: `alert('Error al guardar...')` → `showError(...)`
- [ ] Línea ~722: `alert('Error al limpiar...')` → `showError(...)`

### 3.3 Verificación
- [ ] No quedan `alert(` en App.jsx
- [ ] Toasts aparecen al ejecutar acciones
- [ ] Mensajes claros y en español formal

---

## 🔄 Paso 4: Eliminar window.location.reload() en App.jsx

**Archivo:** `src/App.jsx`

### 4.1 En la función de logout

**ANTES:**
```jsx
const handleLogout = async () => {
  await logout();
  window.location.reload(); // ❌
};
```

**AHORA:**
```jsx
import { useBeneficiaryStore, useSeguimientosStore } from './stores';

const handleLogout = async () => {
  try {
    await logout();
    
    // Reset stores en lugar de reload
    useBeneficiaryStore.getState().reset();
    useSeguimientosStore.getState().reset();
    useUIStore.getState().reset();
    
    showSuccess('Sesión cerrada correctamente');
  } catch (error) {
    showError('Error al cerrar sesión: ' + error.message);
  }
};
```

### 4.2 Verificación
- [ ] No hay `window.location.reload()` en logout
- [ ] Logout funciona sin recargar página
- [ ] Stores se resetean correctamente

**Referencia:** Ver `src/App.INTEGRATION_EXAMPLE.jsx` líneas 58-80

---

## 📝 Paso 5: Reemplazar console.log por logger

**Archivos:** Varios

### 5.1 En App.jsx (opcional pero recomendado)

**ANTES:**
```jsx
console.log('Datos cargados:', data);
```

**AHORA:**
```jsx
import logger from './utils/logger';

logger.info('Datos cargados:', data);
logger.debug('Detalle:', detail); // Solo en dev
logger.error('Error:', error);    // Siempre visible
```

### 5.2 Verificación
- [ ] Imports de logger añadidos
- [ ] console.log reemplazados (al menos en funciones críticas)
- [ ] Logs solo aparecen en desarrollo (verificar con build)

---

## 🔍 Paso 6: Otros Componentes con alert()

### 6.1 SuperAdminDashboard.jsx

**Archivo:** `src/components/admin/SuperAdminDashboard.jsx`

**5 ocurrencias detectadas**

**Patrón:**
```jsx
// Añadir al inicio del componente
import { useUIStore } from '@/stores/useUIStore';

function SuperAdminDashboard() {
  const showSuccess = useUIStore(state => state.showSuccess);
  const showError = useUIStore(state => state.showError);
  
  // Reemplazar alert() por showSuccess/showError
}
```

- [ ] Línea ~132: alert('Usuario creado...') → showSuccess(...)
- [ ] Línea ~142: alert('Error al crear...') → showError(...)
- [ ] Línea ~157: alert('Error al editar...') → showError(...)
- [ ] Línea ~172: alert('Error al eliminar...') → showError(...)
- [ ] Línea ~185: alert('Error al cambiar estado...') → showError(...)

### 6.2 Otros componentes (opcional)
- [ ] `components/examples/AuditDemo*.jsx` - 4 ocurrencias
- [ ] `components/examples/CallInitiator.jsx` - 1 ocurrencia

---

## 🔄 Paso 7: Otros window.location.reload()

### 7.1 MetricsTestPanel.jsx

**Archivo:** `src/components/MetricsTestPanel.jsx`

**2 ocurrencias detectadas**

**Patrón de reemplazo:**
```jsx
// ANTES
window.location.reload();

// AHORA
import { useUIStore, useMetricsStore } from '@/stores';

const handleReset = () => {
  useMetricsStore.getState().reset();
  useUIStore.getState().showInfo('Datos reseteados');
};
```

- [ ] Línea ~26: Reemplazar reload
- [ ] Línea ~32: Reemplazar reload

### 7.2 ErrorBoundary.jsx

**Archivo:** `src/components/ErrorBoundary.jsx`

**1 ocurrencia detectada**

- [ ] Línea ~34: Mantener (es el botón de "Recargar página" en error fatal)
  - **NOTA:** En este caso es aceptable mantener `window.location.reload()`
  - Es un error de boundary, queremos recargar completamente

---

## 🧪 Paso 8: Testing en Localhost

### 8.1 Levantar Servidor
```bash
npm run dev
```

### 8.2 Verificaciones Básicas
- [ ] Página carga sin errores
- [ ] Login funciona
- [ ] Toasts aparecen correctamente
- [ ] No hay alert() nativos
- [ ] No hay errores en consola del navegador

### 8.3 Verificaciones de Funcionalidad

#### Autenticación
- [ ] Login muestra toast de éxito
- [ ] Login con error muestra toast de error
- [ ] Logout funciona sin reload
- [ ] Logout muestra toast de confirmación

#### Seguimientos
- [ ] Ver calendario funciona
- [ ] Crear seguimiento muestra toast de éxito
- [ ] Error al crear muestra toast de error
- [ ] Actualizaciones en tiempo real funcionan

#### Beneficiarios
- [ ] Lista carga correctamente
- [ ] Búsqueda funciona
- [ ] Upload muestra toasts de progreso/éxito/error
- [ ] Operaciones CRUD muestran feedback

#### UI General
- [ ] Toasts se animan correctamente (slide-in-right)
- [ ] Toasts se cierran automáticamente después de 5 segundos
- [ ] Botón X cierra toasts manualmente
- [ ] No hay flashes o reloads inesperados

---

## 📊 Paso 9: Build de Producción

### 9.1 Build
```bash
npm run build
```

### 9.2 Verificación
- [ ] Build exitoso sin errores
- [ ] Solo warnings aceptables (chunk size, dynamic imports)
- [ ] No hay errores de imports

### 9.3 Preview (opcional)
```bash
npm run preview
```
- [ ] Preview funciona
- [ ] No hay console.log en producción (verificar)
- [ ] Toasts funcionan igual

---

## 📝 Paso 10: Commit y Documentación

### 10.1 Commit de Cambios
```bash
git add .
git commit -m "refactor: integración completa de stores, services y Toast system

- Añadidos stores modulares (useUIStore, useAuthStore, useAsignationsStore)
- Servicios centralizados (firestoreService, authService)
- Sistema Toast reemplaza alert()
- Eliminado window.location.reload() en logout
- Logger condicional por entorno
- Validaciones centralizadas

Ver REFACTORING_SUMMARY.md y MIGRATION_GUIDE.md para detalles"
```

### 10.2 Documentación Actualizada
- [ ] README_DEV.md refleja nueva arquitectura
- [ ] MIGRATION_GUIDE.md disponible para el equipo
- [ ] REFACTORING_SUMMARY.md documenta cambios

---

## 🎉 Paso 11: Verificación Final

### 11.1 Smoke Tests
- [ ] Login/Logout funciona
- [ ] CRUD de seguimientos funciona
- [ ] CRUD de beneficiarios funciona
- [ ] Toasts aparecen en todas las operaciones
- [ ] No hay errores críticos en consola

### 11.2 Performance
- [ ] Tiempo de carga aceptable
- [ ] No hay lag al interactuar
- [ ] Memoria del navegador estable

### 11.3 Compatibilidad
- [ ] Chrome/Edge funciona
- [ ] Firefox funciona (si es parte del stack)
- [ ] Mobile responsive (si aplica)

---

## 🚀 Despliegue (No realizar aún)

**⚠️ IMPORTANTE:** No hacer deploy hasta completar testing en localhost

Una vez validado localmente:
1. [ ] Merge a branch main/master
2. [ ] Crear tag de versión: `v2.0.0-refactor`
3. [ ] Deploy a staging primero
4. [ ] Validar en staging
5. [ ] Deploy a producción

---

## 🆘 Troubleshooting

### Toast no aparece
**Problema:** Toasts no se muestran al ejecutar acciones

**Solución:**
1. Verificar que `ToastContainer` está renderizado en App.jsx
2. Verificar imports: `import { ToastContainer } from './components/ui/Toast'`
3. Verificar que `useUIStore` está conectado correctamente
4. Abrir DevTools y revisar estado de Zustand (usar extensión)

### Error: "Cannot find module '@/stores'"
**Problema:** Imports con @ no funcionan

**Solución:**
Usar imports relativos en su lugar:
```jsx
// En lugar de:
import { useUIStore } from '@/stores/useUIStore';

// Usar:
import { useUIStore } from './stores/useUIStore';
// o
import { useUIStore } from '../stores/useUIStore';
```

### Error: "firebase is not defined"
**Problema:** Firebase no inicializado

**Solución:**
1. Verificar `.env` tiene todas las variables
2. Verificar `src/firebase.js` inicializa correctamente
3. Reiniciar servidor de desarrollo

### Build falla
**Problema:** `npm run build` da error

**Solución:**
1. Verificar que no hay errores de sintaxis
2. Verificar imports correctos (sin typos)
3. Limpiar node_modules: `rm -rf node_modules && npm install`
4. Limpiar cache: `rm -rf .vite && npm run build`

---

## 📞 Soporte

Si algo no funciona después de seguir este checklist:

1. Revisar `MIGRATION_GUIDE.md` para ejemplos
2. Revisar `src/App.INTEGRATION_EXAMPLE.jsx` para referencia
3. Verificar logs en consola del navegador
4. Usar React DevTools para inspeccionar estado
5. Usar Zustand DevTools extension

---

**Tiempo estimado:** 1-2 horas  
**Dificultad:** Media  
**Riesgo:** Bajo (código existente no modificado, solo añadidos)

---

**Última actualización:** 2025-10-03  
**Versión checklist:** 1.0
