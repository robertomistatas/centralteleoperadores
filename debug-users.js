/**
 * Script de diagnóstico para el módulo de Configuración de Usuarios
 * Ejecutar en la consola del navegador para debugear el problema
 */

// Función principal de diagnóstico
const diagnoseUserSystem = async () => {
  console.log('🩺 INICIANDO DIAGNÓSTICO DEL SISTEMA DE USUARIOS');
  console.log('=' .repeat(60));
  
  try {
    // 1. Verificar autenticación
    console.log('🔐 1. VERIFICANDO AUTENTICACIÓN...');
    const user = window.firebase?.auth?.currentUser;
    console.log('Usuario autenticado:', user?.email);
    console.log('UID:', user?.uid);
    
    // 2. Verificar permisos
    console.log('\n👑 2. VERIFICANDO PERMISOS...');
    const isSuperAdmin = user?.email === 'roberto@mistatas.com';
    console.log('Es super admin:', isSuperAdmin);
    
    if (!isSuperAdmin) {
      console.log('❌ PROBLEMA: No tienes permisos de super admin');
      console.log('💡 SOLUCIÓN: Inicia sesión con roberto@mistatas.com');
      return;
    }
    
    // 3. Verificar conexión a Firestore
    console.log('\n🔥 3. VERIFICANDO FIRESTORE...');
    
    // Intentar acceso directo a la colección
    const db = window.firebase?.firestore?.();
    if (!db) {
      console.log('❌ PROBLEMA: Firestore no está disponible');
      return;
    }
    
    console.log('✅ Firestore disponible');
    
    // 4. Intentar leer colección userProfiles
    console.log('\n📄 4. LEYENDO COLECCIÓN userProfiles...');
    try {
      const querySnapshot = await db.collection('userProfiles').get();
      console.log('📊 Documentos encontrados:', querySnapshot.size);
      
      if (querySnapshot.size === 0) {
        console.log('⚠️ PROBLEMA: No hay usuarios en la colección userProfiles');
        console.log('💡 POSIBLES CAUSAS:');
        console.log('   - Los usuarios están en Firebase Auth pero no en Firestore');
        console.log('   - La colección tiene otro nombre');
        console.log('   - Los usuarios no se crearon correctamente');
      } else {
        console.log('📋 USUARIOS ENCONTRADOS:');
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`   • ${data.email} (${data.role}) - Activo: ${data.isActive}`);
        });
      }
    } catch (error) {
      console.log('❌ ERROR accediendo a userProfiles:', error.message);
      console.log('💡 Probando con reglas más permisivas...');
    }
    
    // 5. Verificar usuarios en Firebase Auth
    console.log('\n👥 5. VERIFICANDO FIREBASE AUTH...');
    try {
      // Esto requiere permisos especiales, pero podemos ver el usuario actual
      console.log('Usuario en Auth:', user?.email);
      console.log('Metadata:', {
        creationTime: user?.metadata?.creationTime,
        lastSignInTime: user?.metadata?.lastSignInTime
      });
    } catch (error) {
      console.log('❌ ERROR verificando Auth:', error.message);
    }
    
    // 6. Verificar reglas de Firestore
    console.log('\n🛡️ 6. RECOMENDACIONES PARA REGLAS DE FIRESTORE:');
    console.log('Para el super admin, las reglas deberían permitir acceso total:');
    console.log(`
// En firestore.rules
match /userProfiles/{userId} {
  allow read, write, create, update, delete: if request.auth.token.email == 'roberto@mistatas.com';
}
    `);
    
    // 7. Crear usuario de prueba si no existen
    console.log('\n🧪 7. FUNCIÓN DE PRUEBA DISPONIBLE:');
    console.log('Ejecuta createTestUser() para crear un usuario de prueba');
    
  } catch (error) {
    console.error('❌ ERROR GENERAL:', error);
  }
};

// Función para crear usuario de prueba
const createTestUser = async () => {
  console.log('🧪 Creando usuario de prueba...');
  
  try {
    const db = window.firebase?.firestore?.();
    const auth = window.firebase?.auth;
    
    if (!db || !auth) {
      console.log('❌ Firebase no disponible');
      return;
    }
    
    // Crear en Firestore directamente
    const testUserData = {
      uid: 'test-javiera-123',
      email: 'reyesalvarodjaviera@gmail.com',
      displayName: 'Javiera Reyes Alvarado',
      role: 'teleoperadora',
      isActive: true,
      createdAt: new Date(),
      createdBy: auth.currentUser?.uid,
      lastLogin: null
    };
    
    await db.collection('userProfiles').doc('test-javiera-123').set(testUserData);
    console.log('✅ Usuario de prueba creado en Firestore');
    
    // También crear uno para admin
    const adminUserData = {
      uid: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      displayName: 'Roberto Mistatas',
      role: 'super_admin',
      isActive: true,
      createdAt: new Date(),
      createdBy: auth.currentUser?.uid,
      lastLogin: new Date()
    };
    
    await db.collection('userProfiles').doc(auth.currentUser?.uid).set(adminUserData);
    console.log('✅ Perfil de super admin creado');
    
    console.log('🔄 Recarga la página para ver los cambios');
    
  } catch (error) {
    console.error('❌ Error creando usuarios:', error);
  }
};

// Función para limpiar datos de prueba
const cleanTestData = async () => {
  console.log('🧹 Limpiando datos de prueba...');
  
  try {
    const db = window.firebase?.firestore?.();
    await db.collection('userProfiles').doc('test-javiera-123').delete();
    console.log('✅ Datos de prueba eliminados');
  } catch (error) {
    console.error('❌ Error limpiando:', error);
  }
};

// Hacer funciones disponibles globalmente
window.debugUserSystem = {
  diagnose: diagnoseUserSystem,
  createTestUser: createTestUser,
  cleanTestData: cleanTestData
};

// Ejecutar diagnóstico automáticamente
console.log('🛠️ HERRAMIENTAS DE DEBUGGING DISPONIBLES:');
console.log('debugUserSystem.diagnose() - Ejecutar diagnóstico completo');
console.log('debugUserSystem.createTestUser() - Crear usuarios de prueba');
console.log('debugUserSystem.cleanTestData() - Limpiar datos de prueba');
console.log('');
console.log('Ejecutando diagnóstico automático...');
diagnoseUserSystem();