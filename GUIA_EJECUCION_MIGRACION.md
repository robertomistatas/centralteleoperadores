# 📋 GUÍA DE EJECUCIÓN: Scripts de Migración y Pruebas

## 🎯 Resumen

Se han creado 2 scripts robustos para completar la implementación del sistema de sincronización global:

1. **`migrate-operators-to-uid.cjs`** - Migración de operadores a sistema UID
2. **`test-user-sync.cjs`** - Suite de pruebas de sincronización

## 📦 Prerequisitos

### 1. Instalar dependencias necesarias

```bash
npm install firebase-admin
```

### 2. Obtener credenciales de Firebase Admin

Para ejecutar estos scripts necesitas las credenciales de Firebase Admin:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **⚙️ Configuración del proyecto** → **Cuentas de servicio**
4. Haz clic en **"Generar nueva clave privada"**
5. Se descargará un archivo JSON
6. **Guarda ese archivo como `serviceAccountKey.json`** en la raíz del proyecto

**⚠️ IMPORTANTE:** 
- Este archivo contiene credenciales sensibles
- **NO lo subas a Git** (ya está en `.gitignore`)
- Mantenlo seguro y privado

## 🔄 Paso 1: Ejecutar Migración de Operadores

### Simulación (Dry Run) - Recomendado primero

```bash
node migrate-operators-to-uid.cjs --dry-run
```

**¿Qué hace?**
- ✅ Simula la migración SIN hacer cambios reales
- ✅ Muestra qué operadores se migrarían
- ✅ Identifica problemas potenciales
- ✅ Genera reporte en `migration.log`

**Revisa la salida:**
- Número de operadores a migrar
- Operadores que ya tienen UID
- Errores o advertencias

### Ejecución Real

**⚠️ ANTES DE EJECUTAR:**
1. Asegúrate de que el Dry Run no mostró errores críticos
2. Verifica que tienes backup de tu base de datos
3. El script creará backups automáticos en carpeta `backups/`

```bash
node migrate-operators-to-uid.cjs
```

**¿Qué hace?**
- ✅ Crea backups automáticos de `operators`, `userProfiles`, `assignments`
- ✅ Para cada operador sin UID:
  - Busca/crea usuario en Firebase Auth
  - Crea perfil en `userProfiles`
  - Actualiza documento en `operators` con UID
- ✅ Valida consistencia de datos
- ✅ Genera logs detallados
- ✅ Permite rollback en caso de error

**Salida esperada:**
```
📊 RESUMEN DE MIGRACIÓN
============================================================
Total de operadores: 5
✅ Migrados exitosamente: 3
ℹ️  Saltados (ya tenían UID): 2
❌ Errores: 0
⚠️  Advertencias: 1
============================================================
```

### Si algo sale mal

El script crea backups automáticamente en la carpeta `backups/`. Si necesitas revertir:

```javascript
// Los archivos de backup tienen formato:
// operators_2025-10-06T17-30-00-000Z.json
// userProfiles_2025-10-06T17-30-00-000Z.json
// assignments_2025-10-06T17-30-00-000Z.json
```

El script incluye función de rollback automático en caso de error crítico.

## 🧪 Paso 2: Ejecutar Suite de Pruebas

```bash
node test-user-sync.cjs
```

**¿Qué hace?**
- ✅ Crea usuario de prueba temporal
- ✅ Valida lectura de perfiles
- ✅ Prueba actualización y propagación
- ✅ Verifica consistencia de datos
- ✅ Valida UIDs únicos
- ✅ Verifica estructura de colecciones
- ✅ Limpia datos de prueba al finalizar
- ✅ Genera reporte JSON con resultados

**Salida esperada:**
```
📊 RESUMEN DE PRUEBAS
============================================================
Total: 8
✅ Aprobadas: 8
❌ Fallidas: 0
📈 Tasa de éxito: 100.0%
============================================================
```

**Reportes generados:**
- `test-report-[timestamp].json` - Reporte detallado en JSON

## 📊 Paso 3: Verificar en la Aplicación

1. **Inicia la aplicación:**
   ```bash
   npm run dev
   ```

2. **Inicia sesión como administrador:**
   - Email: `roberto@mistatas.com`

