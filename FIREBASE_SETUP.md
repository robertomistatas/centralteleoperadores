# 🔥 Configuración Firebase Console

## ⚠️ IMPORTANTE: Configurar antes de usar en producción

Para que la aplicación funcione completamente, necesitas configurar Firestore en Firebase Console:

### 📋 Pasos para configurar Firebase:

#### **1. Acceder a Firebase Console**
- Ve a: https://console.firebase.google.com/
- Selecciona el proyecto: `centralteleoperadores`

#### **2. Habilitar Authentication**
```
1. Ve a "Authentication" → "Sign-in method"
2. Habilita "Email/Password"
3. Guarda los cambios
```

#### **3. Configurar Firestore Database**
```
1. Ve a "Firestore Database"
2. Crear base de datos (si no existe)
3. Seleccionar modo "Test" inicialmente
4. Elegir ubicación (ej: southamerica-east1)
```

#### **4. Configurar Reglas de Seguridad**
Ve a "Firestore Database" → "Rules" y pega estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir a usuarios autenticados acceder solo a sus datos
    match /{collection}/{document} {
      allow read, write: if request.auth != null 
        && (
          // Para documentos que tienen userId
          resource.data.userId == request.auth.uid ||
          // Para documentos creados (no tienen resource.data aún)
          request.resource.data.userId == request.auth.uid ||
          // Para documentos con ID = userId (como callData, userData)
          document == request.auth.uid
        );
    }
  }
}
```

#### **5. Crear Índices (Opcional pero recomendado)**
```
1. Ve a "Firestore Database" → "Indexes"
2. Agregar índice compuesto:
   - Collection: operators
   - Fields: userId (Ascending), createdAt (Descending)
```

### 🔧 **Modo de Desarrollo (Temporal)**

Si necesitas probar rápidamente, puedes usar estas reglas temporales (⚠️ SOLO PARA DESARROLLO):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ ADVERTENCIA:** Estas reglas permiten a cualquier usuario autenticado leer/escribir todos los datos. Solo úsalas para desarrollo.

### ✅ **Verificar Configuración**

Una vez configurado, la aplicación debería:
1. ✅ Permitir registro de nuevos usuarios
2. ✅ Permitir login con email/password
3. ✅ Guardar operadores en Firestore
4. ✅ Guardar asignaciones de Excel
5. ✅ Mantener datos entre sesiones

### 🆘 **Solución de Problemas**

**Error: "Missing or insufficient permissions"**
- Verifica que las reglas de Firestore estén configuradas
- Verifica que el usuario esté autenticado
- Revisa la consola de Firebase para errores

**Error: "Network request failed"**
- Verifica tu conexión a internet
- Verifica que el proyecto Firebase esté activo
- Revisa la configuración de API keys

### 📞 **Contacto**
Si necesitas ayuda con la configuración, revisa la documentación de Firebase o contacta al desarrollador.

---
**Fecha:** Julio 2025  
**Proyecto:** Central de Teleoperadores  
**Estado:** Configuración pendiente en Firebase Console
