/**
 * FIX CRÍTICO: Fuerza la recarga de datos cuando admin no ve información
 * Solución inmediata para el problema de Carolina
 */

window.fixCarolinaDataLoading = function() {
  console.log('🚨 APLICANDO FIX DE EMERGENCIA PARA CAROLINA');
  console.log('========================================');
  
  // 1. Forzar recarga completa del App.jsx
  const forceAppReload = () => {
    console.log('🔄 Forzando recarga de datos en App.jsx...');
    
    // Encontrar y limpiar el estado de dataLoaded
    if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
      try {
        // Buscar componentes React montados
        const fiberNode = document.querySelector('#root')._reactInternalFiber || 
                         document.querySelector('#root')._reactInternals;
        
        if (fiberNode) {
          console.log('✅ React fiber encontrado, buscando App component...');
          
          // Recursively find App component
          const findAppComponent = (node) => {
            if (!node) return null;
            
            if (node.type && node.type.name === 'App') {
              return node;
            }
            
            if (node.child) {
              return findAppComponent(node.child);
            }
            
            if (node.sibling) {
              return findAppComponent(node.sibling);
            }
            
            return null;
          };
          
          const appComponent = findAppComponent(fiberNode);
          
          if (appComponent && appComponent.stateNode) {
            console.log('✅ App component encontrado');
            
            // Forzar que dataLoaded = false para trigger loadUserData
            const setState = appComponent.stateNode.setState;
            if (setState) {
              setState.call(appComponent.stateNode, { dataLoaded: false });
              console.log('✅ dataLoaded reseteado - debería triggear loadUserData');
            }
          }
        }
      } catch (error) {
        console.log('⚠️ No se pudo acceder a React internals:', error);
      }
    }
  };
  
  // 2. Limpiar stores de Zustand
  const clearZustandStores = () => {
    console.log('🧹 Limpiando stores de Zustand...');
    
    if (window.useAppStore) {
      const appStore = window.useAppStore.getState();
      if (appStore.setOperators && appStore.setOperatorAssignments) {
        appStore.setOperators([]);
        appStore.setOperatorAssignments({});
        console.log('✅ App store limpiado');
      }
    }
    
    if (window.useCallStore) {
      const callStore = window.useCallStore.getState();
      if (callStore.setCallData) {
        callStore.setCallData([]);
        console.log('✅ Call store limpiado');
      }
    }
  };
  
  // 3. Forzar recarga directa de datos como admin
  const forceAdminDataLoad = async () => {
    console.log('👑 Forzando carga de datos como admin...');
    
    try {
      const db = window.firebase?.firestore();
      if (!db) {
        console.error('❌ Firebase no disponible');
        return;
      }
      
      // Cargar todos los operadores
      console.log('📡 Cargando todos los operadores...');
      const operatorsSnapshot = await db.collection('operators').get();
      const operators = operatorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Cargar todas las asignaciones
      console.log('📡 Cargando todas las asignaciones...');
      const assignmentsSnapshot = await db.collection('assignments').get();
      const assignmentsArray = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Agrupar asignaciones por operador
      const groupedAssignments = {};
      assignmentsArray.forEach(assignment => {
        const operatorId = assignment.operatorId;
        if (!groupedAssignments[operatorId]) {
          groupedAssignments[operatorId] = [];
        }
        groupedAssignments[operatorId].push(assignment);
      });
      
      console.log('📊 Datos cargados:', {
        operadores: operators.length,
        asignaciones: assignmentsArray.length,
        operadoresConAsignaciones: Object.keys(groupedAssignments).length
      });
      
      // Actualizar stores directamente
      if (window.useAppStore) {
        const appStore = window.useAppStore.getState();
        if (appStore.setOperators && appStore.setOperatorAssignments) {
          appStore.setOperators(operators);
          appStore.setOperatorAssignments(groupedAssignments);
          console.log('✅ Stores actualizados con datos de admin');
        }
      }
      
      // Actualizar estado local también
      window.localStorage.setItem('adminDataLoaded', Date.now());
      
      return { operators, assignments: groupedAssignments };
      
    } catch (error) {
      console.error('Error forzando carga de datos:', error);
    }
  };
  
  // 4. Verificar que Carolina esté identificada como admin
  const verifyCarolinaAdmin = () => {
    console.log('🔍 Verificando identificación de Carolina como admin...');
    
    // Buscar en usePermissions
    if (window.usePermissions) {
      try {
        const permissionsResult = window.usePermissions();
        console.log('usePermissions result:', permissionsResult);
        
        if (permissionsResult.isAdmin) {
          console.log('✅ Carolina correctamente identificada como admin');
          return true;
        } else {
          console.log('❌ Carolina NO identificada como admin');
          return false;
        }
      } catch (error) {
        console.log('⚠️ Error verificando usePermissions:', error);
      }
    }
    
    return false;
  };
  
  // 5. Ejecutar fix paso a paso
  const executeFix = async () => {
    console.log('🚀 Ejecutando fix de emergencia...');
    
    // Verificar que Carolina sea admin
    const isAdmin = verifyCarolinaAdmin();
    if (!isAdmin) {
      console.error('❌ FIX ABORTADO: Carolina no está identificada como admin');
      return;
    }
    
    // Limpiar stores
    clearZustandStores();
    
    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Forzar carga de datos
    const adminData = await forceAdminDataLoad();
    
    // Esperar un momento más
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Forzar recarga del componente
    forceAppReload();
    
    console.log('✅ Fix de emergencia completado');
    
    // Verificar después de 2 segundos
    setTimeout(() => {
      console.log('🔍 Verificando resultado del fix...');
      
      if (window.useAppStore) {
        const appState = window.useAppStore.getState();
        console.log('Estado final:', {
          operadores: appState.operators?.length || 0,
          asignaciones: Object.keys(appState.operatorAssignments || {}).length
        });
        
        if (appState.operators?.length > 0) {
          console.log('🎉 ¡FIX EXITOSO! Carolina debería ver datos ahora');
        } else {
          console.log('❌ Fix no fue exitoso, puede necesitar recarga manual');
        }
      }
    }, 2000);
    
    return adminData;
  };
  
  return executeFix();
};

