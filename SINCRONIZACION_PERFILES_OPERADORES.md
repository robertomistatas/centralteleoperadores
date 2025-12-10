# Sincronización de Perfiles de Operadores

## Problema Identificado

Cuando se crean teleoperadoras desde el módulo **Asignaciones**, se creaba un documento en la colección `operators` de Firestore, pero **NO se creaba el perfil completo** en la colección `userProfiles`.

Esto provocaba:
- ❌ Búsquedas repetidas en consola para emails inexistentes
- ❌ Operadoras sin acceso completo a los módulos de la aplicación
- ❌ Datos incompletos en el sistema
- ❌ Problemas de autenticación y permisos

## Solución Implementada

### 1. Creación Automática de Perfiles (NUEVO)

**Desde ahora**, cuando se crea una teleoperadora desde el módulo Asignaciones:

1. Se crea el documento en `operators` ✅
2. **Se verifica si existe un perfil** en `userProfiles` ✅
3. **Si NO existe, se crea automáticamente** con:
   - Email (normalizado)
   - Nombre completo
   - Rol: `teleoperadora`
   - Teléfono
   - Estado: `pending` (esperando autenticación)
   - Vinculación con el ID del operador

**Resultado**: Las teleoperadoras creadas desde ahora tendrán perfiles completos de forma automática.

---

### 2. Sincronización de Operadores Existentes

Para las teleoperadoras que fueron creadas **ANTES** de esta corrección, implementamos un botón de sincronización.

#### ¿Cómo Sincronizar?

1. **Acceder al módulo Asignaciones** (estando autenticado como administrador)

2. **Hacer clic en el botón "Sincronizar Perfiles"** (ícono de actualización 🔄)

3. **Confirmar la operación** en el diálogo que aparece

4. **Esperar el proceso**:
   - El sistema verificará todos los operadores
   - Para cada operador **CON EMAIL** verificará si tiene perfil
   - Si **NO tiene perfil**, lo creará automáticamente
   - Si **YA tiene perfil**, lo omitirá

5. **Ver resultados** en la notificación:
   - ✅ Perfiles creados
   - ℹ️ Ya existían
   - ❌ Errores (si los hubiera)

#### Consola de Desarrollo

También puedes ver el progreso detallado en la consola del navegador (F12):

```
🔄 Iniciando sincronización de operadores...
✅ Usuario autenticado: carolina@mistatas.com

📥 Obteniendo operadores...
✅ 4 operadores encontrados

⏭️  Sara - Sin email, omitiendo
✓  Carolina (carolina@mistatas.com) - Ya tiene perfil
✨ Paulo (paulo.dausther.lr@gmail.com) - Perfil creado
✨ Cristina (cristina.rodriguez.gomez@gmail.com) - Perfil creado

============================================================
📊 RESUMEN DE SINCRONIZACIÓN
============================================================
Total operadores:     4
Perfiles creados:     2 ✨
Ya existían:          2 ✓
Errores:              0 ❌
============================================================
```

---

## Estructura de Datos

### Colección: `operators`

Documento básico del operador (lo que se creaba antes):

