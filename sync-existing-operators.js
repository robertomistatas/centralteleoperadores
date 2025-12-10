/**
 * Script para sincronizar operadores existentes con perfiles de usuario
 * 
 * Problema: Operadores creados desde el módulo Asignaciones solo tienen
 * un documento en 'operators' pero no tienen perfil en 'userProfiles'.
 * 
 * Este script:
 * 1. Lee todos los operadores de la colección 'operators'
 * 2. Para cada operador con email, verifica si existe perfil en 'userProfiles'
 * 3. Si no existe, crea el perfil completo
 * 
 * Uso:
 * 1. Abrir la consola del navegador en la app (estando autenticado)
 * 2. Copiar y pegar este código completo
 * 3. Ejecutar: syncExistingOperators()
 * 
 * NO NECESITA NODE.JS - SE EJECUTA EN EL NAVEGADOR
 */

// Este script usa las instancias de Firebase ya inicializadas en la app
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { db, auth } from './firebase';

// Este script usa las instancias de Firebase ya inicializadas en la app
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { db, auth } from './firebase';

/**
 * Buscar perfil por email
 */
async function findProfileByEmail(email) {
  if (!email) return null;
  
  const normalizedEmail = email.toLowerCase().trim();
  const q = query(
    collection(db, 'userProfiles'),
    where('email', '==', normalizedEmail)
  );
  
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  }
  return null;
}

/**
 * Crear perfil de usuario para operador
 */
async function createProfileForOperator(operator, creatorUid) {
  const profileId = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const userProfile = {
    uid: profileId,
    email: operator.email.toLowerCase().trim(),
    displayName: operator.name.trim(),
    role: 'teleoperadora',
    isActive: true,
    phone: operator.phone || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: creatorUid,
    operatorId: operator.id,
    authenticationStatus: 'pending',
    profileType: 'operator_migrated',
    migratedAt: new Date()
  };
  
  await setDoc(doc(db, 'userProfiles', profileId), userProfile);
  console.log('✅ Perfil creado:', profileId, operator.email);
  
  return userProfile;
}

/**
 * Sincronizar todos los operadores
 */
async function syncOperators() {
  try {
    console.log('🔄 Iniciando sincronización de operadores...\n');
    
    // Verificar autenticación
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ No hay usuario autenticado. Por favor, inicie sesión primero.');
      return;
    }
    
    console.log('✅ Usuario autenticado:', currentUser.email);
    console.log('');
    
    // Obtener todos los operadores
    console.log('📥 Obteniendo operadores...');
    const operatorsSnapshot = await getDocs(collection(db, 'operators'));
    const operators = operatorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ ${operators.length} operadores encontrados\n`);
    
    // Procesar cada operador
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const operator of operators) {
      try {
        // Solo procesar operadores con email
        if (!operator.email || operator.email.trim() === '') {
          console.log(`⏭️  ${operator.name} - Sin email, omitiendo`);
          skipped++;
          continue;
        }
        
        // Verificar si ya tiene perfil
        const existingProfile = await findProfileByEmail(operator.email);
        
        if (existingProfile) {
          console.log(`✓  ${operator.name} (${operator.email}) - Ya tiene perfil`);
          skipped++;
        } else {
          // Crear perfil
          await createProfileForOperator(operator, currentUser.uid);
          console.log(`✨ ${operator.name} (${operator.email}) - Perfil creado`);
          created++;
        }
      } catch (error) {
        console.error(`❌ ${operator.name} - Error:`, error.message);
        errors++;
      }
    }
    
    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE SINCRONIZACIÓN');
    console.log('='.repeat(60));
    console.log(`Total operadores:     ${operators.length}`);
    console.log(`Perfiles creados:     ${created} ✨`);
    console.log(`Ya existían:          ${skipped} ✓`);
    console.log(`Errores:              ${errors} ❌`);
    console.log('='.repeat(60));
    
    if (created > 0) {
      console.log('\n✅ Sincronización completada exitosamente!');
      console.log('');
      console.log('📧 SIGUIENTE PASO:');
      console.log('   Los usuarios con perfiles creados ahora pueden:');
      console.log('   1. Recibir invitación de Firebase Authentication');
      console.log('   2. Registrarse con el email configurado');
      console.log('   3. Acceder a todos los módulos de la aplicación');
    } else {
      console.log('\n✓ No se crearon nuevos perfiles (todos ya existían)');
    }
    
    return {
      total: operators.length,
      created,
      skipped,
      errors
    };
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  }
}

// Exportar para uso en la app
export { syncOperators, findProfileByEmail, createProfileForOperator };