// 6. Crear función de monitoreo automático
window.startCarolinaMonitoring = function() {
  console.log('👀 Iniciando monitoreo automático para Carolina...');
  
  const checkAndFix = async () => {
    try {
      // Verificar si estamos en dashboard
      if (!window.location.href.includes('dashboard') && !window.location.href.includes('teleoperadora')) {
        return;
      }
      
      // Verificar si Carolina está logueada
      const auth = window.firebase?.auth?.();
      const user = auth?.currentUser;
      
      if (!user || user.email !== 'carolina@mistatas.com') {
        return;
      }
      
      // Verificar si es admin pero no tiene datos
      if (window.usePermissions) {
        const permissions = window.usePermissions();
        
        if (permissions.isAdmin && window.useAppStore) {
          const appState = window.useAppStore.getState();
          
          if ((!appState.operators || appState.operators.length === 0) && 
              (!appState.operatorAssignments || Object.keys(appState.operatorAssignments).length === 0)) {
            
            console.log('🚨 PROBLEMA DETECTADO: Carolina es admin pero no tiene datos');
            console.log('🔧 Aplicando fix automático...');
            
            await window.fixCarolinaDataLoading();
          }
        }
      }
    } catch (error) {
      console.log('Error en monitoreo automático:', error);
    }
  };
  
  // Verificar cada 5 segundos
  const interval = setInterval(checkAndFix, 5000);
  
  // Verificar inmediatamente
  checkAndFix();
  
  console.log('✅ Monitoreo iniciado - se verificará cada 5 segundos');
  
  return interval;
};

// Auto-ejecutar si Carolina está en dashboard
setTimeout(() => {
  const auth = window.firebase?.auth?.();
  const user = auth?.currentUser;
  
  if (user && user.email === 'carolina@mistatas.com') {
    console.log('🎯 Carolina detectada - ejecutar window.fixCarolinaDataLoading() para fix inmediato');
    console.log('🎯 O ejecutar window.startCarolinaMonitoring() para monitoreo automático');
  }
}, 1000);