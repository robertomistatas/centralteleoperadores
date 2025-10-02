/**
 * 🔍 SCRIPT DE DIAGNÓSTICO PARA CAROLINA REYES
 * Investiga por qué Carolina aparece como Teleoperadora cuando debería ser Administrador
 */

console.log('🕵️ DIAGNÓSTICO CAROLINA REYES - Iniciando investigación...');
console.log('='.repeat(70));

// Función principal de diagnóstico
window.debugCarolinaProfile = async () => {
  try {
    console.log('🔍 1. VERIFICANDO AUTENTICACIÓN ACTUAL...');
    
    // Verificar usuario autenticado
    const auth = window.firebase?.auth?.();
    const currentUser = auth?.currentUser;
    
    console.log('👤 Usuario autenticado:', {
      email: currentUser?.email,
      uid: currentUser?.uid,
      displayName: currentUser?.displayName
    });
    
    if (!currentUser) {
      console.log('❌ No hay usuario autenticado. Inicia sesión para continuar.');
      return;
    }
    
    console.log('\n📚 2. VERIFICANDO SERVICIO DE USUARIOS...');
    
    // Importar servicio
    const { userManagementService } = await import('./src/services/userManagementService.js');
    
    console.log('✅ Servicio importado correctamente');
    
    console.log('\n🔍 3. BUSCANDO PERFIL DE CAROLINA EN FIRESTORE...');
    
    // Buscar Carolina por email
    const carolinaProfile = await userManagementService.getUserProfileByEmail('carolina@mistatas.com');
    
    console.log('📄 Resultado búsqueda Carolina:', carolinaProfile);
    
    if (!carolinaProfile) {
      console.log('❌ NO SE ENCONTRÓ PERFIL PARA CAROLINA');
      console.log('💡 Esto explica por qué aparece como teleoperadora (rol por defecto)');
      
      // Verificar si hay variaciones del email
      console.log('\n🔍 Buscando variaciones del email...');
      const allUsers = await userManagementService.getAllUsers();
      console.log('👥 Total usuarios en sistema:', allUsers.length);
      
      const carolinaVariations = allUsers.filter(user => 
        user.email?.toLowerCase().includes('carolina') ||
        user.displayName?.toLowerCase().includes('carolina')
      );
      
      console.log('🔍 Usuarios con "carolina" en el nombre/email:', carolinaVariations);
      
      return {
        found: false,
        variations: carolinaVariations,
        allUsers: allUsers.map(u => ({ email: u.email, role: u.role, displayName: u.displayName }))
      };
    }
    
    console.log('\n✅ 4. PERFIL ENCONTRADO - ANALIZANDO DATOS...');
    
    console.log('📊 Datos del perfil:', {
      id: carolinaProfile.id,
      email: carolinaProfile.email,
      displayName: carolinaProfile.displayName,
      role: carolinaProfile.role,
      isActive: carolinaProfile.isActive,
      createdAt: carolinaProfile.createdAt,
      createdBy: carolinaProfile.createdBy
    });
    
    console.log('\n🔍 5. VERIFICANDO LÓGICA DE USEPERMINSSIONS...');
    
    // Simular la lógica de usePermissions
    if (carolinaProfile.role === 'admin') {
      console.log('✅ PERFIL CORRECTO: Carolina tiene rol "admin"');
      console.log('🤔 El problema debe estar en la aplicación del rol durante el login');
    } else {
      console.log('❌ PROBLEMA ENCONTRADO: Carolina NO tiene rol admin');
      console.log(`🎯 Rol actual: ${carolinaProfile.role}`);
      console.log('🔧 SOLUCIÓN: Actualizar el rol a "admin"');
    }
    
    return {
      found: true,
      profile: carolinaProfile,
      diagnosis: carolinaProfile.role === 'admin' ? 'Rol correcto, problema en aplicación' : 'Rol incorrecto en BD'
    };
    
  } catch (error) {
    console.error('❌ ERROR EN DIAGNÓSTICO:', error);
    return { error: error.message };
  }
};

// Función para corregir el rol de Carolina
window.fixCarolinaRole = async () => {
  try {
    console.log('🔧 CORRIGIENDO ROL DE CAROLINA...');
    
    const { userManagementService } = await import('./src/services/userManagementService.js');
    
    // Buscar Carolina
    const carolinaProfile = await userManagementService.getUserProfileByEmail('carolina@mistatas.com');
    
    if (!carolinaProfile) {
      console.log('❌ No se encontró perfil de Carolina para corregir');
      return false;
    }
    
    // Actualizar a admin
    await userManagementService.updateUser(carolinaProfile.id, {
      role: 'admin'
    });
    
    console.log('✅ ROL CORREGIDO: Carolina ahora es administrador');
    console.log('🔄 Recarga la página para ver los cambios');
    
    return true;
    
  } catch (error) {
    console.error('❌ ERROR CORRIGIENDO ROL:', error);
    return false;
  }
};

console.log('\n🎯 FUNCIONES DISPONIBLES:');
console.log('• window.debugCarolinaProfile() - Diagnostica el problema');
console.log('• window.fixCarolinaRole() - Corrige el rol a admin');
console.log('\nEjecuta estas funciones en la consola del navegador.');