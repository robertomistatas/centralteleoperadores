# 🔧 SOLUCIÓN DEFINITIVA: Sincronización Global de Datos de Usuario

## 🔍 Problema Identificado

### Síntomas
- Karol Aguayo aparece con email correcto en Configuración: `karolmaguayo@gmail.com`
- En módulo Asignaciones aparece con email incorrecto: `karolmaguayo@gmail.com` (posiblemente desactualizado)
- Al actualizar el perfil en Configuración, los cambios NO se propagan a otros módulos

### Causa Raíz

**Múltiples fuentes de datos desincronizadas:**

```
┌─────────────────────────────────────────────────────────────┐
│ PROBLEMA: Datos en 3 lugares diferentes                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. userProfiles (Firebase) ✅                             │
│     - Email: karolmaguayo@gmail.com                         │
│     - Nombre: Karol Aguayo                                  │
│     - UID: vFtxjkL9sLWqcEZ... (único)                       │
│                                                             │
│  2. operators (Firebase) ❌                                │
│     - Email: karol@mistatas.com (DESACTUALIZADO)            │
│     - Nombre: Karol Aguayo                                  │
│     - ID: carmen_rodriguez (NO coincide con UID)            │
│                                                             │
│  3. Excel/Asignaciones ❌                                  │
│     - Operadora: "Karol Aguayo"                             │
│     - Email: ??? (puede variar)                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Resultado**: Cada módulo lee de una fuente diferente y muestra datos distintos.

---

## ✅ Solución Implementada

### 1️⃣ **UID Único como Identificador Universal**

Usar el **Firebase Auth UID** como identificador único en TODAS las colecciones:

```javascript
// ✅ CORRECTO: Usar UID de Firebase Auth
{
  uid: "vFtxjkL9sLWqcEZ...",  // UID de Firebase Auth (único e inmutable)
  email: "karolmaguayo@gmail.com",
  displayName: "Karol Aguayo",
  role: "teleoperadora"
}
```

### 2️⃣ **UserProfiles como Fuente Única de Verdad**

La colección `userProfiles` es la **única fuente autorizada** de datos de usuario:

```
┌─────────────────────────────────────────────────────────────┐
│ SOLUCIÓN: userProfiles como única fuente de verdad         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  userProfiles (Firebase) ← FUENTE ÚNICA ✅                 │
│     ↓                                                       │
│     ├─→ Módulo Configuración                               │
│     ├─→ Módulo Asignaciones                                │
│     ├─→ Módulo Seguimientos                                │
│     ├─→ Dashboard                                          │
│     └─→ Métricas                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3️⃣ **Event Bus para Sincronización Global**

Implementar un sistema de eventos que notifique a TODOS los módulos cuando se actualice un perfil:

```javascript
// Cuando se actualiza un perfil en Configuración
window.dispatchEvent(new CustomEvent('userProfileUpdated', {
  detail: { uid, email, displayName, role }
}));

// Todos los módulos escuchan este evento
window.addEventListener('userProfileUpdated', (event) => {
  // Actualizar datos locales
  refreshUserData(event.detail);
});
```

---

## 🚀 Implementación

### Paso 1: Servicio de Sincronización Global

Archivo: `src/services/userSyncService.js`

