# 🔧 GUÍA RÁPIDA: Actualizar UID de Karol Aguayo

## 📋 Información

**Usuario:** Karol Aguayo  
**Email:** karolmaguayo@gmail.com  
**UID Sintético (actual):** `smart_a2Fyb2xt_1759763837684`  
**UID Real (Firebase Auth):** `NL2d3nSHdlUQE1G45ooS2kgSwk83`

---

## ⚡ OPCIÓN 1: Script desde el Navegador (MÁS RÁPIDO) ⭐

### Pasos:

1. **Abre la aplicación:** http://localhost:5173/centralteleoperadores/

2. **Inicia sesión** como Super Admin (roberto@mistatas.com)

3. **Abre la consola del navegador:**
   - Windows: `F12` o `Ctrl + Shift + I`
   - Mac: `Cmd + Option + I`
   - Click en pestaña "Console"

4. **Abre el archivo:** `update-karol-uid-browser.js`

5. **Copia TODO el contenido** (Ctrl+A, Ctrl+C)

6. **Pega en la consola** y presiona Enter

7. **Confirma** las 2 alertas:
   - Primera: Reemplazar UID (OK)
   - Segunda: Confirmar operación (OK)

8. **Espera** los mensajes:
   ```
   ✅ Backup creado
   ✅ Nuevo documento creado
   ✅ N operadores actualizados
   ✅ N asignaciones actualizadas
   ✅ Documento antiguo eliminado
   ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE
   ```

9. **Recarga la página** (F5)

10. **Verifica:**
    - Ve a Configuración → Usuarios
    - Busca "Karol Aguayo"
    - Edita su perfil
    - Cambia el email a: `karolmaguayo1@gmail.com`
    - Guarda
    - Ve a Asignaciones
    - Verifica que el email se actualice correctamente

---

## 🔧 OPCIÓN 2: Script con Node.js (Requiere serviceAccountKey.json)

### Requisitos:

1. **Obtener serviceAccountKey.json:**
   - Ve a Firebase Console
   - Project Settings → Service Accounts
   - Click "Generate new private key"
   - Guarda como `serviceAccountKey.json` en la raíz del proyecto

2. **Ejecutar script:**
   ```bash
   node update-karol-uid.cjs
   ```

3. **Confirmar** cuando pregunte

4. **Espera** a que termine

5. **Recarga** la aplicación

---

## ✅ Verificación Post-Migración

### 1. Verificar en Firebase Console

Ve a: Firestore Database → userProfiles

**Debe existir:**
```
Document ID: NL2d3nSHdlUQE1G45ooS2kgSwk83
{
  uid: "NL2d3nSHdlUQE1G45ooS2kgSwk83",
  email: "karolmaguayo@gmail.com",
  displayName: "Karol Aguayo",
  role: "teleoperadora",
  ...
}
```

**NO debe existir:**
```
Document ID: smart_a2Fyb2xt_1759763837684
(Este documento debe haber sido eliminado)
```

---

### 2. Verificar en la Aplicación

**A. Configuración → Usuarios:**
- ✅ Karol Aguayo debe aparecer en la lista
- ✅ Su email debe ser: `karolmaguayo@gmail.com`
- ✅ Debe poder editar su perfil sin errores

**B. Asignaciones:**
- ✅ El card de Karol debe mostrar: `karolmaguayo@gmail.com`
- ✅ Debe mostrar sus 287 beneficiarios
- ✅ Al cambiar el email en Configuración, debe actualizarse en Asignaciones sin recargar

**C. Consola (F12):**
- ✅ NO debe aparecer: `⚠️ No se encontró perfil para email: karol@mistatas.com`
- ✅ Debe aparecer: `✅ Perfil sincronizado: karolmaguayo@gmail.com`

---

### 3. Probar Inicio de Sesión (Opcional)

Si quieres que Karol pueda iniciar sesión:

1. **Cerrar sesión** actual
2. **Iniciar sesión con:**
   - Email: `karolmaguayo@gmail.com`
   - Password: (la que hayas configurado en Firebase Auth)
3. **Verificar** que puede acceder y ver sus asignaciones

---

## 📊 Qué Hace el Script

1. ✅ **Crea backup** del perfil actual en `_backups_uid_migration`
2. ✅ **Crea nuevo documento** en `userProfiles` con UID real
3. ✅ **Actualiza `operators`** con el nuevo UID (busca por email)
4. ✅ **Actualiza `assignments`** con el nuevo UID (busca por operatorId)
5. ✅ **Elimina documento antiguo** con UID sintético
6. ✅ **Mantiene todos los datos** (nombre, rol, teléfono, etc.)

---

## 🔄 Rollback (Si algo sale mal)

Si necesitas revertir los cambios:

### Desde la Consola del Navegador:

```javascript
(async () => {
  const { db } = window;
  const { doc, getDoc, setDoc, deleteDoc } = await import('firebase/firestore');
  
  const OLD_UID = 'smart_a2Fyb2xt_1759763837684';
  const NEW_UID = 'NL2d3nSHdlUQE1G45ooS2kgSwk83';
  
  // Obtener backup
  const backupRef = doc(db, '_backups_uid_migration', OLD_UID);
  const backupSnap = await getDoc(backupRef);
  
  if (!backupSnap.exists()) {
    console.error('❌ No se encontró backup');
    return;
  }
  
  // Restaurar
  const backupData = backupSnap.data();
  delete backupData._backup_timestamp;
  delete backupData._backup_old_uid;
  
  const oldDocRef = doc(db, 'userProfiles', OLD_UID);
  await setDoc(oldDocRef, backupData);
  
  // Eliminar nuevo
  const newDocRef = doc(db, 'userProfiles', NEW_UID);
  await deleteDoc(newDocRef);
  
  console.log('✅ Rollback completado');
  alert('✅ Rollback completado! Recarga la página.');
})();
```

---

## 🎯 Resultado Esperado

Después de la migración:

✅ **Karol tiene UID real:** `NL2d3nSHdlUQE1G45ooS2kgSwk83`  
✅ **Puede iniciar sesión** con Firebase Auth  
✅ **Su email se sincroniza** en todos los módulos  
✅ **NO aparecen warnings** de "usuario diferente"  
✅ **Sus asignaciones funcionan** correctamente  

---

## 💡 Notas Importantes

- 🔒 **Backup automático:** El script crea un backup antes de cualquier cambio
- ⚡ **Sin downtime:** La aplicación sigue funcionando durante la migración
- 🔄 **Reversible:** Puedes hacer rollback si es necesario
- 📝 **Logs completos:** La consola muestra cada paso de la migración

---

## 🚀 Próximos Pasos (Después de Karol)

Si quieres migrar otros usuarios:

1. **Crear usuarios en Firebase Authentication:**
   - Carolina Reyes → carolina@mistatas.com
   - Javiera Reyes → reyesalvaradojaviera@gmail.com
   - Antonella → antonella@mistatas.com
   - Teleasistencia → teleasistencia@mistatas.com

2. **Copiar sus UIDs reales**

3. **Ejecutar script similar** para cada uno

O usar el script de migración masiva: `migrate-operators-to-uid.cjs`

---

**Fecha:** 6 de octubre de 2025  
**Autor:** GitHub Copilot  
**Versión:** 1.0