3. **Ve al módulo de Configuración:**
   - Busca a "Karol Aguayo" (o cualquier teleoperadora)
   - Actualiza su email (por ejemplo: `karol.nueva@test.com`)
   - Haz clic en "Guardar"

4. **Verifica sincronización:**
   - **SIN RECARGAR LA PÁGINA**, ve al módulo "Seguimientos"
   - El dashboard debería mostrar el nuevo email automáticamente
   - Ve al módulo "Asignaciones"
   - El email también debería estar actualizado

5. **Verifica en consola del navegador:**
   ```
   🔔 Evento userProfileUpdated recibido: { ... }
   🔄 Recargando operadores y asignaciones...
   ✅ Operadores y asignaciones recargados correctamente
   ```

## 🎯 Resumen de Cambios Implementados

### Archivos Modificados

1. **`src/App.jsx`**
   - Importado `useUserSync` hook
   - Creado componente `OperatorCard` con sincronización
   - Módulo Asignaciones ahora usa sincronización en tiempo real

2. **`src/components/seguimientos/TeleoperadoraDashboard.jsx`**
   - Integrado `useUserSync` hook
   - Email del dashboard se sincroniza automáticamente

3. **`src/components/admin/SuperAdminDashboard.jsx`**
   - Integrado `userSyncService`
   - Actualización de usuarios notifica globalmente

### Archivos Creados

1. **`src/services/userSyncService.js`**
   - Servicio singleton de sincronización
   - Cache de 5 minutos
   - Event bus con CustomEvent

2. **`src/hooks/useUserSync.js`**
   - Hook de React para sincronización automática
   - Escucha eventos `userProfileUpdated`

3. **`migrate-operators-to-uid.cjs`**
   - Script de migración robusto
   - Backups automáticos
   - Validación y rollback

4. **`test-user-sync.cjs`**
   - Suite de 8 pruebas automatizadas
   - Reportes en JSON

5. **`GUIA_EJECUCION_MIGRACION.md`** (este archivo)

## ✅ Checklist de Validación

- [ ] Prerequisitos instalados (firebase-admin)
- [ ] `serviceAccountKey.json` configurado
- [ ] Dry run ejecutado sin errores
- [ ] Migración real completada exitosamente
- [ ] Suite de pruebas pasó 100%
- [ ] Verificación manual en aplicación funcionando
- [ ] Emails se actualizan sin recargar página
- [ ] Logs revisados sin errores críticos

## 🆘 Troubleshooting

### Error: "Cannot find module './serviceAccountKey.json'"

**Solución:** Descarga las credenciales de Firebase Admin (ver sección de prerequisitos)

### Error: "Missing or insufficient permissions"

**Solución:** Verifica que las reglas de Firestore permitan operaciones de admin:
```bash
firebase deploy --only firestore:rules
```

### Error: "auth/user-not-found"

**Solución:** El usuario no existe en Firebase Auth. El script lo creará automáticamente.

### Advertencia: "Operador sin email"

**Acción:** Estos operadores no podrán ser migrados. Agrégales emails manualmente antes de la migración.

### Los cambios no se propagan

**Diagnóstico:**
1. Abre consola del navegador (F12)
2. Busca mensajes con emoji 🔔 o 🔄
3. Verifica que no haya errores JavaScript
4. Comprueba que el evento `userProfileUpdated` se está disparando

**Solución:**
- Asegúrate de que el código está actualizado
- Limpia caché del navegador (Ctrl+Shift+Delete)
- Reinicia el servidor de desarrollo

## 📚 Documentación Adicional

- **Arquitectura del sistema:** Ver `SOLUCION_SINCRONIZACION_GLOBAL_USUARIOS.md`
- **Corrección de eliminación:** Ver `CORRECCION_DEFINITIVA_ELIMINACION_TELEOPERADORAS.md`
- **Permisos Firebase:** Ver `SOLUCION_ERROR_PERMISOS_DELETE.md`

## 🎉 ¡Listo!

Una vez completados estos pasos, tu sistema tendrá:

✅ **Identificación única por UID** (Firebase Auth)
✅ **Sincronización global automática** entre todos los módulos
✅ **Single source of truth** (userProfiles)
✅ **Event bus** para propagación sin reload
✅ **Sistema robusto validado** con pruebas automatizadas

---

**Última actualización:** 6 de octubre de 2025
**Autor:** GitHub Copilot
**Versión:** 1.0.0
