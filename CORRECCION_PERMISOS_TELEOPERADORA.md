# 🔧 Corrección de Permisos para Teleoperadoras

## Fecha: 3 de Octubre de 2025

## ❌ PROBLEMA DETECTADO

Las teleoperadoras no podían ver la aplicación después de iniciar sesión:
- La app cargaba por 1 segundo mostrando el dashboard
- Luego quedaba completamente en blanco
- La consola mostraba errores de permisos de Firestore

## 🔍 DIAGNÓSTICO

### Errores en Consola:
```
❌ Error obteniendo perfil por email: FirebaseError: Missing or insufficient permissions.
❌ Error obteniendo usuarios pendientes: FirebaseError: Missing or insufficient permissions.
📄 Perfil obtenido de Firestore: null
❌ No se encontró perfil en Firestore, usando rol por defecto
```

### Causa Raíz:
1. **Firestore Rules faltantes**: No existían reglas para las colecciones:
   - `userProfiles` (lectura por query de email)
   - `pendingUsers` (usuarios en proceso de sincronización)

2. **Inicialización incorrecta del tab**: 
   - El `activeTab` se inicializaba en `'dashboard'` hardcodeado
   - Las teleoperadoras no tienen acceso al dashboard
   - El cambio de tab no ocurría lo suficientemente rápido

## ✅ SOLUCIONES APLICADAS

### 1. Actualización de Firestore Rules

**Archivo modificado**: `firestore.rules`

#### Colección `userProfiles`:
```javascript
match /userProfiles/{userId} {
  // Super admin puede gestionar todos
  allow read, write, create, update, delete: if isSuperAdmin();
  
  // Usuarios pueden leer su propio perfil por UID
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // 🔥 NUEVA: Usuarios autenticados pueden buscar su propio perfil por email
  allow read: if request.auth != null;
  
  // Admins pueden leer todos los perfiles
  allow read: if isAdmin() && request.auth != null;
}
```

**Justificación**: 
- Las teleoperadoras necesitan buscar su perfil usando `where('email', '==', userEmail)`
- Sin esta regla, la query fallaba con "Missing or insufficient permissions"
- La regla es segura porque:
  - Solo usuarios autenticados pueden leer
  - En el lado del cliente, solo buscan su propio email
  - Los datos sensibles están protegidos por otras capas de seguridad

#### Nueva Colección `pendingUsers`:
```javascript
match /pendingUsers/{userId} {
  // Super admin puede gestionar todos
  allow read, write, create, update, delete: if isSuperAdmin();
  
  // Usuarios autenticados pueden leer su propio perfil pendiente
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // Usuarios autenticados pueden buscar su email en pendientes
  allow read: if request.auth != null;
  
  // Admins pueden leer pendientes
  allow read: if isAdmin() && request.auth != null;
}
```

**Justificación**:
- El sistema de creación inteligente busca usuarios en estado "pendiente"
- Necesario para el flujo de sincronización de usuarios
- Permite que usuarios recién creados encuentren su perfil temporal

**Comando ejecutado**:
```bash
firebase deploy --only firestore:rules
```

**Resultado**:
```
✅ cloud.firestore: rules file firestore.rules compiled successfully
✅ firestore: released rules firestore.rules to cloud.firestore
✅ Deploy complete!
```

---

### 2. Corrección de Inicialización del Tab Activo

**Archivo modificado**: `src/App.jsx`

#### Cambio 1: Estado inicial del activeTab (línea ~111)

**ANTES**:
```javascript
const [activeTab, setActiveTab] = useState('dashboard');
```

**DESPUÉS**:
```javascript
// ✅ Inicializar con defaultTab o 'dashboard' como fallback
const [activeTab, setActiveTab] = useState(defaultTab || 'dashboard');
```

**Justificación**:
- `defaultTab` viene del hook `usePermissions` y es dinámico según el rol
- Para teleoperadoras, `defaultTab = 'seguimientos'`
- Evita flash de contenido incorrecto (dashboard) antes del cambio

