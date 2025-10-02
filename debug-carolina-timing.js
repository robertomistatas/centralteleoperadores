/**
 * DEBUG CRÍTICO: Análisis de timing y flujo de datos para Carolina
 * Verificar si el problema es de timing entre autenticación, permisos y carga de datos
 */

window.debugCarolinaTiming = async function() {
  console.log('🚨 INICIANDO DIAGNÓSTICO DE TIMING PARA CAROLINA');
  console.log('============================================');
  
  // 1. VERIFICAR ESTADO DE AUTENTICACIÓN
  console.log('\n1️⃣ VERIFICANDO AUTENTICACIÓN...');
  try {
    const auth = window.firebase?.auth ? window.firebase.auth() : null;
    const currentUser = auth?.currentUser;
    
    console.log('Firebase Auth disponible:', !!auth);
    console.log('Usuario actual:', {
      email: currentUser?.email,
      uid: currentUser?.uid,
      displayName: currentUser?.displayName
    });
    
    if (!currentUser) {
      console.error('❌ NO HAY USUARIO AUTENTICADO');
      return;
    }
  } catch (error) {
    console.error('Error verificando autenticación:', error);
  }
  
  // 2. VERIFICAR HOOK DE PERMISOS
  console.log('\n2️⃣ VERIFICANDO HOOK DE PERMISOS...');
  const testPermissions = () => {
    // Buscar el hook de permisos en el componente actual
    const permissionsData = window.React?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentOwner?.current;
    console.log('Hook de permisos encontrado:', !!permissionsData);
    
    // Verificar si está usando usePermissions
    const permissionsHook = window.usePermissions;
    if (permissionsHook) {
      const result = permissionsHook();
      console.log('usePermissions result:', result);
    }
  };
  
  testPermissions();
  
  // 3. VERIFICAR STORES DE ZUSTAND
  console.log('\n3️⃣ VERIFICANDO STORES DE ZUSTAND...');
  
  // Función para buscar stores en el window
  const findStores = () => {
    const stores = {};
    
    // Buscar store de app
    if (window.useAppStore) {
      const appState = window.useAppStore.getState();
      stores.app = {
        operators: appState.operators?.length || 0,
        assignments: Object.keys(appState.operatorAssignments || {}).length,
        hasSetters: !!(appState.setOperators && appState.setOperatorAssignments)
      };
    }
    
    // Buscar store de user management
    if (window.useUserManagementStore) {
      const userState = window.useUserManagementStore.getState();
      stores.userManagement = {
        users: userState.users?.length || 0,
        roles: userState.roles?.length || 0,
        currentUser: !!userState.currentUser
      };
    }
    
    return stores;
  };
  
  const storeStates = findStores();
  console.log('Estados de stores:', storeStates);
  
  // 4. VERIFICAR SERVICIOS FIREBASE
  console.log('\n4️⃣ VERIFICANDO SERVICIOS FIREBASE...');
  
  const testFirebaseServices = async () => {
    try {
      // Verificar si Firestore está disponible
      const db = window.firebase?.firestore();
      if (!db) {
        console.error('❌ Firestore no disponible');
        return;
      }
      
      console.log('✅ Firestore disponible');
      
      // Test de lectura de operadores
      console.log('Probando lectura de operadores...');
      const operatorsSnapshot = await db.collection('operators').limit(1).get();
      console.log('Operadores encontrados:', operatorsSnapshot.size);
      
      // Test de lectura de asignaciones
      console.log('Probando lectura de asignaciones...');
      const assignmentsSnapshot = await db.collection('assignments').limit(1).get();
      console.log('Asignaciones encontradas:', assignmentsSnapshot.size);
      
      // Test específico para Carolina
      console.log('Probando lectura específica para Carolina...');
      const carolinaProfile = await db.collection('users').where('email', '==', 'carolina@mistatas.com').get();
      console.log('Perfil de Carolina encontrado:', carolinaProfile.size > 0);
      
      if (carolinaProfile.size > 0) {
        carolinaProfile.forEach(doc => {
          console.log('Datos de Carolina:', doc.data());
        });
      }
      
    } catch (error) {
      console.error('Error testando servicios Firebase:', error);
    }
  };
  
  await testFirebaseServices();
  
  // 5. SIMULAR CARGA DE DATOS COMO ADMIN
  console.log('\n5️⃣ SIMULANDO CARGA DE DATOS COMO ADMIN...');
  
  const simulateAdminDataLoad = async () => {
    try {
      const db = window.firebase?.firestore();
      if (!db) {
        console.error('❌ No se puede simular - Firestore no disponible');
        return;
      }
      
      console.log('Cargando TODOS los operadores del sistema...');
      const allOperators = await db.collection('operators').get();
      console.log('Total operadores encontrados:', allOperators.size);
      
      console.log('Cargando TODAS las asignaciones del sistema...');
      const allAssignments = await db.collection('assignments').get();
      console.log('Total asignaciones encontradas:', allAssignments.size);
      
      // Agrupar asignaciones por operador
      const groupedAssignments = {};
      allAssignments.forEach(doc => {
        const assignment = doc.data();
        const operatorId = assignment.operatorId;
        if (!groupedAssignments[operatorId]) {
          groupedAssignments[operatorId] = [];
        }
        groupedAssignments[operatorId].push(assignment);
      });
      
      console.log('Operadores con asignaciones:', Object.keys(groupedAssignments).length);
      console.log('Resumen de datos que debería ver Carolina:', {
        totalOperadores: allOperators.size,
        totalAsignaciones: allAssignments.size,
        operadoresConAsignaciones: Object.keys(groupedAssignments).length
      });
      
      return {
        operators: allOperators.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        assignments: groupedAssignments,
        totalAssignments: allAssignments.size
      };
      
    } catch (error) {
      console.error('Error simulando carga de datos:', error);
    }
  };
  
  const simulatedData = await simulateAdminDataLoad();
  
  // 6. VERIFICAR DOM Y COMPONENTES
  console.log('\n6️⃣ VERIFICANDO DOM Y COMPONENTES...');
  
  const checkDOMElements = () => {
    // Buscar elementos de métricas
    const metricsElements = document.querySelectorAll('[class*="metric"], [class*="card"], [class*="dashboard"]');
    console.log('Elementos de métricas encontrados:', metricsElements.length);
    
    // Buscar elementos con valores numéricos
    const numberElements = document.querySelectorAll('*');
    let zerosFound = 0;
    
    numberElements.forEach(el => {
      if (el.textContent && el.textContent.trim() === '0' && el.children.length === 0) {
        zerosFound++;
      }
    });
    
    console.log('Elementos mostrando "0":', zerosFound);
    
    // Verificar título de página/role
    const titleElement = document.querySelector('h1, h2, [class*="title"]');
    if (titleElement) {
      console.log('Título principal:', titleElement.textContent);
    }
  };
  
  checkDOMElements();
  
  // 7. RECOMENDACIONES
  console.log('\n7️⃣ RECOMENDACIONES BASADAS EN ANÁLISIS...');
  
  if (simulatedData && simulatedData.totalAssignments > 0) {
    console.log('✅ Datos existen en Firebase - El problema es de carga/sincronización');
    console.log('🔧 Recomendación: Verificar timing entre usePermissions y loadUserData');
    console.log('🔧 Posible solución: Forzar re-carga después de detectar rol admin');
  } else {
    console.log('❌ No hay datos en Firebase - El problema es de contenido');
    console.log('🔧 Recomendación: Verificar colecciones de Firebase y reglas de seguridad');
  }
  
  console.log('\n============================================');
  console.log('🚨 DIAGNÓSTICO DE TIMING COMPLETADO');
  
  return {
    simulatedData,
    storeStates,
    timestamp: new Date().toISOString()
  };
};

// Auto-ejecución si Carolina está logueada
if (window.location.href.includes('dashboard') || window.location.href.includes('teleoperadora')) {
  console.log('🎯 Página de dashboard detectada - ejecutar window.debugCarolinaTiming() para análisis completo');
}