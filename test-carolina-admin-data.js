/**
 * 🧪 SCRIPT DE TESTING - DATOS ADMIN CAROLINA
 * Ejecutar en consola del navegador después del login de Carolina
 */

window.testCarolinaAdminData = async () => {
  console.log('🧪 TESTING DATOS ADMIN CAROLINA');
  console.log('='.repeat(50));
  
  try {
    // 1. Verificar estado de permisos
    console.log('🔒 1. VERIFICANDO PERMISOS...');
    
    const auth = window.firebase?.auth?.();
    const currentUser = auth?.currentUser;
    
    console.log('👤 Usuario actual:', {
      email: currentUser?.email,
      uid: currentUser?.uid
    });
    
    // 2. Verificar stores de datos
    console.log('\n📊 2. VERIFICANDO STORES DE DATOS...');
    
    // Verificar Zustand stores si están disponibles globalmente
    try {
      // Verificar store de la app
      if (window.useAppStore) {
        const appState = window.useAppStore.getState();
        console.log('📦 AppStore:', {
          operators: appState.operators?.length || 0,
          assignmentGroups: Object.keys(appState.operatorAssignments || {}).length,
          totalAssignments: Object.values(appState.operatorAssignments || {}).flat().length
        });
      }
      
      // Verificar store de llamadas
      if (window.useCallStore) {
        const callState = window.useCallStore.getState();
        console.log('📞 CallStore:', {
          callData: callState.callData?.length || 0,
          hasData: callState.hasData,
          isLoading: callState.isLoading
        });
      }
    } catch (error) {
      console.log('⚠️ No se pueden acceder stores desde consola');
    }
    
    // 3. Verificar datos en Firebase directamente
    console.log('\n🔥 3. VERIFICANDO FIREBASE DIRECTO...');
    
    const db = window.firebase?.firestore?.();
    if (db) {
      // Verificar operadores
      const operatorsSnapshot = await db.collection('operators').get();
      console.log('👥 Operadores en Firebase:', operatorsSnapshot.size);
      
      // Verificar asignaciones
      const assignmentsSnapshot = await db.collection('assignments').get();
      console.log('📋 Grupos de asignaciones en Firebase:', assignmentsSnapshot.size);
      
      // Contar total de asignaciones
      let totalAssignments = 0;
      assignmentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.assignments && Array.isArray(data.assignments)) {
          totalAssignments += data.assignments.length;
        }
      });
      console.log('📊 Total asignaciones individuales:', totalAssignments);
      
      // Mostrar algunos ejemplos
      if (operatorsSnapshot.size > 0) {
        console.log('\n👥 EJEMPLO DE OPERADORES:');
        operatorsSnapshot.docs.slice(0, 3).forEach(doc => {
          const data = doc.data();
          console.log(`  - ${data.name} (${data.email})`);
        });
      }
      
      if (assignmentsSnapshot.size > 0) {
        console.log('\n📋 EJEMPLO DE ASIGNACIONES:');
        const firstAssignment = assignmentsSnapshot.docs[0];
        const data = firstAssignment.data();
        console.log(`  - Operador: ${data.operatorId}`);
        console.log(`  - Asignaciones: ${data.assignments?.length || 0}`);
        if (data.assignments && data.assignments.length > 0) {
          console.log(`  - Primer beneficiario: ${data.assignments[0].name}`);
        }
      }
    }
    
    // 4. Simular carga de dashboard
    console.log('\n🎯 4. SIMULANDO CARGA DE DASHBOARD...');
    
    // Importar servicios si están disponibles
    try {
      const { operatorService, assignmentService } = await import('./src/firestoreService.js');
      
      const operators = await operatorService.getAll();
      const assignments = await assignmentService.getAll();
      
      console.log('✅ Datos cargados via servicios:', {
        operators: operators?.length || 0,
        assignments: assignments?.length || 0
      });
      
      return {
        success: true,
        data: {
          operators: operators?.length || 0,
          assignments: assignments?.length || 0,
          firebase: {
            operators: operatorsSnapshot?.size || 0,
            assignmentGroups: assignmentsSnapshot?.size || 0,
            totalAssignments: totalAssignments
          }
        }
      };
      
    } catch (error) {
      console.log('⚠️ Error importando servicios:', error.message);
    }
    
  } catch (error) {
    console.error('❌ ERROR EN TEST:', error);
    return { success: false, error: error.message };
  }
};

// Función simplificada para verificar si Caroline es admin
window.testCarolinaAdmin = () => {
  const auth = window.firebase?.auth?.();
  const currentUser = auth?.currentUser;
  
  console.log('🔍 VERIFICACIÓN RÁPIDA CAROLINA ADMIN:');
  console.log('Email:', currentUser?.email);
  console.log('Es Carolina:', currentUser?.email?.toLowerCase() === 'carolina@mistatas.com');
  
  return {
    email: currentUser?.email,
    isCarolina: currentUser?.email?.toLowerCase() === 'carolina@mistatas.com'
  };
};

console.log('🎯 FUNCIONES DISPONIBLES:');
console.log('• window.testCarolinaAdminData() - Test completo de datos');
console.log('• window.testCarolinaAdmin() - Verificación rápida');
console.log('\n📋 INSTRUCCIONES:');
console.log('1. Asegúrate de estar logueado como Carolina');
console.log('2. Ejecuta window.testCarolinaAdminData()');
console.log('3. Verifica que los números no sean 0');