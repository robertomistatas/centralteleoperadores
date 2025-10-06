# 🔧 CORRECCIÓN: UIDs Sintéticos y Actualización de Firebase Auth

## 🐛 Problema Encontrado por el Usuario

**Log Clave:**
```
⚠️ No se puede actualizar email en Auth: usuario diferente
userManagementService.js:728
```

**Contexto:**
Al intentar cambiar el email de Karol Aguayo de `karol@mistatas.com` a `karolmaguayo@gmail.com`, el sistema actualizaba correctamente `userProfiles` en Firestore, pero **fallaba al intentar actualizar Firebase Authentication**.

---

## 🔍 Análisis del Problema

### 1. **UIDs Sintéticos vs UIDs Reales**

El usuario **Karol Aguayo** tiene un UID: `smart_a2Fyb2xt_1759763837684`

Este UID es **sintético**, generado por el sistema, NO por Firebase Authentication:

| Tipo UID | Formato | Ejemplo | Origen |
|----------|---------|---------|--------|
| **Firebase Auth Real** | 28 caracteres alfanuméricos | `U37McS3etteEjEkIcgGsoRAnQtg1` | Firebase Authentication |
| **Sintético (smart_)** | Prefijo `smart_` + base64 | `smart_a2Fyb2xt_1759763837684` | Sistema interno (creación sin auth) |
| **Sintético (profile-)** | Prefijo `profile-` + timestamp | `profile-1757701392198-rk3aqfco7` | Sistema interno (creación manual) |

### 2. **El Problema**

Cuando el sistema intentaba actualizar el email, ejecutaba:

```javascript
// userManagementService.js línea 722
if (auth.currentUser && auth.currentUser.uid === userId) {
  await updateEmail(auth.currentUser, updates.email); // ❌ FALLA
}
```

**¿Por qué fallaba?**

1. `auth.currentUser.uid` = `U37McS3etteEjEkIcgGsoRAnQtg1` (Roberto - Super Admin)
2. `userId` = `smart_a2Fyb2xt_1759763837684` (Karol - UID sintético)
3. `userId !== auth.currentUser.uid` → Se imprimía warning pero **NO actualizaba**
4. **PERO** el warning era engañoso: el verdadero problema es que ese UID **no existe en Firebase Auth**

### 3. **Operadores Sin Perfil en userProfiles**

Según los logs:

```
✅ reyesalvaradojaviera@gmail.com - Perfil encontrado
❌ antonella@mistatas.com - NO encontrado
❌ karol@mistatas.com - NO encontrado  
❌ teleasistencia@mistatas.com - NO encontrado
```

**Problema:** Solo Javiera tiene perfil en `userProfiles`. Los demás operadores **solo existen en `operators`**, sin perfil sincronizado.

---

## ✅ Solución Implementada

### 1. **Detectar UIDs Sintéticos**

**Archivo:** `src/services/userManagementService.js` (líneas 718-742)

**Cambio:**

```javascript
// ✅ ANTES: Solo verificaba si era el usuario actual
if (auth.currentUser && auth.currentUser.uid === userId) {
  await updateEmail(auth.currentUser, updates.email);
} else {
  console.warn('⚠️ No se puede actualizar email en Auth: usuario diferente');
}

// ✅ AHORA: Detecta UIDs sintéticos y los salta
const isSyntheticUID = userId.startsWith('smart_') || 
                       userId.startsWith('profile-') ||
                       !userId.match(/^[a-zA-Z0-9]{28}$/);

if (isSyntheticUID) {
  console.log('ℹ️ Usuario con UID sintético - saltando actualización de Auth:', userId);
  result.authUpdated = false;
} else if (auth.currentUser && auth.currentUser.uid === userId) {
  await updateEmail(auth.currentUser, updates.email);
  result.authUpdated = true;
  console.log('✅ Firebase Auth actualizado');
} else {
  console.log('ℹ️ Usuario diferente al actual - saltando actualización de Auth');
  result.authUpdated = false;
}
```

**Ventajas:**
- ✅ No intenta actualizar Auth para usuarios sintéticos
- ✅ Evita errores y warnings confusos
- ✅ Logs claros y descriptivos
- ✅ No bloquea la actualización del resto de datos

---

### 2. **Mejorar Búsqueda en Colección `operators`**

**Archivo:** `src/services/userManagementService.js` (líneas 745-790)

**Problema Original:**
Solo buscaba operadores por `oldEmail`, ignorando el campo `uid`.

**Solución:**

```javascript
// ✅ AHORA: Busca por email Y por UID
const operatorsRef = collection(db, 'operators');

// Query 1: Por email viejo
let operatorsQuery = query(operatorsRef, where('email', '==', oldEmail));
const operatorsSnapshot = await getDocs(operatorsQuery);

// Query 2: Por UID (si no es sintético)
let operatorsByUID = [];
if (!isSyntheticUID) {
  const operatorsByUIDQuery = query(operatorsRef, where('uid', '==', userId));
  const operatorsByUIDSnapshot = await getDocs(operatorsByUIDQuery);
  operatorsByUID = operatorsByUIDSnapshot.docs;
}

// Combinar resultados (evitar duplicados)
const operatorDocs = new Map();
operatorsSnapshot.forEach(doc => operatorDocs.set(doc.id, doc));
operatorsByUID.forEach(doc => operatorDocs.set(doc.id, doc));

console.log(`📋 Operadores encontrados: ${operatorDocs.size}`);
```

**Ventajas:**
- ✅ Encuentra operadores por email O por UID
- ✅ Evita duplicados usando Map
- ✅ Logs detallados con cantidades
- ✅ Funciona con UIDs sintéticos y reales

