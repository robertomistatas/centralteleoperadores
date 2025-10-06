/**
 * 🔧 Script para actualizar UID de Karol Aguayo
 * Reemplaza UID sintético por UID real de Firebase Auth
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Datos de Karol
const KAROL_EMAIL = 'karolmaguayo@gmail.com';
const OLD_UID = 'smart_a2Fyb2xt_1759763837684';  // UID sintético actual
const NEW_UID = 'NL2d3nSHdlUQE1G45ooS2kgSwk83';  // UID real de Firebase Auth

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  try {
    console.log('🔧 ACTUALIZACIÓN DE UID - KAROL AGUAYO\n');
    console.log('📧 Email:', KAROL_EMAIL);
    console.log('🔄 UID Sintético (OLD):', OLD_UID);
    console.log('✅ UID Real (NEW):', NEW_UID);
    console.log('\n' + '='.repeat(60) + '\n');

    // Verificar si existe serviceAccountKey.json
    let serviceAccount;
    try {
      serviceAccount = require('./serviceAccountKey.json');
      console.log('✅ serviceAccountKey.json encontrado\n');
    } catch (error) {
      console.error('❌ ERROR: No se encontró serviceAccountKey.json');
      console.log('\n📝 Para obtenerlo:');
      console.log('1. Ve a Firebase Console → Project Settings');
      console.log('2. Service Accounts → Generate new private key');
      console.log('3. Guarda el archivo como serviceAccountKey.json en la raíz del proyecto\n');
      process.exit(1);
    }

    // Inicializar Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin inicializado\n');
    }

    const db = admin.firestore();

    // PASO 1: Verificar que existe el documento con UID sintético
    console.log('🔍 PASO 1: Buscando documento con UID sintético...');
    const oldDocRef = db.collection('userProfiles').doc(OLD_UID);
    const oldDocSnap = await oldDocRef.get();

    if (!oldDocSnap.exists) {
      console.error(`❌ ERROR: No se encontró documento con UID ${OLD_UID}`);
      console.log('\n💡 Buscando por email...');
      
      const querySnapshot = await db.collection('userProfiles')
        .where('email', '==', KAROL_EMAIL)
        .get();
      
      if (querySnapshot.empty) {
        console.error('❌ No se encontró ningún perfil con ese email');
        process.exit(1);
      }
      
      console.log(`✅ Encontrado documento con ID: ${querySnapshot.docs[0].id}`);
      console.log('📝 Datos:', querySnapshot.docs[0].data());
      process.exit(0);
    }

    const oldData = oldDocSnap.data();
    console.log('✅ Documento encontrado');
    console.log('📝 Email actual:', oldData.email);
    console.log('📝 Nombre:', oldData.displayName || oldData.name);
    console.log('📝 Rol:', oldData.role);

    // PASO 2: Verificar que NO existe ya un documento con el UID nuevo
    console.log('\n🔍 PASO 2: Verificando que el nuevo UID no esté en uso...');
    const newDocRef = db.collection('userProfiles').doc(NEW_UID);
    const newDocSnap = await newDocRef.get();

    if (newDocSnap.exists) {
      console.warn('⚠️ ADVERTENCIA: Ya existe un documento con el nuevo UID');
      console.log('📝 Datos del documento existente:', newDocSnap.data());
      
      const answer = await question('\n¿Deseas REEMPLAZARLO con los datos del UID sintético? (sí/no): ');
      if (answer.toLowerCase() !== 'sí' && answer.toLowerCase() !== 'si') {
        console.log('❌ Operación cancelada');
        rl.close();
        process.exit(0);
      }
    }

    // PASO 3: Confirmación
    console.log('\n⚠️ CONFIRMACIÓN REQUERIDA');
    console.log('Esta operación hará lo siguiente:');
    console.log('1. Crear documento en userProfiles con UID:', NEW_UID);
    console.log('2. Copiar todos los datos del documento:', OLD_UID);
    console.log('3. Actualizar campo "uid" al nuevo valor');
    console.log('4. Eliminar documento antiguo:', OLD_UID);
    console.log('5. Actualizar colección "operators" si existe referencia');
    
    const confirm = await question('\n¿Deseas continuar? (sí/no): ');
    if (confirm.toLowerCase() !== 'sí' && confirm.toLowerCase() !== 'si') {
      console.log('❌ Operación cancelada');
      rl.close();
      process.exit(0);
    }

    // PASO 4: Crear backup
    console.log('\n💾 PASO 3: Creando backup...');
    const backupData = {
      ...oldData,
      _backup_timestamp: new Date().toISOString(),
      _backup_old_uid: OLD_UID
    };
    
    await db.collection('_backups_uid_migration').doc(OLD_UID).set(backupData);
    console.log('✅ Backup creado en colección _backups_uid_migration');

    // PASO 5: Crear nuevo documento
    console.log('\n📝 PASO 4: Creando nuevo documento...');
    const newData = {
      ...oldData,
      uid: NEW_UID,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'migration_script',
      migrationDate: new Date().toISOString(),
      previousUID: OLD_UID
    };
    
    await newDocRef.set(newData);
    console.log('✅ Nuevo documento creado con UID:', NEW_UID);

    // PASO 6: Actualizar colección operators
    console.log('\n🔄 PASO 5: Actualizando colección operators...');
    const operatorsQuery = await db.collection('operators')
      .where('email', '==', KAROL_EMAIL)
      .get();
    
    if (!operatorsQuery.empty) {
      const batch = db.batch();
      operatorsQuery.forEach(doc => {
        batch.update(doc.ref, {
          uid: NEW_UID,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
      console.log(`✅ ${operatorsQuery.size} documentos actualizados en operators`);
    } else {
      console.log('ℹ️ No se encontraron documentos en operators con ese email');
    }

    // PASO 7: Actualizar assignments si tiene UID
    console.log('\n🔄 PASO 6: Actualizando colección assignments...');
    const assignmentsQuery = await db.collection('assignments')
      .where('operatorId', '==', OLD_UID)
      .get();
    
    if (!assignmentsQuery.empty) {
      const batch = db.batch();
      assignmentsQuery.forEach(doc => {
        batch.update(doc.ref, {
          operatorId: NEW_UID,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
      console.log(`✅ ${assignmentsQuery.size} documentos actualizados en assignments`);
    } else {
      console.log('ℹ️ No se encontraron documentos en assignments con ese UID');
    }

    // PASO 8: Eliminar documento antiguo
    console.log('\n🗑️ PASO 7: Eliminando documento con UID sintético...');
    await oldDocRef.delete();
    console.log('✅ Documento antiguo eliminado');

    // RESUMEN
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('\n📊 RESUMEN:');
    console.log('✅ Perfil migrado de', OLD_UID);
    console.log('✅ Nuevo UID:', NEW_UID);
    console.log('✅ Email:', KAROL_EMAIL);
    console.log('✅ Backup guardado en: _backups_uid_migration/' + OLD_UID);
    console.log('✅ Operators actualizados:', operatorsQuery.size || 0);
    console.log('✅ Assignments actualizados:', assignmentsQuery.size || 0);
    
    console.log('\n🎯 SIGUIENTE PASO:');
    console.log('Recarga la aplicación y verifica que Karol Aguayo puede:');
    console.log('1. Iniciar sesión con: karolmaguayo@gmail.com');
    console.log('2. Ver sus asignaciones correctamente');
    console.log('3. Su email se sincroniza en todos los módulos\n');

  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA MIGRACIÓN:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Ejecutar
main();
