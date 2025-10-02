/**
 * 🧪 SCRIPT DE PRUEBA RÁPIDA - CAROLINA ADMIN
 * Ejecutar en consola para verificar si los cambios funcionan
 */

// Función para probar el estado actual del usuario
window.testCarolinaAdmin = () => {
  console.log('🧪 PROBANDO ESTADO DE CAROLINA COMO ADMIN...');
  console.log('='.repeat(50));
  
  // Verificar datos de Auth
  const auth = window.firebase?.auth?.();
  const currentUser = auth?.currentUser;
  
  console.log('👤 DATOS DE AUTENTICACIÓN:');
  console.log('  Email:', currentUser?.email);
  console.log('  UID:', currentUser?.uid);
  console.log('  DisplayName:', currentUser?.displayName);
  
  // Verificar permisos calculados
  console.log('\n🔒 PROBANDO LÓGICA DE PERMISOS:');
  
  // Simular la lógica de usePermissions
  if (currentUser?.email === 'roberto@mistatas.com') {
    console.log('✅ Detectado como SUPER ADMIN');
  } else if (currentUser?.email?.toLowerCase() === 'carolina@mistatas.com') {
    console.log('✅ Detectado como CAROLINA (ADMIN)');
  } else {
    console.log('⚠️ No detectado como admin especial, consultaría Firestore');
  }
  
  // Verificar si los hooks están funcionando
  console.log('\n🔍 ESTADO ACTUAL DE LA APP:');
  
  try {
    // Intentar acceder al estado de React (si está disponible)
    if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
      console.log('⚠️ Esto requiere acceso a React DevTools');
    }
  } catch (error) {
    console.log('ℹ️ No se puede acceder al estado de React desde consola');
  }
  
  console.log('\n📋 PASOS PARA VERIFICAR:');
  console.log('1. Abre React DevTools');
  console.log('2. Busca componente TeleoperadoraDashboard');
  console.log('3. Verifica que isAdmin = true');
  console.log('4. Verifica que user.role = "admin"');
  
  return {
    currentUser: currentUser ? {
      email: currentUser.email,
      uid: currentUser.uid,
      displayName: currentUser.displayName
    } : null,
    shouldBeAdmin: currentUser?.email?.toLowerCase() === 'carolina@mistatas.com'
  };
};

console.log('🎯 FUNCIÓN DISPONIBLE: window.testCarolinaAdmin()');
console.log('📋 Ejecuta esta función para verificar el estado actual');
console.log('💡 Luego verifica que las métricas aparezcan correctamente');