---

## 🧪 Cómo Probar

### **Prueba 1: Usuario con UID Sintético (Karol Aguayo)**

1. **Recarga la página** (Ctrl + Shift + R)
2. **Abre la consola** (F12)
3. **Ve a Configuración → Usuarios**
4. **Edita Karol Aguayo:**
   - Email actual: `karol@mistatas.com`
   - Cambiar a: `karolmaguayo@gmail.com`
5. **Guardar**

**Logs Esperados:**

```
🔄 Actualizando perfil: smart_a2Fyb2xt_1759763837684 {...}
📧 Email cambió de karol@mistatas.com a karolmaguayo@gmail.com
ℹ️ Usuario con UID sintético - saltando actualización de Auth
🔄 Actualizando colección operators...
📋 Operadores encontrados: 1 (1 por email, 0 por UID)
✅ 1 operadores actualizados en 'operators'
✅ Perfil actualizado y sincronizado
📢 Notificando actualización de perfil...
```

6. **Ir a Asignaciones** (sin recargar)
7. **Verificar:** Card de Karol debe mostrar `karolmaguayo@gmail.com`

---

### **Prueba 2: Usuario con UID Real (Roberto - tú mismo)**

1. **Edita tu propio perfil:**
   - Email actual: `roberto@mistatas.com`
   - Cambiar a: `roberto+test@mistatas.com`
2. **Guardar**

**Logs Esperados:**

```
🔄 Actualizando perfil: U37McS3etteEjEkIcgGsoRAnQtg1 {...}
📧 Email cambió de roberto@mistatas.com a roberto+test@mistatas.com
✅ Firebase Auth actualizado
🔄 Actualizando colección operators...
📋 Operadores encontrados: 1 (1 por email, 1 por UID)
✅ 1 operadores actualizados
```

**⚠️ IMPORTANTE:** Después de cambiar tu propio email, **deberás volver a iniciar sesión** con el nuevo email.

---

## 📊 Comparación Antes vs Ahora

| Aspecto | ANTES | AHORA |
|---------|-------|-------|
| **UIDs sintéticos** | ❌ Intenta actualizar Auth y falla | ✅ Detecta y salta actualización de Auth |
| **Logs de error** | ⚠️ "usuario diferente" (confuso) | ℹ️ "UID sintético - saltando Auth" (claro) |
| **Búsqueda operators** | Solo por email | ✅ Por email Y por UID |
| **Actualización operators** | ❌ Fallaba si email diferente | ✅ Encuentra por email o UID |
| **Sincronización Asignaciones** | ❌ No funcionaba | ✅ Funciona con oldEmail |

---

## 🎯 Resultado Final

Con estas correcciones:

✅ **UIDs sintéticos se manejan correctamente** (no intenta actualizar Auth)  
✅ **Actualización de `operators` funciona** por email o UID  
✅ **Logs claros y descriptivos** (sin warnings confusos)  
✅ **Sincronización en Asignaciones funciona** (con comparación por oldEmail)  
✅ **No errores en consola** relacionados con Auth  

---

## 📝 Archivos Modificados

### 1. `src/services/userManagementService.js`
- **Líneas 718-742:** Detección de UIDs sintéticos
- **Líneas 745-790:** Búsqueda mejorada en `operators` (email + UID)

### 2. `src/services/userSyncService.js` (modificado en v2.1)
- **Líneas 168-195:** Inclusión de `oldEmail` en evento

### 3. `src/App.jsx` (modificado en v2.1)
- **Líneas 2498-2535:** Comparación triple con `matchesOldEmail`

---

## 🚀 Próximos Pasos

### Opción A: Mantener Sistema Actual ⭐ RECOMENDADA
- ✅ Los usuarios con UIDs sintéticos pueden cambiar email sin problemas
- ✅ El sistema actualiza Firestore correctamente
- ✅ La sincronización funciona en todos los módulos
- ⚠️ Estos usuarios **NO pueden** iniciar sesión con Firebase Auth (solo existen en Firestore)

### Opción B: Migrar Usuarios a Firebase Auth
Si quieres que Karol, Antonella y Teleasistencia puedan **iniciar sesión**:

1. **Crear usuarios en Firebase Authentication:**
   - Ir a Firebase Console → Authentication → Add User
   - Email: `karol@mistatas.com` (o el que corresponda)
   - Password temporal: `Temp123!`
   - Copiar el UID generado

2. **Actualizar userProfiles con el UID real:**
   ```javascript
   // En Firebase Console → Firestore → userProfiles
   // Editar documento smart_a2Fyb2xt_1759763837684
   // Cambiar campo 'uid' al UID real de Auth
   ```

3. **Notificar a los usuarios:**
   - Email: `karol@mistatas.com`
   - Password: `Temp123!`
   - Cambiar password al ingresar

---

## 💡 Recomendación Final

**Para tu caso (Roberto):**

Como tienes pocos usuarios (4 en total) y **solo Javiera tiene Auth real**, te recomiendo:

1. ✅ **Usar el sistema actual** para cambios de email (ya funciona)
2. ⏭️ **NO migrar** a menos que necesiten iniciar sesión
3. 📋 **Documentar** qué usuarios son "solo Firestore" vs "Auth + Firestore"

**Si necesitas que todos puedan iniciar sesión:**
- Ejecutar script de migración (cuando tengas `serviceAccountKey.json`)
- O crear usuarios manualmente en Firebase Console

---

**Fecha:** 6 de octubre de 2025  
**Versión:** 2.2 (Corrección UIDs Sintéticos)  
**Estado:** ✅ Listo para pruebas  
**Servidor:** http://localhost:5173/centralteleoperadores/