```javascript
/**
 * Servicio para sincronización global de datos de usuario
 * Mantiene consistencia entre todos los módulos
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

class UserSyncService {
  constructor() {
    this.listeners = new Set();
    this.cache = new Map();
  }

  /**
   * Obtener perfil actualizado de usuario por UID
   */
  async getUserProfile(uid) {
    try {
      // Verificar cache primero
      if (this.cache.has(uid)) {
        const cached = this.cache.get(uid);
        // Cache válido por 5 minutos
        if (Date.now() - cached.timestamp < 300000) {
          return cached.data;
        }
      }

      // Obtener de Firebase
      const docRef = doc(db, 'userProfiles', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = { uid, ...docSnap.data() };
        
        // Actualizar cache
        this.cache.set(uid, {
          data,
          timestamp: Date.now()
        });

        return data;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      return null;
    }
  }

  /**
   * Obtener perfil por email
   */
  async getUserProfileByEmail(email) {
    try {
      const { userManagementService } = await import('./userManagementService');
      return await userManagementService.getUserProfileByEmail(email);
    } catch (error) {
      console.error('Error obteniendo perfil por email:', error);
      return null;
    }
  }

  /**
   * Actualizar perfil y notificar a toda la app
   */
  async updateUserProfile(uid, updates) {
    try {
      console.log('🔄 Actualizando perfil:', uid, updates);

      // Actualizar en Firebase
      const docRef = doc(db, 'userProfiles', uid);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date()
      });

      // Obtener datos actualizados
      const updatedProfile = await this.getUserProfile(uid);

      // Invalidar cache
      this.cache.delete(uid);

      // Notificar a toda la app
      this.notifyProfileUpdate(updatedProfile);

      console.log('✅ Perfil actualizado y sincronizado');
      return updatedProfile;
    } catch (error) {
      console.error('❌ Error actualizando perfil:', error);
      throw error;
    }
  }

  /**
   * Notificar actualización de perfil a toda la app
   */
  notifyProfileUpdate(profile) {
    console.log('📢 Notificando actualización de perfil:', profile.email);

    // Event bus global
    window.dispatchEvent(new CustomEvent('userProfileUpdated', {
      detail: profile
    }));

    // Notificar a listeners registrados
    this.listeners.forEach(listener => {
      try {
        listener(profile);
      } catch (error) {
        console.error('Error en listener:', error);
      }
    });
  }

  /**
   * Registrar listener para cambios de perfil
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Limpiar cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Instancia singleton
export const userSyncService = new UserSyncService();
export default userSyncService;
```

### Paso 2: Hook para Sincronización Automática

Archivo: `src/hooks/useUserSync.js`

```javascript
import { useEffect, useState } from 'react';
import { userSyncService } from '../services/userSyncService';

/**
 * Hook para mantener datos de usuario sincronizados
 * en todos los componentes
 */
export const useUserSync = (uid) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    // Cargar perfil inicial
    const loadProfile = async () => {
      try {
        const data = await userSyncService.getUserProfile(uid);
        if (mounted) {
          setProfile(data);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error cargando perfil:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    // Escuchar actualizaciones globales
    const handleUpdate = (event) => {
      const updatedProfile = event.detail;
      if (updatedProfile.uid === uid) {
        console.log('🔄 Perfil actualizado:', updatedProfile.email);
        setProfile(updatedProfile);
      }
    };

    window.addEventListener('userProfileUpdated', handleUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('userProfileUpdated', handleUpdate);
    };
  }, [uid]);

  return { profile, isLoading };
};
```

### Paso 3: Actualizar Módulo de Configuración

```javascript
// En SuperAdminDashboard.jsx o donde se editen usuarios

import { userSyncService } from '../../services/userSyncService';

const handleUpdateUser = async (userId, updates) => {
  try {
    setIsLoading(true);

    // ✅ Usar el servicio de sincronización
    await userSyncService.updateUserProfile(userId, updates);

    // ✅ La notificación global ya se envió automáticamente
    showSuccess('Usuario actualizado correctamente');

    // Recargar lista local
    await loadUsers();
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    showError('Error al actualizar usuario');
  } finally {
    setIsLoading(false);
  }
};
```

### Paso 4: Actualizar Módulo de Asignaciones

```javascript
// En el componente de Asignaciones

import { useUserSync } from '../../hooks/useUserSync';

const AsignacionesModule = () => {
  const { user } = useAuth();
  const { profile } = useUserSync(user.uid); // ✅ Datos siempre actualizados

  // Usar profile en lugar de user directo
  const operatorEmail = profile?.email || user?.email;
  const operatorName = profile?.displayName || user?.displayName;

  return (
    <div>
      <h2>Asignaciones de {operatorName}</h2>
      <p>Email: {operatorEmail}</p>
    </div>
  );
};
```

---

## 📊 Migración de Datos Existentes

### Script de Migración

Archivo: `migrate-operators-to-uid.js`

