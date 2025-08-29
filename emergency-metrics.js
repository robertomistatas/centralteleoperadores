// 🚨 SCRIPT DE EMERGENCIA - Forzar visualización de métricas

const EMERGENCY_METRICS = {
  
  // Crear datos de emergencia basados en las asignaciones existentes
  createEmergencyData: () => {
    console.log('🚨 CREANDO DATOS DE EMERGENCIA...');
    
    const appState = useAppStore.getState();
    const callState = useCallStore.getState();
    
    const operators = appState.operators;
    const operatorAssignments = appState.operatorAssignments;
    const callData = callState.callData || [];
    
    console.log('📊 Datos disponibles:');
    console.log('- Operadores:', operators.length);
    console.log('- Asignaciones:', Object.keys(operatorAssignments).length);
    console.log('- Llamadas:', callData.length);
    
    if (operators.length === 0) {
      console.log('❌ No hay operadores. Necesitas crear operadores en módulo Asignaciones.');
      return [];
    }
    
    const emergencyMetrics = [];
    const totalCalls = callData.length;
    const totalSuccess = callData.filter(call => {
      const result = (call.result || call.resultado || call.estado || '').toLowerCase();
      return result.includes('exitosa') || result.includes('exitoso') || 
             result.includes('contactado') || result.includes('atendida');
    }).length;
    
    Object.entries(operatorAssignments).forEach(([operatorId, assignments]) => {
      const operator = operators.find(op => op.id === operatorId);
      if (operator && assignments && Array.isArray(assignments)) {
        
        // Calcular proporción basada en asignaciones
        const totalAssignments = Object.values(operatorAssignments)
          .reduce((sum, arr) => sum + (arr?.length || 0), 0);
        
        const proportion = assignments.length / Math.max(1, totalAssignments);
        const operatorCalls = Math.floor(totalCalls * proportion);
        const operatorSuccess = Math.floor(totalSuccess * proportion);
        
        emergencyMetrics.push({
          operatorName: operator.name,
          totalCalls: operatorCalls,
          successfulCalls: operatorSuccess,
          failedCalls: operatorCalls - operatorSuccess,
          averageDuration: 75, // Promedio estimado
          successRate: operatorCalls > 0 ? Math.round((operatorSuccess / operatorCalls) * 100) : 0,
          isEmergencyData: true,
          assignmentsCount: assignments.length
        });
      }
    });
    
    console.log('✅ Datos de emergencia creados:', emergencyMetrics);
    return emergencyMetrics;
  },
  
  // Forzar actualización del Dashboard
  forceUpdate: () => {
    console.log('🔄 FORZANDO ACTUALIZACIÓN DEL DASHBOARD...');
    
    // Disparar re-render
    window.dispatchEvent(new CustomEvent('forceUpdate'));
    
    // También podemos actualizar el store directamente
    const emergencyData = EMERGENCY_METRICS.createEmergencyData();
    
    console.log('📊 Datos de emergencia:', emergencyData);
    
    return emergencyData;
  },
  
  // Verificar por qué no aparecen las métricas
  diagnose: () => {
    console.log('\n🔍 DIAGNÓSTICO COMPLETO:');
    
    const appState = useAppStore.getState();
    const callState = useCallStore.getState();
    
    // 1. Verificar operadores
    console.log('\n👥 OPERADORES:');
    if (appState.operators.length === 0) {
      console.log('❌ NO HAY OPERADORES');
      console.log('Solución: Ve al módulo Asignaciones y crea operadores');
      return false;
    } else {
      console.log('✅ Operadores encontrados:', appState.operators.length);
      appState.operators.forEach(op => console.log(`  - ${op.name}`));
    }
    
    // 2. Verificar asignaciones
    console.log('\n📋 ASIGNACIONES:');
    const totalAssignments = Object.values(appState.operatorAssignments)
      .reduce((sum, arr) => sum + (arr?.length || 0), 0);
    
    if (totalAssignments === 0) {
      console.log('❌ NO HAY ASIGNACIONES');
      console.log('Solución: Asigna beneficiarios a cada operador');
      return false;
    } else {
      console.log('✅ Asignaciones encontradas:', totalAssignments);
    }
    
    // 3. Verificar datos de llamadas
    console.log('\n📞 LLAMADAS:');
    if (!callState.callData || callState.callData.length === 0) {
      console.log('❌ NO HAY DATOS DE LLAMADAS');
      console.log('Solución: Sube archivo Excel en módulo Registro de Llamadas');
      return false;
    } else {
      console.log('✅ Datos de llamadas encontrados:', callState.callData.length);
    }
    
    // 4. Probar función getOperatorMetrics
    console.log('\n🧪 PRUEBA DE FUNCIÓN:');
    try {
      const testAssignments = [];
      Object.entries(appState.operatorAssignments).forEach(([operatorId, assignments]) => {
        const operator = appState.operators.find(op => op.id === operatorId);
        if (operator && assignments) {
          assignments.forEach(assignment => {
            testAssignments.push({
              operator: operator.name,
              operatorName: operator.name,
              beneficiary: assignment.beneficiary,
              phone: assignment.primaryPhone
            });
          });
        }
      });
      
      const result = callState.getOperatorMetrics(testAssignments);
      console.log('✅ Función ejecutada correctamente');
      console.log('📊 Resultado:', result);
      
      if (!result || result.length === 0) {
        console.log('⚠️ La función retorna datos vacíos');
        console.log('Posible causa: Los números de teléfono en asignaciones no coinciden con los de las llamadas');
      }
      
      return result;
    } catch (error) {
      console.log('❌ Error en función:', error);
      return false;
    }
  }
};

// Instrucciones
console.log('🚨 SCRIPT DE EMERGENCIA CARGADO');
console.log('\nComandos disponibles:');
console.log('- EMERGENCY_METRICS.diagnose() - Diagnóstico completo');
console.log('- EMERGENCY_METRICS.createEmergencyData() - Crear datos de emergencia');
console.log('- EMERGENCY_METRICS.forceUpdate() - Forzar actualización');

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  window.EMERGENCY_METRICS = EMERGENCY_METRICS;
}
