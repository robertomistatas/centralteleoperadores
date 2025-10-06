/**
 * 🔧 Script de Sincronización Automática de Karol
 * Este script se ejecuta automáticamente cuando detecta que Karol está en el sistema
 */

import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const KAROL_EMAIL = 'karolmaguayo@gmail.com';
const OLD_UID = 'smart_a2Fyb2xt_1759763837684';
const NEW_UID = 'NL2d3nSHdlUQE1G45ooS2kgSwk83';

export async function syncKarolAutomatically() {
  try {
    console.log('🔄 Sincronizando Karol Aguayo automáticamente...');
    
    // Verificar si ya está sincronizada
    const newDocRef = doc(db, 'userProfiles', NEW_UID);
    const newDocSnap = await getDoc(newDocRef);
    
    if (newDocSnap.exists()) {
      console.log('✅ Karol ya tiene UID real:', NEW_UID);
      return { success: true, alreadySynced: true };
    }
    
    // Buscar perfil con UID sintético
    const oldDocRef = doc(db, 'userProfiles', OLD_UID);
    const oldDocSnap = await getDoc(oldDocRef);
    
    if (!oldDocSnap.exists()) {
      console.log('ℹ️ No se encontró perfil con UID sintético');
      return { success: false, reason: 'not_found' };
    }
    
    const oldData = oldDocSnap.data();
    console.log('📄 Perfil encontrado:', oldData.displayName || oldData.name);
    
    // Crear backup
    const backupRef = doc(db, '_backups_auto_sync', OLD_UID);
    await setDoc(backupRef, {
      ...oldData,
      _backup_timestamp: new Date().toISOString(),
      _backup_old_uid: OLD_UID,
      _backup_real_uid: NEW_UID
    });
    
    // Crear nuevo perfil
    const newData = {
      ...oldData,
      uid: NEW_UID,
      updatedAt: serverTimestamp(),
      updatedBy: 'auto_sync_karol',
      autoSyncDate: new Date().toISOString(),
      previousUID: OLD_UID
    };
    
    await setDoc(newDocRef, newData);
    console.log('✅ Perfil creado con UID real');
    
    // Actualizar operators
    const operatorsRef = collection(db, 'operators');
    const operatorsQuery = query(operatorsRef, where('email', '==', KAROL_EMAIL));
    const operatorsSnapshot = await getDocs(operatorsQuery);
    
    let operatorsUpdated = 0;
    for (const operatorDoc of operatorsSnapshot.docs) {
      await updateDoc(operatorDoc.ref, {
        uid: NEW_UID,
        updatedAt: serverTimestamp()
      });
      operatorsUpdated++;
    }
    
    // Actualizar assignments
    const assignmentsRef = collection(db, 'assignments');
    const assignmentsQuery = query(assignmentsRef, where('operatorId', '==', OLD_UID));
    const assignmentsSnapshot = await getDocs(assignmentsQuery);
    
    let assignmentsUpdated = 0;
    for (const assignmentDoc of assignmentsSnapshot.docs) {
      await updateDoc(assignmentDoc.ref, {
        operatorId: NEW_UID,
        updatedAt: serverTimestamp()
      });
      assignmentsUpdated++;
    }
    
    // Eliminar perfil antiguo
    await deleteDoc(oldDocRef);
    
    console.log('✅ Karol sincronizada exitosamente');
    console.log('  • Operators:', operatorsUpdated);
    console.log('  • Assignments:', assignmentsUpdated);
    
    // Disparar evento
    window.dispatchEvent(new CustomEvent('userAutoSynced', {
      detail: {
        email: KAROL_EMAIL,
        oldUID: OLD_UID,
        newUID: NEW_UID,
        operatorsUpdated,
        assignmentsUpdated
      }
    }));
    
    return {
      success: true,
      operatorsUpdated,
      assignmentsUpdated
    };
    
  } catch (error) {
    console.error('❌ Error sincronizando Karol:', error);
    return { success: false, error: error.message };
  }
}
