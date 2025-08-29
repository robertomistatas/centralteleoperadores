// 🔍 DIAGNÓSTICO RÁPIDO - Top Performers y Métricas
console.log('🔍 DIAGNÓSTICO DE TOP PERFORMERS Y MÉTRICAS');

// Verificar si hay asignaciones cargadas
const checkAssignments = () => {
  const appState = useAppStore.getState();
  const operators = appState.operators;
  const operatorAssignments = appState.operatorAssignments;
  
  console.log('\n👥 OPERADORES:');
  console.log('- Total operadores:', operators.length);
  operators.forEach(op => console.log(`  - ${op.name} (ID: ${op.id})`));
  
  console.log('\n📋 ASIGNACIONES:');
  console.log('- Operadores con asignaciones:', Object.keys(operatorAssignments).length);
  Object.entries(operatorAssignments).forEach(([id, assignments]) => {
    const operator = operators.find(op => op.id === id);
    console.log(`  - ${operator?.name || 'Desconocido'}: ${assignments?.length || 0} beneficiarios`);
  });
  
  return {
    hasOperators: operators.length > 0,
    hasAssignments: Object.keys(operatorAssignments).length > 0,
    totalAssignments: Object.values(operatorAssignments).reduce((sum, arr) => sum + (arr?.length || 0), 0)
  };
};

// Verificar función getOperatorMetrics
const testOperatorMetrics = () => {
  const callState = useCallStore.getState();
  const appState = useAppStore.getState();
  
  console.log('\n📊 TEST OPERATOR METRICS:');
  console.log('- callData length:', callState.callData?.length || 0);
  
  // Crear asignaciones de prueba como lo hace App.jsx
  const testAssignments = [];
  Object.entries(appState.operatorAssignments).forEach(([operatorId, assignments]) => {
    const operator = appState.operators.find(op => op.id === operatorId);
    if (operator && assignments && Array.isArray(assignments)) {
      assignments.forEach(assignment => {
        testAssignments.push({
          id: assignment.id,
          operator: operator.name,
          operatorName: operator.name,
          beneficiary: assignment.beneficiary,
          phone: assignment.primaryPhone,
          commune: assignment.commune
        });
      });
    }
  });
  
  console.log('- testAssignments length:', testAssignments.length);
  console.log('- Primera asignación:', testAssignments[0]);
  
  // Llamar a getOperatorMetrics
  const metrics = callState.getOperatorMetrics(testAssignments);
  console.log('- Resultado getOperatorMetrics:', metrics);
  
  return metrics;
};

// Instrucciones
console.log('\n🚀 PARA DIAGNOSTICAR:');
console.log('1. Ejecuta: checkAssignments()');
console.log('2. Ejecuta: testOperatorMetrics()');
console.log('3. Si hay problemas, verifica que:');
console.log('   - Tengas operadores creados en módulo Asignaciones');
console.log('   - Tengas beneficiarios asignados a cada operador');
console.log('   - Hayas subido datos de llamadas');

// Hacer disponibles globalmente
if (typeof window !== 'undefined') {
  window.checkAssignments = checkAssignments;
  window.testOperatorMetrics = testOperatorMetrics;
}
