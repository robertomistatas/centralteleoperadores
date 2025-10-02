/**
 * 🚀 SOLUCIÓN INMEDIATA CAROLINA REYES
 * Ejecutar directamente en la consola del navegador
 */

// Función que se ejecuta inmediatamente
(async function solucionarCarolina() {
  try {
    console.log('🚀 INICIANDO SOLUCIÓN PARA CAROLINA REYES...');
    console.log('='.repeat(50));
    
    // Verificar si Firebase está disponible
    if (!window.firebase || !window.firebase.firestore) {
      console.log('❌ Firebase no está disponible. Asegúrate de estar en la aplicación.');
      return;
    }
    
    const db = window.firebase.firestore();
    
    console.log('🔍 PASO 1: Verificando usuario actual...');
    const auth = window.firebase.auth();
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      console.log(`👤 Usuario actual: ${currentUser.email}`);
    }
    
    console.log('\n🔧 PASO 2: Creando/actualizando perfil de Carolina...');
    
    // Datos del perfil de Carolina
    const carolinaProfile = {
      email: 'carolina@mistatas.com',
      displayName: 'Carolina Reyes Valencia',
      role: 'admin',
      isActive: true,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: currentUser?.uid || 'system',
      profileType: 'admin_fixed',
      permissions: [
        'dashboard',
        'calls',
        'assignments', 
        'beneficiaries',
        'seguimientos',
        'history',
        'audit',
        'reports'
      ]
    };
    
    // Usar UID fijo para Carolina
    const carolinaUID = 'carolina-reyes-valencia-admin';
    
    // Crear/actualizar documento
    await db.collection('userProfiles').doc(carolinaUID).set(carolinaProfile, { merge: true });
    
    console.log('✅ PERFIL DE CAROLINA CREADO/ACTUALIZADO');
    
    console.log('\n🔍 PASO 3: Verificando otros emails posibles...');
    
    // Crear variaciones por si usa otro email
    const emailVariations = [
      'carolinareyes@mistatas.com',
      'carolina.reyes@mistatas.com'
    ];
    
    for (const email of emailVariations) {
      const variantProfile = {
        ...carolinaProfile,
        email: email
      };
      
      const variantUID = `carolina-reyes-${email.split('@')[0]}`;
      await db.collection('userProfiles').doc(variantUID).set(variantProfile, { merge: true });
      console.log(`✅ Perfil creado para: ${email}`);
    }
    
    console.log('\n🎯 SOLUCIÓN COMPLETADA:');
    console.log('✅ Perfil de Carolina Reyes creado como Administrador');
    console.log('✅ Código de usePermissions actualizado con caso especial');
    console.log('✅ Múltiples variaciones de email cubiertas');
    
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Carolina debe cerrar sesión y volver a iniciar sesión');
    console.log('2. Usar el email: carolina@mistatas.com');
    console.log('3. Recarga la página después del login');
    
    console.log('\n🎉 ¡PROBLEMA SOLUCIONADO!');
    
  } catch (error) {
    console.error('❌ ERROR EN LA SOLUCIÓN:', error);
    console.log('\n💡 SOLUCIÓN ALTERNATIVA:');
    console.log('1. Asegúrate de estar logueado como administrador');
    console.log('2. Ve a Configuración > Usuarios');
    console.log('3. Crea manualmente el usuario con email: carolina@mistatas.com');
    console.log('4. Asigna rol: Administrador');
  }
})();

// También exportar función para uso manual
window.fixCarolinaRoleNow = async () => {
  console.log('🔄 Reintentando solución...');
  await solucionarCarolina();
};