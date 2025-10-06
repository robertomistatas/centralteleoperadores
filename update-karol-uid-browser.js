/**
 * 🔧 Script Simple: Actualizar UID de Karol (sin Admin SDK)
 * Ejecutar desde la consola del navegador (F12)
 */

// Copiar y pegar TODO este código en la consola del navegador

(async function updateKarolUID() {
  console.log('🔧 ACTUALIZANDO UID DE KAROL AGUAYO\n');
  
  const KAROL_EMAIL = 'karolmaguayo@gmail.com';
  const OLD_UID = 'smart_a2Fyb2xt_1759763837684';
  const NEW_UID = 'NL2d3nSHdlUQE1G45ooS2kgSwk83';
  
  try {
    // Importar Firebase desde el contexto global
    const { db } = window;
    const { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } = await import('firebase/firestore');
    
    if (!db) {
      console.error('❌ Firebase no está inicializado');
      return;
    }
    
    console.log('📧 Email:', KAROL_EMAIL);
    console.log('🔄 UID Sintético (OLD):', OLD_UID);
    console.log('✅ UID Real (NEW):', NEW_UID);
    console.log('\n' + '='.repeat(60) + '\n');
    
    // PASO 1: Obtener documento actual
    console.log('🔍 PASO 1: Obteniendo documento actual...');
    const oldDocRef = doc(db, 'userProfiles', OLD_UID);
    const oldDocSnap = await getDoc(oldDocRef);
    
    if (!oldDocSnap.exists()) {
      console.error('❌ No se encontró el documento con UID sintético');
      return;
    }
    
    const oldData = oldDocSnap.data();
    console.log('✅ Documento encontrado');
    console.log('📝 Datos actuales:', oldData);
    
    // PASO 2: Verificar nuevo UID
    console.log('\n🔍 PASO 2: Verificando nuevo UID...');
    const newDocRef = doc(db, 'userProfiles', NEW_UID);
    const newDocSnap = await getDoc(newDocRef);
    
    if (newDocSnap.exists()) {
      console.warn('⚠️ Ya existe un documento con el nuevo UID');
      console.log('📝 Datos:', newDocSnap.data());
      
      if (!confirm('¿Deseas REEMPLAZARLO? (OK = Sí, Cancelar = No)')) {
        console.log('❌ Operación cancelada');
        return;
      }
    }
    
    // PASO 3: Confirmación
    console.log('\n⚠️ CONFIRMACIÓN REQUERIDA');
    if (!confirm(
      `¿Confirmas actualizar el UID de Karol Aguayo?\n\n` +
      `OLD: ${OLD_UID}\n` +
      `NEW: ${NEW_UID}\n\n` +
      `Esto actualizará userProfiles, operators y assignments.`
    )) {
      console.log('❌ Operación cancelada');
      return;
    }
    
    // PASO 4: Crear backup
    console.log('\n💾 PASO 3: Creando backup...');
    const backupRef = doc(db, '_backups_uid_migration', OLD_UID);
    await setDoc(backupRef, {
      ...oldData,
      _backup_timestamp: new Date().toISOString(),
      _backup_old_uid: OLD_UID
    });
    console.log('✅ Backup creado');
    
    // PASO 5: Crear nuevo documento
    console.log('\n📝 PASO 4: Creando nuevo documento...');
    const newData = {
      ...oldData,
      uid: NEW_UID,
      updatedAt: serverTimestamp(),
      updatedBy: 'migration_script_browser',
      migrationDate: new Date().toISOString(),
      previousUID: OLD_UID
    };
    
    await setDoc(newDocRef, newData);
    console.log('✅ Nuevo documento creado');
    
    // PASO 6: Actualizar operators
    console.log('\n🔄 PASO 5: Actualizando operators...');
    const operatorsRef = collection(db, 'operators');
    const operatorsQuery = query(operatorsRef, where('email', '==', KAROL_EMAIL));
    const operatorsSnapshot = await getDocs(operatorsQuery);
    
    let operatorsUpdated = 0;
    for (const docSnap of operatorsSnapshot.docs) {
      await updateDoc(docSnap.ref, {
        uid: NEW_UID,
        updatedAt: serverTimestamp()
      });
      operatorsUpdated++;
    }
    console.log(`✅ ${operatorsUpdated} operadores actualizados`);
    
    // PASO 7: Actualizar assignments
    console.log('\n🔄 PASO 6: Actualizando assignments...');
    const assignmentsRef = collection(db, 'assignments');
    const assignmentsQuery = query(assignmentsRef, where('operatorId', '==', OLD_UID));
    const assignmentsSnapshot = await getDocs(assignmentsQuery);
    
    let assignmentsUpdated = 0;
    for (const docSnap of assignmentsSnapshot.docs) {
      await updateDoc(docSnap.ref, {
        operatorId: NEW_UID,
        updatedAt: serverTimestamp()
      });
      assignmentsUpdated++;
    }
    console.log(`✅ ${assignmentsUpdated} asignaciones actualizadas`);
    
    // PASO 8: Eliminar documento antiguo
    console.log('\n🗑️ PASO 7: Eliminando documento antiguo...');
    await deleteDoc(oldDocRef);
    console.log('✅ Documento antiguo eliminado');
    
    // RESUMEN
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('\n📊 RESUMEN:');
    console.log('✅ Perfil migrado:', OLD_UID, '→', NEW_UID);
    console.log('✅ Email:', KAROL_EMAIL);
    console.log('✅ Operators actualizados:', operatorsUpdated);
    console.log('✅ Assignments actualizados:', assignmentsUpdated);
    console.log('✅ Backup en: _backups_uid_migration/' + OLD_UID);
    
    console.log('\n🎯 RECARGA LA PÁGINA para ver los cambios\n');
    
    alert('✅ Migración completada! Recarga la página (F5)');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    alert('❌ Error durante la migración. Ver consola para detalles.');
  }
})();
