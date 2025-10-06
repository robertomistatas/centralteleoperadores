# 🔧 SOLUCIÓN: Error de Permisos al Eliminar Teleoperadoras

## ❌ Error Detectado

```
FirebaseError: Missing or insufficient permissions.
⚠️ Firebase Firestore: Permisos insuficientes para usuario anonymous
```

---

## 🔍 Causa Raíz

### Problema 1: Función `getCurrentUserId()` Incorrecta
La función estaba intentando acceder a Firebase Auth de manera incorrecta:
```javascript
// ❌ ANTES (INCORRECTO)
const user = window.firebase?.auth?.()?.currentUser;
```

**Resultado**: Siempre retornaba `'anonymous'` en lugar del UID real del usuario.

### Problema 2: Reglas de Firestore Sin Permiso de Delete
Las reglas de Firestore para `operators` y `assignments` no incluían el permiso `delete`:
```javascript
// ❌ ANTES (INCORRECTO)
allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
// ⚠️ 'write' NO incluye 'delete' en Firestore Security Rules
```

---

## ✅ Solución Aplicada

### 1. Corrección de `getCurrentUserId()` en firestoreService.js

```javascript
// ✅ AHORA (CORRECTO)
import { db, auth } from './firebase';

const getCurrentUserId = () => {
  try {
    const user = auth.currentUser; // ✅ Usar instancia correcta
    if (user && user.uid) {
      console.log('🔍 Usuario autenticado detectado:', user.uid);
      return user.uid;
    }
    console.warn('⚠️ No hay usuario autenticado en Firebase Auth');
    return 'anonymous';
  } catch (error) {
    console.error('❌ Error obteniendo usuario actual:', error);
    return 'anonymous';
  }
};
```

### 2. Actualización de Reglas de Firestore

#### Para Operadores:
```javascript
// ✅ AHORA (CORRECTO)
match /operators/{document} {
  allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  
  // 🔥 REGLA CRÍTICA: Permite eliminación
  allow delete: if request.auth != null && (
    isSuperAdmin() || 
    isAdmin() ||
    resource.data.userId == request.auth.uid
  );
  
  // Permisos de lectura para teleoperadoras
  allow read: if request.auth != null;
}
```

#### Para Asignaciones:
```javascript
// ✅ AHORA (CORRECTO)
match /assignments/{document} {
  allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  
  // 🔥 REGLA CRÍTICA: Permite eliminación
  allow delete: if request.auth != null && (
    isSuperAdmin() || 
    isAdmin() ||
    resource.data.userId == request.auth.uid
  );
  
  // Permisos de lectura para teleoperadoras
  allow read: if request.auth != null;
}
```

---

## 🚀 PASOS PARA APLICAR LA SOLUCIÓN

### Paso 1: Verificar los Archivos Modificados ✅

Los siguientes archivos ya fueron actualizados:

- ✅ `src/firestoreService.js` - Corrección de `getCurrentUserId()`
- ✅ `firestore.rules` - Agregado permiso `delete` para operators y assignments

### Paso 2: Desplegar las Nuevas Reglas de Firestore

**Opción A: Usar el Script PowerShell (Recomendado)**

```powershell
.\deploy-firestore-rules.ps1
```

**Opción B: Manualmente con Firebase CLI**

```powershell
firebase deploy --only firestore:rules
```

**Opción C: Desde Firebase Console (Si no tienes Firebase CLI)**

1. Ve a: https://console.firebase.google.com
2. Selecciona el proyecto **centralteleoperadores**
3. Ve a **Firestore Database** → **Reglas**
4. Copia el contenido completo de `firestore.rules`
5. Pégalo en el editor
6. Haz clic en **Publicar**

### Paso 3: Reiniciar la Aplicación

1. **Detén el servidor** de desarrollo (Ctrl+C en la terminal)
2. **Reinicia** el servidor:
   ```powershell
   npm run dev
   ```
3. **Recarga la página** en el navegador (F5)
4. **Vuelve a iniciar sesión** con tus credenciales de super admin

### Paso 4: Probar la Eliminación

1. Ve al módulo **Asignaciones**
2. Haz clic en **"Eliminar"** en una teleoperadora ficticia
3. Confirma la eliminación
4. **Deberías ver**:
   - ✅ Toast verde: "Teleoperadora eliminada exitosamente"
   - ✅ La teleoperadora desaparece
   - ✅ En la consola: "🔍 Usuario autenticado detectado: [tu-uid]"
   - ✅ En la consola: "✅ Operador eliminado exitosamente de Firestore"

