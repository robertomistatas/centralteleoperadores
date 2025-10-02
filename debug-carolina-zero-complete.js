/**
 * 🚨 DIAGNÓSTICO CRÍTICO - CAROLINA DATOS CERO
 * Ejecutar en consola del navegador con Carolina logueada
 */

window.debugCarolinaZeroData = async () => {
  console.log('🚨 DIAGNÓSTICO CRÍTICO: ¿Por qué Caroline ve ceros?');
  console.log('='.repeat(60));
  
  try {
    // 1. VERIFICAR USUARIO ACTUAL
    console.log('👤 1. VERIFICANDO USUARIO ACTUAL...');
    const auth = window.firebase?.auth?.();
    const currentUser = auth?.currentUser;
    
    console.log('Usuario:', {
      email: currentUser?.email,
      uid: currentUser?.uid,
      displayName: currentUser?.displayName
    });
    
    // 2. VERIFICAR SISTEMA DE PERMISOS
    console.log('\n🔒 2. PROBANDO SISTEMA DE PERMISOS...');
    
    // Simular lógica de usePermissions
    let shouldBeAdmin = false;
    if (currentUser?.email === 'roberto@mistatas.com') {
      shouldBeAdmin = 'super_admin';
      console.log('✅ Debería ser SUPER ADMIN');
    } else if (currentUser?.email?.toLowerCase() === 'carolina@mistatas.com') {
      shouldBeAdmin = 'admin';
      console.log('✅ Debería ser ADMIN (Carolina)');
    } else {
      console.log('⚠️ No es admin especial, buscaría en Firestore');
    }
    
    // 3. VERIFICAR DATOS DIRECTOS EN FIREBASE
    console.log('\n🔥 3. CONSULTANDO FIREBASE DIRECTAMENTE...');
    
    const db = window.firebase?.firestore?.();
    if (!db) {
      console.log('❌ Firebase no disponible');
      return;
    }
    
    // Contar operadores
    const operatorsSnapshot = await db.collection('operators').get();
    console.log(`👥 Operadores en Firebase: ${operatorsSnapshot.size}`);
    
    // Contar asignaciones
    const assignmentsSnapshot = await db.collection('assignments').get();
    console.log(`📋 Grupos de asignaciones: ${assignmentsSnapshot.size}`);
    
    // Contar asignaciones individuales
    let totalIndividualAssignments = 0;
    assignmentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.assignments && Array.isArray(data.assignments)) {
        totalIndividualAssignments += data.assignments.length;
      }
    });
    console.log(`📊 Total asignaciones individuales: ${totalIndividualAssignments}`);
    
    // 4. PROBAR SERVICIOS DIRECTAMENTE
    console.log('\n🛠️ 4. PROBANDO SERVICIOS...');
    
    try {
      // Importar servicios
      const module = await import('./src/firestoreService.js');
      const { operatorService, assignmentService } = module;
      
      console.log('✅ Servicios importados correctamente');
      
      // Probar getAll() para operadores
      const allOperators = await operatorService.getAll();
      console.log(`👥 operatorService.getAll(): ${allOperators?.length || 0} operadores`);
      
      // Probar getAll() para asignaciones
      const allAssignments = await assignmentService.getAll();
      console.log(`📋 assignmentService.getAll(): ${allAssignments?.length || 0} asignaciones`);
      
      if (allOperators && allOperators.length > 0) {
        console.log('\n👥 EJEMPLO DE OPERADORES:');
        allOperators.slice(0, 3).forEach((op, index) => {
          console.log(`  ${index + 1}. ${op.name} (${op.email})`);
        });
      }
      
      if (allAssignments && allAssignments.length > 0) {
        console.log('\n📋 EJEMPLO DE ASIGNACIONES:');
        allAssignments.slice(0, 3).forEach((assign, index) => {
          console.log(`  ${index + 1}. ${assign.name} -> ${assign.operatorId}`);
        });
      }
      
    } catch (error) {
      console.log('❌ Error importando servicios:', error.message);
    }
    
    // 5. VERIFICAR SI HAY DATOS EN EL DOM
    console.log('\n🔍 5. VERIFICANDO DATOS EN LA INTERFAZ...');
    
    // Buscar elementos que muestren números
    const numberElements = document.querySelectorAll('[class*="text-"]:not([class*="text-gray"]):not([class*="text-white"])');
    const numbersFound = [];
    
    numberElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && /^\d+$/.test(text) && text !== '0') {
        numbersFound.push(text);
      }
    });
    
    console.log('🔢 Números no-cero encontrados en DOM:', numbersFound.length > 0 ? numbersFound : 'Solo ceros');
    
    // 6. VERIFICAR STORES DE LA APLICACIÓN
    console.log('\n📦 6. INTENTANDO ACCEDER A STORES...');
    
    // Buscar stores en window
    const storeKeys = Object.keys(window).filter(key => key.includes('store') || key.includes('Store'));
    console.log('🗃️ Posibles stores en window:', storeKeys);
    
    // 7. VERIFICAR ERRORES EN CONSOLA
    console.log('\n⚠️ 7. BUSCANDO ERRORES RECIENTES...');
    console.log('💡 Revisa la consola para ver si hay errores de Firebase, permisos o servicios');
    
    // 8. RESUMEN Y RECOMENDACIONES
    console.log('\n📋 8. RESUMEN DEL DIAGNÓSTICO:');
    
    const summary = {
      usuario: currentUser?.email,
      deberiaSerAdmin: shouldBeAdmin,
      operadoresEnFirebase: operatorsSnapshot.size,
      asignacionesEnFirebase: totalIndividualAssignments,
      serviciosDisponibles: '✅',
      problemaPosible: []
    };
    
    if (operatorsSnapshot.size === 0) {
      summary.problemaPosible.push('❌ No hay operadores en Firebase');
    }
    
    if (totalIndividualAssignments === 0) {
      summary.problemaPosible.push('❌ No hay asignaciones en Firebase');
    }
    
    if (summary.problemaPosible.length === 0) {
      summary.problemaPosible.push('🤔 Datos existen en Firebase, problema en carga o visualización');
    }
    
    console.table(summary);
    
    return {
      firebase: {
        operators: operatorsSnapshot.size,
        assignments: totalIndividualAssignments
      },
      user: currentUser?.email,
      shouldBeAdmin: shouldBeAdmin
    };
    
  } catch (error) {
    console.error('❌ ERROR EN DIAGNÓSTICO:', error);
    return { error: error.message };
  }
};

