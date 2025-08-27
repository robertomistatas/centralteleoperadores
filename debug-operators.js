// Script temporal para diagnosticar datos de operadoras
// Ejecutar en la consola del navegador

console.log('🔍 DIAGNÓSTICO TEMPORAL - Analizando datos reales');

// Obtener el store
const store = window.useCallStore?.getState?.();
if (!store) {
  console.error('❌ Store no disponible');
} else {
  const { callData, operatorAssignments } = store;
  
  console.log('📊 DATOS DISPONIBLES:');
  console.log('- callData:', callData?.length || 0, 'registros');
  console.log('- operatorAssignments:', operatorAssignments?.length || 0, 'asignaciones');
  
  if (callData && callData.length > 0) {
    console.log('📋 ESTRUCTURA LLAMADA EJEMPLO:');
    console.log('Campos:', Object.keys(callData[0]));
    console.log('Ejemplo:', callData[0]);
    
    console.log('📊 ANÁLISIS DE RESULTADOS:');
    const resultados = {};
    let exitosas = 0, fallidas = 0;
    
    callData.forEach(call => {
      const result = (call.result || call.resultado || call.estado || 'sin_estado').toLowerCase();
      resultados[result] = (resultados[result] || 0) + 1;
      
      const isSuccessful = result.includes('exitosa') || result.includes('exitoso') || 
                         result.includes('contactado') || result.includes('atendida') ||
                         result.includes('respuesta') || result.includes('contesto');
      
      if (isSuccessful) exitosas++;
      else fallidas++;
    });
    
    console.log('Distribución de resultados:', resultados);
    console.log(`Total: ${callData.length}, Exitosas: ${exitosas}, Fallidas: ${fallidas}`);
    
    // Verificar operadores en llamadas
    console.log('📋 ANÁLISIS DE OPERADORES EN LLAMADAS:');
    const operadores = new Set();
    callData.slice(0, 10).forEach((call, i) => {
      const op = call.operator || call.operador || call.teleoperador || call.agent || 'NO_ENCONTRADO';
      operadores.add(op);
      if (i < 5) {
        console.log(`Llamada ${i}: Operador="${op}"`);
      }
    });
    console.log('Operadores únicos encontrados:', Array.from(operadores));
  }
  
  if (operatorAssignments && operatorAssignments.length > 0) {
    console.log('📋 ESTRUCTURA ASIGNACIÓN EJEMPLO:');
    console.log('Ejemplo:', operatorAssignments[0]);
    
    const operadoresAsignados = new Set(operatorAssignments.map(a => a.operator || a.operatorName));
    console.log('Operadores en asignaciones:', Array.from(operadoresAsignados));
  }
}