```javascript
/**
 * Script para migrar operadores existentes al nuevo sistema UID
 */

import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './src/firebase';

async function migrateOperatorsToUID() {
  console.log('🔄 Iniciando migración de operadores a sistema UID...');

  try {
    // 1. Obtener todos los userProfiles (fuente de verdad)
    const userProfilesSnapshot = await getDocs(collection(db, 'userProfiles'));
    const userProfiles = [];
    
    userProfilesSnapshot.forEach(doc => {
      userProfiles.push({
        uid: doc.id,
        ...doc.data()
      });
    });

    console.log(`📋 ${userProfiles.length} perfiles de usuario encontrados`);

    // 2. Obtener operadores actuales
    const operatorsSnapshot = await getDocs(collection(db, 'operators'));
    const operators = [];
    
    operatorsSnapshot.forEach(doc => {
      operators.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`📋 ${operators.length} operadores actuales encontrados`);

    // 3. Sincronizar operadores con userProfiles
    for (const profile of userProfiles) {
      if (profile.role === 'teleoperadora' || profile.role === 'admin') {
        // Buscar operador existente por email
        const existingOperator = operators.find(op => 
          op.email?.toLowerCase() === profile.email?.toLowerCase()
        );

        if (existingOperator) {
          console.log(`🔄 Migrando operador: ${profile.email}`);

          // Crear/actualizar operador con UID correcto
          const operatorRef = doc(db, 'operators', profile.uid);
          await setDoc(operatorRef, {
            uid: profile.uid,
            name: profile.displayName || existingOperator.name,
            email: profile.email,
            phone: existingOperator.phone || '',
            role: profile.role,
            userId: profile.uid, // Para compatibilidad
            createdAt: existingOperator.createdAt || new Date(),
            updatedAt: new Date()
          });

          // Eliminar operador antiguo si tiene ID diferente
          if (existingOperator.id !== profile.uid) {
            console.log(`🗑️ Eliminando operador antiguo: ${existingOperator.id}`);
            await deleteDoc(doc(db, 'operators', existingOperator.id));
          }

          console.log(`✅ Operador migrado: ${profile.email}`);
        } else {
          // Crear nuevo operador
          console.log(`➕ Creando operador para: ${profile.email}`);
          
          const operatorRef = doc(db, 'operators', profile.uid);
          await setDoc(operatorRef, {
            uid: profile.uid,
            name: profile.displayName,
            email: profile.email,
            phone: '',
            role: profile.role,
            userId: profile.uid,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          console.log(`✅ Operador creado: ${profile.email}`);
        }
      }
    }

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
  }
}

// Ejecutar migración
migrateOperatorsToUID();
```

---

## 🎯 Resultado Esperado

### Antes ❌
```
Configuración:  karolmaguayo@gmail.com (correcto)
Asignaciones:   karol@mistatas.com (desactualizado)
Seguimientos:   karolmaguayo@gmail.com (correcto)
```

### Después ✅
```
Configuración:  karolmaguayo@gmail.com ✅
Asignaciones:   karolmaguayo@gmail.com ✅ (sincronizado)
Seguimientos:   karolmaguayo@gmail.com ✅ (sincronizado)

Todos los módulos usan el mismo UID y consultan userProfiles
```

---

## 🔐 Ventajas del Nuevo Sistema

1. **UID Único e Inmutable**: Firebase Auth UID nunca cambia
2. **Sincronización Automática**: Cambios se propagan instantáneamente
3. **Fuente Única de Verdad**: userProfiles es la referencia autoritaria
4. **Cache Inteligente**: Reduce consultas a Firebase
5. **Event Bus Global**: Comunicación entre módulos
6. **Retrocompatibilidad**: Sistema antiguo sigue funcionando durante la migración

---

## 📝 Checklist de Implementación

- [ ] 1. Crear `userSyncService.js`
- [ ] 2. Crear hook `useUserSync.js`
- [ ] 3. Actualizar módulo Configuración para usar `userSyncService`
- [ ] 4. Actualizar módulo Asignaciones para usar `useUserSync`
- [ ] 5. Actualizar módulo Seguimientos para usar `useUserSync`
- [ ] 6. Ejecutar script de migración `migrate-operators-to-uid.js`
- [ ] 7. Verificar que todos los módulos muestran datos consistentes
- [ ] 8. Probar actualización de perfil y verificar propagación

---

**Fecha**: 6 de octubre de 2025  
**Estado**: Solución Diseñada - Lista para Implementar
