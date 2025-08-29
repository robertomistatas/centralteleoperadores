/**
 * Script de diagnóstico para verificar sincronización de datos
 * entre módulos y el correcto funcionamiento de las métricas
 */

// Función de diagnóstico principal
export const runDataSyncDiagnostic = () => {
  console.log('🔍 INICIANDO DIAGNÓSTICO DE SINCRONIZACIÓN DE DATOS...');
  
  // 1. Verificar acceso a stores Zustand
  console.log('\n📊 1. VERIFICANDO STORES ZUSTAND:');
  
  const appStore = window.useAppStore?.getState();
  const callStore = window.useCallStore?.getState();
  
  if (appStore) {
    console.log('✅ useAppStore accesible:', {
      operators: appStore.operators?.length || 0,
      operatorAssignments: Object.keys(appStore.operatorAssignments || {}).length,
      allAssignments: appStore.getAllAssignments ? appStore.getAllAssignments()?.length : 'N/A'
    });
  } else {
    console.log('❌ useAppStore no accesible');
  }
  
  if (callStore) {
    console.log('✅ useCallStore accesible:', {
      callData: callStore.callData?.length || 0,
      processedData: callStore.processedData?.length || 0,
      callMetrics: callStore.callMetrics ? 'disponible' : 'no disponible'
    });
  } else {
    console.log('❌ useCallStore no accesible');
  }
  
  // 2. Probar función getOperatorMetrics
  console.log('\n🎯 2. PROBANDO getOperatorMetrics:');
  
  if (callStore && callStore.getOperatorMetrics) {
    try {
      const metricsWithoutParams = callStore.getOperatorMetrics();
      console.log('📈 Métricas sin parámetros:', metricsWithoutParams);
      
      if (appStore) {
        const metricsWithParams = callStore.getOperatorMetrics(
          appStore.operators, 
          appStore.operatorAssignments
        );
        console.log('📈 Métricas con parámetros:', metricsWithParams);
      }
    } catch (error) {
      console.error('❌ Error ejecutando getOperatorMetrics:', error);
    }
  }
  
  // 3. Verificar datos de ejemplo
  console.log('\n📝 3. VERIFICANDO DATOS DE EJEMPLO:');
  
  if (appStore && appStore.operators) {
    console.log('👥 Operadores disponibles:');
    appStore.operators.forEach((op, index) => {
      console.log(`  ${index + 1}. ${op.name} (ID: ${op.id})`);
    });
  }
  
  if (appStore && appStore.operatorAssignments) {
    console.log('📋 Asignaciones por operador:');
    Object.entries(appStore.operatorAssignments).forEach(([operatorId, assignments]) => {
      const operator = appStore.operators?.find(op => op.id === operatorId);
      console.log(`  ${operator?.name || operatorId}: ${assignments?.length || 0} asignaciones`);
    });
  }
  
  // 4. Buscar Hermes como caso específico
  console.log('\n🔍 4. BÚSQUEDA ESPECÍFICA DE HERMES:');
  
  if (appStore && appStore.getAllAssignments) {
    const allAssignments = appStore.getAllAssignments();
    const hermesAssignment = allAssignments.find(assignment => 
      assignment.beneficiary?.toLowerCase().includes('hermes') ||
      assignment.beneficiario?.toLowerCase().includes('hermes')
    );
    
    if (hermesAssignment) {
      console.log('🎯 Hermes encontrado en asignaciones:', hermesAssignment);
    } else {
      console.log('❌ Hermes NO encontrado en asignaciones');
      console.log('📋 Primeros 5 beneficiarios:', allAssignments.slice(0, 5).map(a => a.beneficiary || a.beneficiario));
    }
  }
  
  // 5. Verificar datos de llamadas
  console.log('\n📞 5. VERIFICANDO DATOS DE LLAMADAS:');
  
  if (callStore && callStore.processedData) {
    console.log(`📊 Total llamadas procesadas: ${callStore.processedData.length}`);
    
    if (callStore.processedData.length > 0) {
      const firstCall = callStore.processedData[0];
      console.log('📞 Primera llamada (muestra):', {
        beneficiario: firstCall.beneficiario,
        operador: firstCall.operador,
        fecha: firstCall.fecha,
        resultado: firstCall.resultado
      });
      
      // Buscar llamada de Hermes específicamente
      const hermesCall = callStore.processedData.find(call => 
        call.beneficiario?.toLowerCase().includes('hermes')
      );
      
      if (hermesCall) {
        console.log('🎯 Llamada de Hermes encontrada:', hermesCall);
      } else {
        console.log('❌ No se encontraron llamadas de Hermes');
      }
    }
  }
  
  console.log('\n✅ DIAGNÓSTICO COMPLETADO\n');
};

// Función para ejecutar desde consola del navegador
window.runDataSyncDiagnostic = runDataSyncDiagnostic;

// Auto-ejecutar en desarrollo
if (import.meta.env.DEV) {
  setTimeout(() => {
    console.log('🔧 Auto-ejecutando diagnóstico en modo desarrollo...');
    runDataSyncDiagnostic();
  }, 2000);
}
