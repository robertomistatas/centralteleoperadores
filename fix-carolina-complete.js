/**
 * 🔧 SOLUCIÓN COMPLETA PARA CAROLINA REYES
 * Este script busca, diagnostica y corrige el problema de roles
 */

console.log('🔧 SOLUCIÓN CAROLINA REYES - Iniciando...');
console.log('='.repeat(60));

// Función principal que hace todo: diagnostica y corrige
window.fixCarolinaRoleComplete = async () => {
  try {
    console.log('🔍 PASO 1: Verificando estado actual...');
    
    // Importar servicios
    const { userManagementService } = await import('./src/services/userManagementService.js');
    
    console.log('\n🔍 PASO 2: Buscando Carolina en base de datos...');
    
    // Buscar por todos los emails posibles
    const possibleEmails = [
      'carolina@mistatas.com',
      'carolina.reyes@mistatas.com', 
      'carolinareyes@mistatas.com',
      'carolina@gmail.com'
    ];
    
    let carolinaProfile = null;
    let foundEmail = null;
    
    for (const email of possibleEmails) {
      console.log(`  🔍 Probando email: ${email}`);
      const profile = await userManagementService.getUserProfileByEmail(email);
      if (profile) {
        carolinaProfile = profile;
        foundEmail = email;
        console.log(`  ✅ ENCONTRADO con email: ${email}`);
        break;
      }
    }
    
    // Si no se encontró, buscar por nombre
    if (!carolinaProfile) {
      console.log('\n🔍 No encontrado por email, buscando por nombre...');
      const allUsers = await userManagementService.getAllUsers();
      
      carolinaProfile = allUsers.find(user => 
        user.displayName?.toLowerCase().includes('carolina') &&
        user.displayName?.toLowerCase().includes('reyes')
      );
      
      if (carolinaProfile) {
        console.log(`  ✅ ENCONTRADO por nombre: ${carolinaProfile.displayName} (${carolinaProfile.email})`);
        foundEmail = carolinaProfile.email;
      }
    }
    
    // PASO 3: Análisis y acción
    if (carolinaProfile) {
      console.log('\n📊 PASO 3: Analizando perfil encontrado...');
      console.log(`  Email: ${foundEmail}`);
      console.log(`  Nombre: ${carolinaProfile.displayName}`);
      console.log(`  Rol actual: ${carolinaProfile.role}`);
      console.log(`  Activo: ${carolinaProfile.isActive}`);
      
      if (carolinaProfile.role === 'admin') {
        console.log('\n✅ PERFIL CORRECTO: Carolina ya tiene rol admin');
        console.log('🤔 El problema puede estar en el email usado para login');
        console.log(`💡 Asegúrate de que Caroline use exactamente: ${foundEmail}`);
        return {
          status: 'ok',
          message: 'Perfil correcto, verificar email de login',
          email: foundEmail,
          profile: carolinaProfile
        };
      } else {
        console.log('\n🔧 PASO 4: Corrigiendo rol...');
        await userManagementService.updateUser(carolinaProfile.id, {
          role: 'admin'
        });
        console.log('✅ ROL ACTUALIZADO A ADMIN');
        return {
          status: 'fixed',
          message: 'Rol corregido exitosamente',
          email: foundEmail,
          profile: { ...carolinaProfile, role: 'admin' }
        };
      }
    } else {
      console.log('\n❌ PASO 3: NO SE ENCONTRÓ PERFIL PARA CAROLINA');
      console.log('🔧 PASO 4: Creando perfil...');
      
      // Crear perfil nuevo
      const newUserData = {
        email: 'carolina@mistatas.com',
        displayName: 'Carolina Reyes Valencia',
        role: 'admin',
        isActive: true
      };
      
      const newProfile = await userManagementService.createUser(newUserData);
      console.log('✅ PERFIL CREADO EXITOSAMENTE');
      
      return {
        status: 'created',
        message: 'Perfil creado exitosamente',
        email: newUserData.email,
        profile: newProfile
      };
    }
    
  } catch (error) {
    console.error('❌ ERROR EN LA SOLUCIÓN:', error);
    return {
      status: 'error',
      message: error.message,
      error
    };
  }
};

// Función para verificar el login actual
window.checkCurrentLogin = async () => {
  try {
    console.log('🔍 VERIFICANDO LOGIN ACTUAL...');
    
    const auth = window.firebase?.auth?.();
    const currentUser = auth?.currentUser;
    
    if (!currentUser) {
      console.log('❌ No hay usuario logueado');
      return null;
    }
    
    console.log('👤 Usuario actual:', {
      email: currentUser.email,
      displayName: currentUser.displayName,
      uid: currentUser.uid
    });
    
    // Verificar perfil en Firestore
    const { userManagementService } = await import('./src/services/userManagementService.js');
    const profile = await userManagementService.getUserProfileByEmail(currentUser.email);
    
    console.log('📄 Perfil en Firestore:', profile);
    
    return {
      auth: currentUser,
      profile
    };
    
  } catch (error) {
    console.error('❌ Error verificando login:', error);
    return null;
  }
};

console.log('\n🎯 FUNCIONES DISPONIBLES:');
console.log('• window.fixCarolinaRoleComplete() - Diagnóstica y corrige todo automáticamente');
console.log('• window.checkCurrentLogin() - Verifica el usuario actual y su perfil');
console.log('\n📋 INSTRUCCIONES:');
console.log('1. Ejecuta window.fixCarolinaRoleComplete() para solucionar el problema');
console.log('2. Si Carolina está logueada, ejecuta window.checkCurrentLogin() para verificar');
console.log('3. Recarga la página después de cualquier cambio');