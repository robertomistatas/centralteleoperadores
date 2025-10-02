/**
 * DIAGNÓSTICO EXHAUSTIVO DEL SISTEMA DE ROLES
 * Identifica problemas en la lógica de permisos y carga de datos
 */

window.diagnosticoSistemaRoles = async function() {
  console.log('🔍 INICIANDO DIAGNÓSTICO EXHAUSTIVO DEL SISTEMA DE ROLES');
  console.log('===========================================================');
  
  const diagnostico = {
    timestamp: new Date().toISOString(),
    usuario: null,
    permisos: null,
    datos: null,
    servicios: null,
    errores: []
  };
  
  try {
    // 1. VERIFICAR USUARIO ACTUAL
    console.log('\n1️⃣ VERIFICANDO USUARIO AUTENTICADO...');
    const auth = window.firebase?.auth();
    const currentUser = auth?.currentUser;
    
    if (!currentUser) {
      diagnostico.errores.push('No hay usuario autenticado');
      console.error('❌ NO HAY USUARIO AUTENTICADO');
      return diagnostico;
    }
    
    diagnostico.usuario = {
      email: currentUser.email,
      uid: currentUser.uid,
      displayName: currentUser.displayName
    };
    
    console.log('✅ Usuario autenticado:', diagnostico.usuario);
    
    // 2. VERIFICAR HOOK DE PERMISOS
    console.log('\n2️⃣ VERIFICANDO HOOK DE PERMISOS...');
    
    // Intentar acceder al hook de permisos de forma indirecta
    let permissionsResult = null;
    try {
      // Buscar en el DOM elementos que puedan indicar el rol
      const rolElement = document.querySelector('[class*="rol"], [class*="role"]') || 
                        document.querySelector('*:contains("Super Administrador")') ||
                        document.querySelector('*:contains("Administrador")');
      
      if (rolElement) {
        console.log('🎯 Elemento de rol encontrado en DOM:', rolElement.textContent);
      }
      
      // Verificar localStorage para datos de sesión
      const localStorageData = {};
      for (let key in localStorage) {
        if (key.includes('user') || key.includes('role') || key.includes('auth')) {
          localStorageData[key] = localStorage.getItem(key);
        }
      }
      
      console.log('💾 Datos relevantes en localStorage:', localStorageData);
      
    } catch (error) {
      diagnostico.errores.push(`Error verificando permisos: ${error.message}`);
    }
    
    // 3. VERIFICAR STORES DE ZUSTAND
    console.log('\n3️⃣ VERIFICANDO STORES DE ZUSTAND...');
    
    const storeStatus = {};
    
    if (window.useAppStore) {
      const appState = window.useAppStore.getState();
      storeStatus.app = {
        operators: appState.operators?.length || 0,
        operatorAssignments: Object.keys(appState.operatorAssignments || {}).length,
        hasSetters: !!(appState.setOperators && appState.setOperatorAssignments),
        totalAssignments: Object.values(appState.operatorAssignments || {}).flat().length
      };
    }
    
    if (window.useCallStore) {
      const callState = window.useCallStore.getState();
      storeStatus.call = {
        callData: callState.callData?.length || 0,
        hasSetters: !!callState.setCallData
      };
    }
    
    if (window.useUserManagementStore) {
      const userState = window.useUserManagementStore.getState();
      storeStatus.userManagement = {
        users: userState.users?.length || 0,
        roles: userState.roles?.length || 0,
        currentUser: !!userState.currentUser
      };
    }
    
    diagnostico.datos = storeStatus;
    console.log('📊 Estado de stores:', storeStatus);
    
    // 4. PROBAR SERVICIOS FIREBASE DIRECTAMENTE
    console.log('\n4️⃣ PROBANDO SERVICIOS FIREBASE...');
    
    const serviciosTest = {};
    const db = window.firebase?.firestore();
    
    if (!db) {
      diagnostico.errores.push('Firestore no disponible');
      console.error('❌ Firestore no disponible');
    } else {
      console.log('✅ Firestore disponible');
      
      try {
        // Test operadores
        console.log('📡 Probando lectura de operadores...');
        const operatorsSnapshot = await db.collection('operators').limit(5).get();
        serviciosTest.operators = {
          total: operatorsSnapshot.size,
          exists: operatorsSnapshot.size > 0,
          sample: operatorsSnapshot.docs.slice(0, 2).map(doc => ({
            id: doc.id,
            data: doc.data()
          }))
        };
        
        // Test asignaciones
        console.log('📡 Probando lectura de asignaciones...');
        const assignmentsSnapshot = await db.collection('assignments').limit(5).get();
        serviciosTest.assignments = {
          total: assignmentsSnapshot.size,
          exists: assignmentsSnapshot.size > 0,
          sample: assignmentsSnapshot.docs.slice(0, 2).map(doc => ({
            id: doc.id,
            data: doc.data()
          }))
        };
        
        // Test usuarios
        console.log('📡 Probando lectura de usuarios...');
        const usersSnapshot = await db.collection('users').limit(3).get();
        serviciosTest.users = {
          total: usersSnapshot.size,
          exists: usersSnapshot.size > 0,
          sample: usersSnapshot.docs.map(doc => ({
            id: doc.id,
            email: doc.data().email,
            role: doc.data().role
          }))
        };
        
        // Buscar perfil específico del usuario actual
        console.log('🔍 Buscando perfil del usuario actual...');
        const userProfileQuery = await db.collection('users')
          .where('email', '==', currentUser.email)
          .get();
        
        serviciosTest.currentUserProfile = {
          found: userProfileQuery.size > 0,
          data: userProfileQuery.size > 0 ? userProfileQuery.docs[0].data() : null
        };
        
      } catch (error) {
        diagnostico.errores.push(`Error en servicios Firebase: ${error.message}`);
        console.error('❌ Error probando servicios:', error);
      }
    }
    
    diagnostico.servicios = serviciosTest;
    console.log('🧪 Resultado test servicios:', serviciosTest);
    
    // 5. VERIFICAR LÓGICA DE ROLES ESPECÍFICA
    console.log('\n5️⃣ VERIFICANDO LÓGICA DE ROLES...');
    
    const roleLogicTest = {
      email: currentUser.email,
      isRoberto: currentUser.email === 'roberto@mistatas.com',
      isCarolina: currentUser.email?.toLowerCase() === 'carolina@mistatas.com',
      shouldBeAdmin: ['roberto@mistatas.com', 'carolina@mistatas.com'].includes(currentUser.email?.toLowerCase())
    };
    
    console.log('🎯 Lógica de roles:', roleLogicTest);
    
    // 6. SIMULAR CARGA DE DATOS COMO ADMIN
    console.log('\n6️⃣ SIMULANDO CARGA DE DATOS COMO ADMIN...');
    
    if (roleLogicTest.shouldBeAdmin && db) {
      try {
        console.log('👑 Usuario debería ser admin - simulando carga de datos...');
        
        const [allOperators, allAssignments] = await Promise.all([
          db.collection('operators').get(),
          db.collection('assignments').get()
        ]);
        
        const simulatedAdminData = {
          operators: allOperators.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          assignments: {}
        };
        
        // Agrupar asignaciones
        allAssignments.forEach(doc => {
          const assignment = { id: doc.id, ...doc.data() };
          const operatorId = assignment.operatorId;
          if (!simulatedAdminData.assignments[operatorId]) {
            simulatedAdminData.assignments[operatorId] = [];
          }
          simulatedAdminData.assignments[operatorId].push(assignment);
        });
        
        console.log('📊 Datos que debería ver como admin:', {
          operadores: simulatedAdminData.operators.length,
          operadoresConAsignaciones: Object.keys(simulatedAdminData.assignments).length,
          totalAsignaciones: allAssignments.size
        });
        
        diagnostico.datosEsperados = {
          operators: simulatedAdminData.operators.length,
          assignments: Object.keys(simulatedAdminData.assignments).length,
          totalAssignments: allAssignments.size
        };
        
      } catch (error) {
        diagnostico.errores.push(`Error simulando datos admin: ${error.message}`);
      }
    }
    
    // 7. ANÁLISIS Y RECOMENDACIONES
    console.log('\n7️⃣ ANÁLISIS Y RECOMENDACIONES...');
    
    const analysis = {
      problemas: [],
      recomendaciones: []
    };
    
    // Analizar datos vs esperados
    if (diagnostico.datosEsperados && diagnostico.datos?.app) {
      if (diagnostico.datos.app.operators === 0 && diagnostico.datosEsperados.operators > 0) {
        analysis.problemas.push('Store de operadores vacío pero Firebase tiene datos');
        analysis.recomendaciones.push('Problema en loadUserData o servicios');
      }
      
      if (diagnostico.datos.app.operatorAssignments === 0 && diagnostico.datosEsperados.assignments > 0) {
        analysis.problemas.push('Store de asignaciones vacío pero Firebase tiene datos');
        analysis.recomendaciones.push('Problema en loadUserData o servicios');
      }
    }
    
    // Analizar perfil de usuario
    if (roleLogicTest.shouldBeAdmin && (!diagnostico.servicios?.currentUserProfile?.found)) {
      analysis.problemas.push('Usuario admin sin perfil en Firestore');
      analysis.recomendaciones.push('Crear perfil en colección users o ajustar lógica de usePermissions');
    }
    
    diagnostico.analysis = analysis;
    
    console.log('📋 Problemas identificados:', analysis.problemas);
    console.log('💡 Recomendaciones:', analysis.recomendaciones);
    
  } catch (error) {
    diagnostico.errores.push(`Error general: ${error.message}`);
    console.error('❌ Error en diagnóstico:', error);
  }
  
  console.log('\n===========================================================');
  console.log('🎯 DIAGNÓSTICO COMPLETADO');
  console.log('📊 Resultado completo disponible en return value');
  
  return diagnostico;
};

// Auto-ejecutar si hay usuario logueado
setTimeout(() => {
  if (window.firebase?.auth?.()?.currentUser) {
    console.log('🎯 Usuario detectado - ejecutar window.diagnosticoSistemaRoles() para análisis completo');
  }
}, 1000);