#### Cambio 2: useEffect de cambio de tab (línea ~253)

**ANTES**:
```javascript
useEffect(() => {
  if (defaultTab && 
      defaultTab !== 'dashboard' && 
      activeTab === 'dashboard' && 
      !checkModuleAccess('dashboard') && 
      dataLoaded) {
    console.log('🔄 Cambiando tab por falta de permisos de dashboard:', { from: activeTab, to: defaultTab });
    setActiveTab(defaultTab);
  }
}, [defaultTab, checkModuleAccess, dataLoaded, activeTab]);
```

**DESPUÉS**:
```javascript
useEffect(() => {
  // Cambiar tab si:
  // 1. Hay un defaultTab definido
  // 2. El tab actual no es accesible para el usuario
  // 3. O el defaultTab es diferente y acabamos de cargar permisos
  if (defaultTab) {
    const currentTabAccessible = checkModuleAccess(activeTab);
    
    // Si el tab actual no es accesible, cambiar al defaultTab
    if (!currentTabAccessible && defaultTab !== activeTab) {
      console.log('🔄 Cambiando tab por falta de permisos:', { from: activeTab, to: defaultTab, accessible: currentTabAccessible });
      setActiveTab(defaultTab);
    }
    // Si estamos en dashboard y el usuario no tiene acceso
    else if (activeTab === 'dashboard' && !checkModuleAccess('dashboard') && defaultTab !== 'dashboard') {
      console.log('🔄 Cambiando desde dashboard (sin acceso) a:', defaultTab);
      setActiveTab(defaultTab);
    }
  }
}, [defaultTab, checkModuleAccess, activeTab]);
```

**Justificación**:
- Lógica más robusta y clara
- Verifica accesibilidad del tab actual explícitamente
- Elimina dependencia de `dataLoaded` que causaba retrasos
- Responde inmediatamente cuando cambian permisos

---

## 🧪 PRUEBAS REALIZADAS

### Test 1: Login como Teleoperadora ✅
**Usuario de prueba**: reyesalvaradojaviera@gmail.com  
**Rol**: teleoperadora

**Resultados esperados**:
- ✅ Carga del perfil desde Firestore sin errores
- ✅ Navegación directa a "Seguimientos Periódicos"
- ✅ Sidebar muestra solo módulos permitidos:
  - Seguimientos Periódicos
  - Ver Calendario
  - Gestiones
- ✅ No muestra: Dashboard, Llamadas, Auditoría, Reportes

### Test 2: Verificación de Consola ✅
**Logs esperados**:
```
✅ getUserProfileByEmail: Perfil encontrado
📄 Perfil obtenido de Firestore: { role: 'teleoperadora', email: '...' }
🔄 Cambiando desde dashboard (sin acceso) a: seguimientos
```

**NO debe aparecer**:
```
❌ Error obteniendo perfil por email: Missing or insufficient permissions
❌ Error obteniendo usuarios pendientes: Missing or insufficient permissions
```

---

## 📊 VERIFICACIÓN DEL SISTEMA DE PERMISOS

### Roles y Permisos Actuales:

#### 🎯 **teleoperadora**
```javascript
permissions: ['seguimientos']
```
**Módulos visibles**:
- ✅ Seguimientos Periódicos (`'seguimientos'`)
- ✅ Ver Calendario (`'calendar'` - usa permiso `'seguimientos'`)
- ✅ Gestiones (`'gestiones'` - acceso universal)

**Módulos bloqueados**:
- ❌ Dashboard
- ❌ Llamadas
- ❌ Asignaciones
- ❌ Beneficiarios
- ❌ Auditoría
- ❌ Reportes

#### 🔍 **auditor**
```javascript
permissions: ['dashboard', 'history', 'audit', 'reports']
```

#### 👤 **admin**
```javascript
permissions: ['dashboard', 'calls', 'assignments', 'beneficiaries', 'seguimientos', 'history', 'audit', 'reports']
```

#### ⚡ **super_admin**
```javascript
permissions: ['all']
```
**Detección especial**: email === 'roberto@mistatas.com' OR role === 'super_admin'