---

## 🔍 Verificación de Éxito

### En la Consola del Navegador (F12)

Deberías ver estos logs:

```
✅ LOGS CORRECTOS:
🔍 Usuario autenticado detectado: vFtxjkL9sLWqcEZ...
🗑️ Eliminando operador de Firestore: carmen_rodriguez
✅ Operador eliminado exitosamente de Firestore
✅ Operadora eliminada del Zustand store
✅ Estados locales actualizados
```

```
❌ LOGS INCORRECTOS (si aún hay problema):
⚠️ No hay usuario autenticado en Firebase Auth
❌ Error eliminando operador de Firestore: Missing or insufficient permissions
```

---

## 🆘 Troubleshooting

### Problema: Sigue mostrando "usuario anonymous"

**Causa**: Firebase Auth no está inicializado correctamente.

**Solución**:
1. Cierra todas las pestañas del navegador
2. Limpia la caché (Ctrl+Shift+Delete)
3. Reinicia el servidor (`npm run dev`)
4. Vuelve a iniciar sesión

### Problema: Error "Missing or insufficient permissions" después de desplegar reglas

**Causa**: Las reglas pueden tardar unos segundos en propagarse.

**Solución**:
1. Espera 30 segundos
2. Recarga la página (F5)
3. Intenta eliminar nuevamente

### Problema: "firebase: command not found"

**Causa**: Firebase CLI no está instalado.

**Solución**:
```powershell
npm install -g firebase-tools
firebase login
```

### Problema: Las reglas no se despliegan

**Solución**: Usa la Opción C (Firebase Console manual) descrita arriba.

---

## 📊 Diagrama del Flujo Corregido

```
┌─────────────────────────────────────────────┐
│ Usuario hace clic en "Eliminar"             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ getCurrentUserId()                          │
│ ✅ Retorna UID real: "vFtxjkL9sLWq..."     │
│ (ya no retorna 'anonymous')                 │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ operatorService.delete(operatorId)          │
│ ✅ Incluye token de autenticación           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Firestore Security Rules                    │
│ ✅ Valida: isSuperAdmin() = true            │
│ ✅ Permite: delete                          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Firebase Firestore                          │
│ ✅ Documento eliminado permanentemente       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Estados locales actualizados                │
│ ✅ Zustand store                            │
│ ✅ React state                              │
└─────────────────────────────────────────────┘
```

---

## 📝 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/firestoreService.js` | Corrección de `getCurrentUserId()` para usar `auth.currentUser` |
| `firestore.rules` | Agregado `allow delete` para operators y assignments |

---

## 📁 Archivos Nuevos Creados

| Archivo | Descripción |
|---------|-------------|
| `deploy-firestore-rules.ps1` | Script para desplegar reglas automáticamente |
| `SOLUCION_ERROR_PERMISOS_DELETE.md` | Este documento de solución |

---

## ✅ Checklist de Validación

- [ ] 1. Archivo `src/firestoreService.js` modificado ✅
- [ ] 2. Archivo `firestore.rules` modificado ✅
- [ ] 3. Reglas desplegadas a Firebase
- [ ] 4. Servidor reiniciado (`npm run dev`)
- [ ] 5. Página recargada en el navegador (F5)
- [ ] 6. Sesión reiniciada (logout + login)
- [ ] 7. Logs en consola muestran UID real (no 'anonymous')
- [ ] 8. Eliminación funciona sin errores
- [ ] 9. Toast verde de éxito aparece
- [ ] 10. Teleoperadora no reaparece tras recargar

---

## 🎯 Resultado Esperado

Después de aplicar todos los pasos:

1. ✅ Al eliminar una teleoperadora, verás el UID real en los logs
2. ✅ Firebase permitirá la operación de delete
3. ✅ La teleoperadora se eliminará permanentemente
4. ✅ Aparecerá un toast verde de éxito
5. ✅ No reaparecerá tras recargar la página

---

## 🔐 Notas de Seguridad

Las nuevas reglas permiten eliminar operadores solo si:

1. **Es super admin** (roberto@mistatas.com)
2. **Es admin** (rol verificado en userProfiles)
3. **Es el dueño** del operador (userId coincide)

**Nadie más** puede eliminar operadores, manteniendo la seguridad.

---

**Fecha**: 6 de octubre de 2025  
**Estado**: ✅ Solución Completa Documentada