// Función para verificar específicamente la lógica de carga
window.testCarolinaDataLoading = async () => {
  console.log('🔄 TESTING LÓGICA DE CARGA DE DATOS...');
  
  try {
    // Simular la lógica del App.jsx
    const auth = window.firebase?.auth?.();
    const currentUser = auth?.currentUser;
    
    // Simular userProfile que vendría de usePermissions
    const simulatedUserProfile = {
      email: currentUser?.email,
      role: currentUser?.email?.toLowerCase() === 'carolina@mistatas.com' ? 'admin' : 'teleoperadora'
    };
    
    console.log('👤 Usuario simulado:', simulatedUserProfile);
    
    // Simular lógica de isAdminUser
    const isAdminUser = simulatedUserProfile?.role === 'admin' || 
                        simulatedUserProfile?.role === 'super_admin' || 
                        simulatedUserProfile?.email === 'roberto@mistatas.com' || 
                        simulatedUserProfile?.email === 'carolina@mistatas.com';
    
    console.log('🔍 Es admin según lógica:', isAdminUser);
    
    if (isAdminUser) {
      console.log('👑 DEBERÍA cargar datos del sistema completo');
      
      // Probar carga como admin
      const { operatorService, assignmentService } = await import('./src/firestoreService.js');
      
      const operators = await operatorService.getAll();
      const assignments = await assignmentService.getAll();
      
      console.log('📊 Datos que debería ver Caroline:');
      console.log(`  - Operadores: ${operators?.length || 0}`);
      console.log(`  - Asignaciones: ${assignments?.length || 0}`);
      
      return { operators: operators?.length || 0, assignments: assignments?.length || 0 };
    } else {
      console.log('👤 DEBERÍA cargar solo datos del usuario');
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error);
    return { error: error.message };
  }
};

console.log('🎯 FUNCIONES DE DIAGNÓSTICO DISPONIBLES:');
console.log('• window.debugCarolinaZeroData() - Diagnóstico completo');
console.log('• window.testCarolinaDataLoading() - Test de lógica de carga');
console.log('');
console.log('📋 INSTRUCCIONES:');
console.log('1. Asegúrate de estar logueado como Carolina');
console.log('2. Ejecuta window.debugCarolinaZeroData()');
console.log('3. Copia y pega TODOS los resultados aquí');