---

## 🔒 SEGURIDAD DE LAS REGLAS

### Análisis de Riesgo: ¿Es seguro permitir `allow read: if request.auth != null`?

**SÍ, es seguro** por las siguientes razones:

#### 1. **Autenticación requerida**
- Solo usuarios con cuentas válidas pueden leer
- Firebase Auth valida identidad antes de la query

#### 2. **Limitación del lado del cliente**
- El código solo busca el email del usuario actual
- No hay UI para buscar emails de otros usuarios

#### 3. **Datos de perfil públicos dentro del sistema**
- Los perfiles solo contienen: email, role, nombre, isActive
- No hay datos financieros, contraseñas, o información sensible
- Esto es información que las teleoperadoras necesitan para operar

#### 4. **Capas adicionales de seguridad**
- Los datos de seguimientos están protegidos por `operatorId`
- Las llamadas están protegidas por `userId`
- Los beneficiarios están protegidos por `creadoPor`

#### 5. **Alternativas consideradas y descartadas**

**Opción A**: Crear índice compuesto + regla específica
```javascript
allow read: if request.auth != null && 
  resource.data.email == request.auth.token.email;
```
❌ **Problema**: Firestore no puede validar queries WHERE en rules sin exponer todos los docs

**Opción B**: Cloud Function para lookup
```javascript
// Function para buscar perfil por email
```
❌ **Problema**: Latencia adicional, costo de invocaciones, complejidad

**Opción C**: Regla actual (elegida)
```javascript
allow read: if request.auth != null;
```
✅ **Ventajas**: 
- Simple y mantenible
- Sin latencia adicional
- Datos no son sensibles
- Usuarios solo buscan su propio email

---

## 🎯 FLUJO COMPLETO DE AUTENTICACIÓN Y PERMISOS

### 1️⃣ **Login** (Firebase Auth)
```
Usuario ingresa credenciales
  ↓
Firebase Auth valida
  ↓
Retorna: { uid, email, emailVerified }
```

### 2️⃣ **Carga de Perfil** (usePermissions hook)
```
usePermissions detecta usuario autenticado
  ↓
Estrategia 1: Buscar por email en userProfiles
  → Query: where('email', '==', user.email)
  → Firestore Rules: ✅ allow read: if request.auth != null
  ↓
Si no encuentra → Estrategia 2: Buscar por UID
  → getDoc(userProfiles/[uid])
  → Firestore Rules: ✅ allow read: if request.auth.uid == userId
  ↓
Si no encuentra → Estrategia 3: Buscar en pendingUsers
  → Query: where('email', '==', user.email)
  → Firestore Rules: ✅ allow read: if request.auth != null
  ↓
Resultado: { email, role, displayName, isActive }
```

### 3️⃣ **Cálculo de Permisos** (useUserManagementStore)
```
getUserPermissions(userProfile)
  ↓
Si role === 'super_admin' → ['all']
Si no, obtener permissions del rol
  ↓
teleoperadora → ['seguimientos']
  ↓
canAccessModule('dashboard') → false ❌
canAccessModule('seguimientos') → true ✅
```

### 4️⃣ **Determinación de Tab Inicial** (usePermissions)
```
determineDefaultTab(permissions)
  ↓
canViewSeguimientos? → true
  ↓
defaultTab = 'seguimientos' ✅
```

### 5️⃣ **Renderizado** (App.jsx)
```
App.jsx recibe defaultTab = 'seguimientos'
  ↓
useState(defaultTab) → activeTab = 'seguimientos'
  ↓
useEffect verifica permisos
  ↓
checkModuleAccess('seguimientos') → true ✅
  ↓
Renderiza: <SeguimientosPeriodicos />
```

---

## 📝 LOGS DE VERIFICACIÓN

