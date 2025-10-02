/**
 * FIX INMEDIATO PARA ROBERTO - RESETEAR ERRORES DE FIRESTORE
 * Soluciona el problema de permissionErrorLogged que bloquea servicios
 */

window.fixRobertoAdminAccess = async function() {
  console.log('🔧 APLICANDO FIX INMEDIATO PARA ROBERTO');
  console.log('=====================================');
  
  try {
    // 1. Verificar usuario actual
    const auth = window.firebase?.auth();
    const user = auth?.currentUser;
    
    if (!user) {
      console.error('❌ No hay usuario autenticado');
      return false;
    }
    
    console.log('✅ Usuario autenticado:', user.email);
    
    // 2. Resetear errores de Firestore
    console.log('🧹 Reseteando errores de Firestore...');
    
    // Importar función de reset si está disponible
    if (window.resetErrorState) {
      window.resetErrorState(user.uid);
      console.log('✅ Estado de error reseteado via window function');
    }
    
    // También resetear directamente la variable si es accesible
    try {
      // Buscar en el módulo de firestoreService
      const firestoreModule = window.firestoreService || window.operatorService;
      if (firestoreModule && firestoreModule.resetErrorState) {
        firestoreModule.resetErrorState(user.uid);
        console.log('✅ Estado de error reseteado via service');
      }
    } catch (error) {
      console.log('⚠️ No se pudo acceder a resetErrorState del servicio');
    }
    
    // 3. Limpiar stores de Zustand
    console.log('🧹 Limpiando stores...');
    
    if (window.useAppStore) {
      const appStore = window.useAppStore.getState();
      appStore.setOperators?.([]);
      appStore.setOperatorAssignments?.({});
      console.log('✅ App store limpiado');
    }
    
    // 4. Verificar permisos de Roberto
    console.log('👑 Verificando permisos de super admin...');
    
    const isRoberto = user.email === 'roberto@mistatas.com';
    if (!isRoberto) {
      console.warn('⚠️ Usuario no es Roberto, pero continuando...');
    }
    
    // 5. Probar servicios directamente
    console.log('🧪 Probando servicios de Firebase...');
    
    const db = window.firebase?.firestore();
    if (!db) {
      console.error('❌ Firestore no disponible');
      return false;
    }
    
    // Test directo sin usar servicios que pueden estar bloqueados
    const testOperators = await db.collection('operators').limit(1).get();
    console.log('📊 Test directo operadores:', testOperators.size, 'documentos');
    
    const testAssignments = await db.collection('assignments').limit(1).get();
    console.log('📊 Test directo asignaciones:', testAssignments.size, 'documentos');
    
    if (testOperators.size === 0 && testAssignments.size === 0) {
      console.warn('⚠️ No hay datos en Firebase - problema de datos, no de permisos');
      return false;
    }
    
    // 6. Forzar carga de datos como admin
    console.log('🔄 Forzando carga de datos como super admin...');
    
    const allOperators = await db.collection('operators').get();
    const allAssignments = await db.collection('assignments').get();
    
    console.log('📥 Datos obtenidos directamente:', {
      operadores: allOperators.size,
      asignaciones: allAssignments.size
    });
    
    // Convertir a formato esperado
    const operators = allOperators.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const groupedAssignments = {};
    allAssignments.forEach(doc => {
      const data = doc.data();
      if (data.assignments && Array.isArray(data.assignments)) {
        data.assignments.forEach(assignment => {
          const operatorId = data.operatorId;
          if (!groupedAssignments[operatorId]) {
            groupedAssignments[operatorId] = [];
          }
          groupedAssignments[operatorId].push({
            ...assignment,
            operatorId: data.operatorId,
            userId: data.userId
          });
        });
      }
    });
    
    // 7. Actualizar stores directamente
    console.log('📤 Actualizando stores con datos...');
    
    if (window.useAppStore) {
      const appStore = window.useAppStore.getState();
      
      if (appStore.setOperators && appStore.setOperatorAssignments) {
        appStore.setOperators(operators);
        appStore.setOperatorAssignments(groupedAssignments);
        
        console.log('✅ Stores actualizados:', {
          operadores: operators.length,
          asignacionesGrupos: Object.keys(groupedAssignments).length
        });
      } else {
        console.error('❌ Funciones de store no disponibles');
        return false;
      }
    }
    
    // 8. Forzar renderizado si es posible
    try {
      // Disparar evento de storage para forzar re-render
      window.dispatchEvent(new Event('storage'));
      
      // Disparar evento personalizado
      window.dispatchEvent(new CustomEvent('dataUpdated', {
        detail: { operators, assignments: groupedAssignments }
      }));
      
      console.log('✅ Eventos de actualización disparados');
    } catch (error) {
      console.log('⚠️ No se pudieron disparar eventos de actualización');
    }
    
    console.log('🎉 FIX COMPLETADO PARA ROBERTO');
    console.log('Roberto debería ver datos ahora en el dashboard');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error aplicando fix:', error);
    return false;
  }
};

// Verificar si Roberto está logueado y aplicar fix automáticamente
setTimeout(() => {
  const auth = window.firebase?.auth?.();
  const user = auth?.currentUser;
  
  if (user && user.email === 'roberto@mistatas.com') {
    console.log('👑 Roberto detectado - ejecutar window.fixRobertoAdminAccess() para fix inmediato');
    
    // Auto-aplicar fix después de 2 segundos
    setTimeout(() => {
      console.log('🤖 Aplicando fix automático para Roberto...');
      window.fixRobertoAdminAccess();
    }, 2000);
  }
}, 1000);