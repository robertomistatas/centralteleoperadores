# 🔥 Configuración Manual de Firebase - Paso a Paso

## ⚠️ **PROBLEMA IDENTIFICADO**

El error principal es que **Firebase Authentication y Firestore no están configurados** en Firebase Console.

## 🎯 **SOLUCIÓN - Configuración Manual (5 minutos)**

### **Paso 1: Acceder a Firebase Console**
1. Ve a: https://console.firebase.google.com/project/centralteleoperadores
2. Si no existe el proyecto, créalo con ID: `centralteleoperadores`

### **Paso 2: Configurar Authentication**
1. En el menú izquierdo, click en **"Authentication"**
2. Click en **"Get started"**
3. Ve a la pestaña **"Sign-in method"**
4. Click en **"Email/Password"**
5. **Habilita** ambas opciones:
   - ✅ Email/Password 
   - ✅ Email link (passwordless sign-in) [opcional]
6. Click **"Save"**

### **Paso 3: Configurar Firestore Database**
1. En el menú izquierdo, click en **"Firestore Database"**
2. Click en **"Create database"**
3. Selecciona **"Start in test mode"** (temporal)
4. Elige una ubicación (recomendado: `southamerica-east1`)
5. Click **"Done"**

### **Paso 4: Configurar Reglas de Seguridad**
1. En Firestore, ve a la pestaña **"Rules"**
2. **Reemplaza** el contenido con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Operadores - solo el dueño puede leer/escribir
    match /operators/{document} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Asignaciones - solo el dueño puede leer/escribir
    match /assignments/{document} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Datos de llamadas - solo el dueño puede leer/escribir
    match /callData/{document} {
      allow read, write: if request.auth != null && document == request.auth.uid;
    }
    
    // Datos de usuario - solo el dueño puede leer/escribir
    match /userData/{document} {
      allow read, write: if request.auth != null && document == request.auth.uid;
    }
  }
}
```

3. Click **"Publish"**

### **Paso 5: Verificar Configuración del Proyecto**
Verifica que tu archivo `.env` tenga las variables correctas:

```env
VITE_FIREBASE_API_KEY=tu-api-key
VITE_FIREBASE_AUTH_DOMAIN=centralteleoperadores.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=centralteleoperadores
VITE_FIREBASE_STORAGE_BUCKET=centralteleoperadores.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
VITE_FIREBASE_APP_ID=tu-app-id
```

## 🚀 **Después de la Configuración**

1. **Reinicia** la aplicación React
2. Los errores de permisos deberían desaparecer
3. La persistencia estará habilitada
4. Podrás crear cuentas y datos se guardarán en la nube

## 🔍 **Para Verificar que Funciona**

1. Ve a tu app: http://localhost:5175/centralteleoperadores/
2. Crea una cuenta nueva
3. Agrega un operador
4. Ve a Firebase Console > Firestore Database
5. Deberías ver los datos almacenados

---

## 🆘 **Si Necesitas Ayuda**

**Opción A - Manual**: Sigue los pasos de arriba (recomendado, 5 min)
**Opción B - Automático**: Ejecuta `setup-firebase.bat` después de hacer `firebase login`

### **Para Opción B**:
```bash
# En la terminal:
firebase login
.\setup-firebase.bat
```

---

## ✅ **Estado Esperado Después**
- ✅ Authentication habilitado
- ✅ Firestore configurado
- ✅ Reglas de seguridad aplicadas
- ✅ App funcionando sin errores
- ✅ Persistencia en la nube activa
