/**
 * 🔄 AUTO-SYNC SERVICE
 * Servicio para sincronizar automáticamente UIDs sintéticos con UIDs reales de Firebase Auth
 * Se ejecuta automáticamente cuando un usuario inicia sesión
 */

import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

class AutoSyncService {
  constructor() {
    this.syncInProgress = new Map();
    console.log('🔄 AutoSyncService inicializado');
  }

  /**
   * Detectar si un UID es sintético
   */
  isSyntheticUID(uid) {
    if (!uid) return false;
    
    // UIDs sintéticos: smart_, profile-, o no coinciden con el patrón de Firebase Auth
    return uid.startsWith('smart_') || 
           uid.startsWith('profile-') ||
           !uid.match(/^[a-zA-Z0-9]{28}$/);
  }

  /**
   * Sincronizar automáticamente un usuario con UID sintético
   * @param {string} email - Email del usuario
   * @param {string} realUID - UID real de Firebase Auth
   * @returns {Promise<boolean>} True si se sincronizó correctamente
   */
  async autoSyncUser(email, realUID) {
    try {
      // Evitar sincronizaciones simultáneas del mismo usuario
      if (this.syncInProgress.has(email)) {
        console.log('⏭️ Sincronización ya en progreso para:', email);
        return false;
      }

      this.syncInProgress.set(email, true);

      console.log('🔄 AUTO-SYNC: Iniciando sincronización automática');
      console.log('📧 Email:', email);
      console.log('✅ UID Real:', realUID);

      // 1. Buscar perfil con el email
      console.log('🔍 Buscando perfil con email:', email);
      const profilesRef = collection(db, 'userProfiles');
      const emailQuery = query(profilesRef, where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);

      if (emailSnapshot.empty) {
        console.log('ℹ️ No se encontró perfil con ese email');
        return false;
      }

      const oldDoc = emailSnapshot.docs[0];
      const oldUID = oldDoc.id;
      const oldData = oldDoc.data();

      console.log('📄 Perfil encontrado con UID:', oldUID);

      // 2. Verificar si el UID es sintético
      if (!this.isSyntheticUID(oldUID)) {
        console.log('✅ El usuario ya tiene UID real:', oldUID);
        
        // Si el UID actual es diferente al real, puede ser un conflicto
        if (oldUID !== realUID) {
          console.warn('⚠️ ADVERTENCIA: UID real diferente al esperado');
          console.warn('   En perfil:', oldUID);
          console.warn('   En Auth:', realUID);
        }
        
        return false;
      }

      console.log('🔄 UID sintético detectado, iniciando migración automática...');

      // 3. Verificar que no exista ya un perfil con el UID real
      const realDocRef = doc(db, 'userProfiles', realUID);
      const realDocSnap = await getDoc(realDocRef);

      if (realDocSnap.exists()) {
        console.log('ℹ️ Ya existe un perfil con el UID real, usando ese');
        return true;
      }

      // 4. Crear backup
      console.log('💾 Creando backup...');
      const backupRef = doc(db, '_backups_auto_sync', oldUID);
      await setDoc(backupRef, {
        ...oldData,
        _backup_timestamp: new Date().toISOString(),
        _backup_old_uid: oldUID,
        _backup_real_uid: realUID
      });

      // 5. Crear nuevo documento con UID real
      console.log('📝 Creando perfil con UID real...');
      const newData = {
        ...oldData,
        uid: realUID,
        updatedAt: serverTimestamp(),
        updatedBy: 'auto_sync_service',
        autoSyncDate: new Date().toISOString(),
        previousUID: oldUID
      };

      await setDoc(realDocRef, newData);
      console.log('✅ Perfil creado con UID real');

      // 6. Actualizar colección operators
      console.log('🔄 Actualizando operators...');
      const operatorsRef = collection(db, 'operators');
      const operatorsQuery = query(operatorsRef, where('email', '==', email));
      const operatorsSnapshot = await getDocs(operatorsQuery);

      let operatorsUpdated = 0;
      for (const operatorDoc of operatorsSnapshot.docs) {
        await updateDoc(operatorDoc.ref, {
          uid: realUID,
          updatedAt: serverTimestamp()
        });
        operatorsUpdated++;
      }
      console.log(`✅ ${operatorsUpdated} operadores actualizados`);

      // 7. Actualizar assignments
      console.log('🔄 Actualizando assignments...');
      const assignmentsRef = collection(db, 'assignments');
      const assignmentsQuery = query(assignmentsRef, where('operatorId', '==', oldUID));
      const assignmentsSnapshot = await getDocs(assignmentsQuery);

      let assignmentsUpdated = 0;
      for (const assignmentDoc of assignmentsSnapshot.docs) {
        await updateDoc(assignmentDoc.ref, {
          operatorId: realUID,
          updatedAt: serverTimestamp()
        });
        assignmentsUpdated++;
      }
      console.log(`✅ ${assignmentsUpdated} asignaciones actualizadas`);

      // 8. Actualizar seguimientos si existen
      console.log('🔄 Actualizando seguimientos...');
      const seguimientosRef = collection(db, 'seguimientos');
      const seguimientosQuery = query(seguimientosRef, where('teleoperadoraEmail', '==', email));
      const seguimientosSnapshot = await getDocs(seguimientosQuery);

      let seguimientosUpdated = 0;
      for (const seguimientoDoc of seguimientosSnapshot.docs) {
        await updateDoc(seguimientoDoc.ref, {
          teleoperadoraId: realUID,
          updatedAt: serverTimestamp()
        });
        seguimientosUpdated++;
      }
      console.log(`✅ ${seguimientosUpdated} seguimientos actualizados`);

      // 9. Eliminar documento antiguo
      console.log('🗑️ Eliminando perfil con UID sintético...');
      await deleteDoc(oldDoc.ref);

      // Resumen
      console.log('\n' + '='.repeat(60));
      console.log('✅ AUTO-SYNC COMPLETADA EXITOSAMENTE');
      console.log('='.repeat(60));
      console.log('📊 RESUMEN:');
      console.log('  • Email:', email);
      console.log('  • UID Sintético (OLD):', oldUID);
      console.log('  • UID Real (NEW):', realUID);
      console.log('  • Operators actualizados:', operatorsUpdated);
      console.log('  • Assignments actualizados:', assignmentsUpdated);
      console.log('  • Seguimientos actualizados:', seguimientosUpdated);
      console.log('  • Backup en: _backups_auto_sync/' + oldUID);
      console.log('='.repeat(60) + '\n');

      return true;

    } catch (error) {
      console.error('❌ Error durante auto-sync:', error);
      return false;
    } finally {
      this.syncInProgress.delete(email);
    }
  }

  /**
   * Verificar y sincronizar usuario al iniciar sesión
   * @param {Object} user - Usuario de Firebase Auth
   * @returns {Promise<boolean>}
   */
  async checkAndSync(user) {
    if (!user || !user.email) {
      return false;
    }

    try {
      // Verificar si el usuario tiene un perfil con UID sintético
      const result = await this.autoSyncUser(user.email, user.uid);
      
      if (result) {
        console.log('🎉 Usuario sincronizado automáticamente');
        
        // Disparar evento para notificar a otros módulos
        window.dispatchEvent(new CustomEvent('userAutoSynced', {
          detail: {
            email: user.email,
            uid: user.uid,
            timestamp: new Date().toISOString()
          }
        }));
      }

      return result;
    } catch (error) {
      console.error('❌ Error en checkAndSync:', error);
      return false;
    }
  }
}

// Instancia singleton
export const autoSyncService = new AutoSyncService();

export default autoSyncService;