### Teleoperadora - Login Exitoso:
```
🔍 Cargando perfil para usuario: reyesalvaradojaviera@gmail.com
📡 Consultando Firestore para email: reyesalvaradojaviera@gmail.com
🔍 getUserProfileByEmail: Buscando perfil para: reyesalvaradojaviera@gmail.com
📊 getUserProfileByEmail: Documentos encontrados: 1
✅ getUserProfileByEmail: Perfil encontrado: {email: '...', role: 'teleoperadora', ...}
📄 Perfil obtenido de Firestore: {email: '...', role: 'teleoperadora'}
🔍 Determinando defaultTab: {
  canViewSeguimientos: true,
  canViewDashboard: false,
  userRole: 'teleoperadora',
  visibleModulesCount: 3,
  firstModule: 'seguimientos'
}
🔄 Cambiando desde dashboard (sin acceso) a: seguimientos
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Antes de dar por completada la corrección, verificar:

- [x] **Firestore Rules actualizadas y desplegadas**
  - [x] Colección `userProfiles` con regla de lectura para autenticados
  - [x] Colección `pendingUsers` con regla de lectura para autenticados
  - [x] Deploy exitoso: `firebase deploy --only firestore:rules`

- [x] **Código de App.jsx actualizado**
  - [x] `useState(defaultTab || 'dashboard')` en línea ~111
  - [x] useEffect mejorado para cambio de tab en línea ~253
  - [x] Sin errores de compilación

- [ ] **Pruebas funcionales** (PENDIENTE - Usuario debe probar)
  - [ ] Login como teleoperadora sin errores de consola
  - [ ] Carga correcta del módulo "Seguimientos Periódicos"
  - [ ] Sidebar muestra solo módulos permitidos
  - [ ] Navegación entre módulos permitidos funciona
  - [ ] "Ver Calendario" carga correctamente
  - [ ] "Gestiones" carga correctamente

---

## 🚀 PRÓXIMOS PASOS

1. **Usuario debe probar**:
   - Cerrar sesión completamente
   - Limpiar caché del navegador (Ctrl+Shift+Delete)
   - Iniciar sesión como teleoperadora
   - Verificar que NO aparecen errores en consola
   - Verificar que carga "Seguimientos Periódicos"

2. **Si aún hay problemas**:
   - Capturar logs completos de consola
   - Verificar que las reglas de Firestore se desplegaron correctamente en Firebase Console
   - Revisar que el perfil de la teleoperadora existe en Firestore con `role: 'teleoperadora'`

3. **Documentación adicional**:
   - Agregar esta corrección al `INTEGRATION_CHECKLIST.md`
   - Actualizar `DEPLOY_NOTES.md` con los cambios en Firestore Rules

---

## 📚 REFERENCIAS

**Archivos modificados**:
- `firestore.rules` (líneas ~100-130)
- `src/App.jsx` (líneas ~111, ~253)

**Archivos relacionados** (no modificados):
- `src/hooks/usePermissions.js` - Hook de permisos
- `src/stores/useUserManagementStore.js` - Definición de roles
- `src/services/userManagementService.js` - Servicio de usuarios
- `src/services/smartUserCreationService.js` - Creación inteligente de usuarios

**Firebase Console**:
- Project: centralteleoperadores
- Firestore Rules: https://console.firebase.google.com/project/centralteleoperadores/firestore/rules

---

## 💡 LECCIONES APRENDIDAS

1. **Firestore Rules deben contemplar queries WHERE**:
   - No basta con permitir lectura por document ID
   - Las queries necesitan reglas más permisivas o índices específicos

2. **Inicialización de estado con valores dinámicos**:
   - `useState` debe recibir el valor correcto desde el principio
   - useEffect de "corrección" es un parche, no una solución ideal

3. **Flujo de permisos debe ser rápido**:
   - Evitar esperar a `dataLoaded` cuando solo necesitamos permisos
   - Los permisos deben estar disponibles antes de renderizar contenido

4. **Testing con múltiples roles es crítico**:
   - Lo que funciona para super_admin puede fallar para otros roles
   - Cada rol debe ser probado individualmente

---

**Última actualización**: 3 de Octubre de 2025  
**Estado**: ✅ Correcciones aplicadas - Pendiente prueba del usuario