```javascript
{
  id: "sPwrsP9k6X5HYbqidDZZ",
  name: "Paulo Dausther",
  email: "paulo.dausther.lr@gmail.com",
  phone: "+56912345678",
  userId: "roberto_uid",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Colección: `userProfiles`

Perfil completo del usuario (lo que se crea AHORA):

```javascript
{
  id: "profile-1733885600000-abc123",
  uid: "profile-1733885600000-abc123",
  email: "paulo.dausther.lr@gmail.com",
  displayName: "Paulo Dausther",
  role: "teleoperadora",
  isActive: true,
  phone: "+56912345678",
  operatorId: "sPwrsP9k6X5HYbqidDZZ", // ⭐ VINCULACIÓN
  createdBy: "roberto_uid",
  authenticationStatus: "pending",
  profileType: "operator_created", // o "operator_migrated"
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## Siguiente Paso: Autenticación Firebase

Una vez que los perfiles están creados en `userProfiles`, el **super administrador** debe:

### 1. Acceder a Firebase Console
- https://console.firebase.google.com/
- Proyecto: `seguimiento-7ee43`
- Sección: **Authentication**

### 2. Crear Usuario en Firebase Auth
Para cada email en `userProfiles` que esté `pending`:

1. Click en **"Add user"**
2. Ingresar:
   - **Email**: El mismo que está en `userProfiles`
   - **Password**: Generar una temporal segura
3. Click en **"Add user"**

### 3. Notificar al Usuario
Enviar el email y contraseña temporal al usuario:

```
Hola [Nombre],

Tu cuenta en el Sistema de Seguimiento ha sido creada.

Email: [email]
Contraseña temporal: [password]

Al ingresar por primera vez, se te pedirá cambiar la contraseña.

Link: https://seguimiento-7ee43.web.app

Saludos,
Administración
```

### 4. Primer Login
Cuando el usuario ingrese:
- ✅ Firebase Auth verificará las credenciales
- ✅ La app cargará su perfil desde `userProfiles`
- ✅ Tendrá acceso completo a todos los módulos
- ✅ Sus asignaciones aparecerán correctamente

---

## Casos de Uso Comunes

### Caso 1: Carolina crea una nueva teleoperadora

**Antes (problema):**
```
1. Carolina crea "Antonella" con email antonella@mistatas.com
2. ✅ Se crea documento en 'operators'
3. ❌ NO se crea perfil en 'userProfiles'
4. ❌ Console spam: "No se encontró perfil para antonella@mistatas.com"
5. ❌ Antonella no puede usar la app
```

**Ahora (solucionado):**
```
1. Carolina crea "Antonella" con email antonella@mistatas.com
2. ✅ Se crea documento en 'operators'
3. ✅ Se crea perfil en 'userProfiles' automáticamente
4. ✅ Console: "Perfil completo creado para: antonella@mistatas.com"
5. ✅ Roberto crea auth en Firebase
6. ✅ Antonella puede usar la app completa
```

### Caso 2: Sincronizar operadores antiguos

**Situación:**
```
- Paulo (paulo.dausther.lr@gmail.com) - creado hace 1 semana
- Cristina (cristina.rodriguez.gomez@gmail.com) - creada hace 3 días
- Ambas sin perfil en 'userProfiles'
```

**Solución:**
```
1. Roberto accede al módulo Asignaciones
2. Click en "Sincronizar Perfiles"
3. ✅ Se crean perfiles para Paulo y Cristina
4. ✅ Notificación: "2 perfil(es) creado(s)"
5. Roberto crea auth en Firebase para ambos
6. ✅ Paulo y Cristina pueden usar la app
```

### Caso 3: Operador sin email

**Situación:**
```
- Sara (sin email) - solo tiene nombre
```

**Comportamiento:**
```
1. ⏭️ Sincronización omite a Sara (sin email)
2. ℹ️ Console: "Sara - Sin email, omitiendo"
3. ℹ️ Sara seguirá como operadora básica
4. ⚠️ No podrá autenticarse ni usar módulos completos
```

**Solución si se necesita:**
```
1. Editar operador y agregar email
2. Ejecutar sincronización nuevamente
3. ✅ Se creará el perfil con el email agregado
```

---

## Archivos Modificados

### 1. `src/App.jsx`
- ✨ **handleCreateOperator**: Ahora crea perfil automáticamente
- ✨ **handleSyncExistingOperators**: Nueva función de sincronización
- ✨ Estado `syncingProfiles`: Track del proceso
- ✨ Botón "Sincronizar Perfiles" en UI

### 2. `sync-existing-operators.js` (NUEVO)
- ✨ **findProfileByEmail**: Busca perfil existente
- ✨ **createProfileForOperator**: Crea perfil completo
- ✨ **syncOperators**: Función principal de sincronización
- ✅ Exportable como módulo ES6

### 3. `src/services/userManagementService.js`
- ✅ **createUser**: Crea perfil en 'userProfiles'
- ✅ **getUserProfileByEmail**: Busca perfil por email
- ✅ Validaciones de permisos y duplicados

---

## Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│  CREACIÓN DE TELEOPERADORA DESDE MÓDULO ASIGNACIONES        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  Admin ingresa nombre y email    │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  Crear doc en 'operators'         │
         └──────────────────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │  ¿Tiene email?                    │
         └──────────────────────────────────┘
                 │                    │
            NO   │                    │  SÍ
                 ▼                    ▼
        ┌─────────────┐    ┌────────────────────────┐
        │  Fin        │    │ ¿Perfil existe?        │
        │  (básico)   │    └────────────────────────┘
        └─────────────┘              │              │
                                 SÍ  │              │  NO
                                     ▼              ▼
                           ┌─────────────┐  ┌──────────────┐
                           │ Omitir      │  │ Crear perfil │
                           └─────────────┘  └──────────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────┐
                                          │ ✅ Completo     │
                                          └─────────────────┘
```

---

## Testing

### Test 1: Crear Nueva Teleoperadora

1. **Login** como administrador (Carolina o Roberto)
2. **Ir** a módulo Asignaciones
3. **Click** en "Crear Teleoperador"
4. **Ingresar**:
   - Nombre: `Test Operator`
   - Email: `test.operator@example.com`
   - Teléfono: `+56912345678`
5. **Click** en "Crear Teleoperador"
6. **Verificar** notificación: "Perfil completo generado para test.operator@example.com"
7. **Abrir** consola (F12)
8. **Verificar** log: "✅ Perfil completo creado para: test.operator@example.com"
9. **Verificar** en Firestore:
   - `operators`: Nuevo documento con email
   - `userProfiles`: Nuevo documento con mismo email

### Test 2: Sincronizar Operadores Existentes

1. **Login** como administrador
2. **Ir** a módulo Asignaciones
3. **Click** en "Sincronizar Perfiles" (ícono 🔄)
4. **Confirmar** en el diálogo
5. **Esperar** proceso (puede tardar unos segundos)
6. **Verificar** notificación con resumen
7. **Abrir** consola (F12)
8. **Verificar** logs detallados de cada operador
9. **Verificar** en Firestore:
   - `userProfiles`: Nuevos perfiles creados

### Test 3: Operador Sin Email

1. **Crear** operador sin email
2. **Ejecutar** sincronización
3. **Verificar** console: "⏭️ [Nombre] - Sin email, omitiendo"
4. **Verificar** que no se creó perfil en `userProfiles`

---

## Troubleshooting

### Error: "Sin permisos para esta operación"

**Causa**: El usuario no es super admin o admin.

**Solución**:
```javascript
// Verificar en src/utils/adminConfig.js
const ADMIN_EMAILS = [
  'roberto@mistatas.com',
  'carolina@mistatas.com'
];
```

### Error: "Ya existe un usuario con este email"

**Causa**: El email ya está registrado en `userProfiles`.

**Solución**: 
- Verificar en Firestore si realmente existe
- Si es duplicado, eliminar el documento antiguo
- Re-ejecutar sincronización

### Console Spam Continúa

**Causa**: Perfiles no sincronizados o emails mal escritos en `operators`.

**Solución**:
1. Ejecutar "Sincronizar Perfiles"
2. Verificar emails en colección `operators`
3. Corregir emails mal escritos
4. Re-ejecutar sincronización

### Error: "FirebaseError: Missing or insufficient permissions"

**Causa**: Reglas de Firestore no permiten escritura en `userProfiles`.

**Solución**:
```javascript
// Verificar firestore.rules
match /userProfiles/{userId} {
  allow read, write: if request.auth != null && 
    (request.auth.token.email == 'roberto@mistatas.com' || 
     request.auth.token.email == 'carolina@mistatas.com');
}
```

---

## Próximos Pasos

### Inmediatos
- [x] Crear perfiles automáticamente al crear operadores
- [x] Sincronizar operadores existentes
- [x] Agregar botón de sincronización en UI
- [ ] Crear auths en Firebase para los 4 operadores actuales

### Futuro
- [ ] Script automatizado para crear auths en Firebase
- [ ] Email automático con credenciales temporales
- [ ] Panel de gestión de usuarios completo
- [ ] Logs de auditoría de creación de perfiles

---

## Commit

```bash
git add src/App.jsx sync-existing-operators.js SINCRONIZACION_PERFILES_OPERADORES.md
git commit -m "feat(operators): crear perfiles completos automáticamente

NUEVA FUNCIONALIDAD:
- Crear perfil en userProfiles al crear operador desde Asignaciones
- Botón 'Sincronizar Perfiles' para operadores existentes
- Script sync-existing-operators.js para migración
- Validación de perfiles duplicados

CORRECCIONES:
- Eliminar spam de búsquedas repetidas (paulo, cristina, antonella, karol)
- Vincular operadores con perfiles mediante operatorId
- Cache de perfiles no encontrados en OperatorCard

ARCHIVOS:
- src/App.jsx: handleCreateOperator, handleSyncExistingOperators
- sync-existing-operators.js: Script de sincronización
- SINCRONIZACION_PERFILES_OPERADORES.md: Documentación completa

Tested: ✓ Creación automática ✓ Sincronización ✓ Sin duplicados"
```

---

**Fecha**: 10 de Diciembre, 2025  
**Autor**: GitHub Copilot  
**Revisado por**: Roberto Mistatas
