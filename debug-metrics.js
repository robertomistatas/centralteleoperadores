// Script de depuración para analizar inconsistencias en métricas

console.log('🔍 INICIANDO ANÁLISIS DE MÉTRICAS...');

// Simular la estructura de datos que debería existir
const DEBUG_ANALYSIS = {
  
  // Análisis de callData (debe sumar 1677)
  analyzeCallData: (callData) => {
    console.log('\n📊 ANÁLISIS DE CALL DATA:');
    console.log(`Total de llamadas: ${callData.length}`);
    
    let successful = 0;
    let failed = 0;
    
    callData.forEach(call => {
      const result = (call.result || call.resultado || call.estado || '').toLowerCase();
      const isSuccessful = result.includes('exitosa') || result.includes('exitoso') || 
                         result.includes('contactado') || result.includes('atendida') ||
                         result.includes('respuesta') || result.includes('contesto');
      
      if (isSuccessful) {
        successful++;
      } else {
        failed++;
      }
    });
    
    console.log(`- Exitosas: ${successful}`);
    console.log(`- Fallidas: ${failed}`);
    console.log(`- Suma: ${successful + failed} (debe ser ${callData.length})`);
    console.log(`- ✅ Matemática correcta: ${successful + failed === callData.length}`);
    
    return { successful, failed, total: callData.length };
  },

  // Análisis de asignaciones
  analyzeAssignments: (assignments) => {
    console.log('\n👥 ANÁLISIS DE ASIGNACIONES:');
    console.log(`Total de asignaciones: ${assignments.length}`);
    
    const operatorGroups = {};
    assignments.forEach(assignment => {
      const operatorName = assignment.operator || assignment.operatorName || 'Sin Asignar';
      if (!operatorGroups[operatorName]) {
        operatorGroups[operatorName] = [];
      }
      operatorGroups[operatorName].push(assignment);
    });
    
    console.log('Operadores y beneficiarios asignados:');
    Object.entries(operatorGroups).forEach(([operator, assignments]) => {
      console.log(`- ${operator}: ${assignments.length} beneficiarios`);
    });
    
    return operatorGroups;
  },

  // Análisis cruzado
  analyzeCrossReference: (callData, assignments) => {
    console.log('\n🔗 ANÁLISIS CRUZADO (LLAMADAS vs ASIGNACIONES):');
    
    const normalizeName = (name) => {
      if (!name) return '';
      return name.toLowerCase()
                .replace(/[áàäâ]/g, 'a')
                .replace(/[éèëê]/g, 'e')
                .replace(/[íìïî]/g, 'i')
                .replace(/[óòöô]/g, 'o')
                .replace(/[úùüû]/g, 'u')
                .replace(/ñ/g, 'n')
                .replace(/[^\w\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
    };

    const namesMatch = (name1, name2) => {
      const norm1 = normalizeName(name1);
      const norm2 = normalizeName(name2);
      
      if (!norm1 || !norm2) return false;
      if (norm1 === norm2) return true;
      if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
      
      const words1 = norm1.split(' ').filter(w => w.length > 2);
      const words2 = norm2.split(' ').filter(w => w.length > 2);
      const commonWords = words1.filter(w => words2.includes(w));
      return commonWords.length >= 2;
    };

    // Crear lista de beneficiarios únicos en callData
    const callBeneficiaries = [...new Set(callData.map(call => 
      call.beneficiary || call.beneficiario || call.nombre || ''
    ))].filter(name => name.trim());
    
    console.log(`Beneficiarios únicos en callData: ${callBeneficiaries.length}`);
    
    // Crear lista de beneficiarios únicos en assignments
    const assignmentBeneficiaries = [...new Set(assignments.map(assignment => 
      assignment.beneficiary || ''
    ))].filter(name => name.trim());
    
    console.log(`Beneficiarios únicos en assignments: ${assignmentBeneficiaries.length}`);
    
    // Encontrar coincidencias
    let matches = 0;
    let callsWithAssignments = 0;
    
    callData.forEach(call => {
      const callBeneficiary = call.beneficiary || call.beneficiario || call.nombre || '';
      const hasAssignment = assignments.some(assignment => 
        namesMatch(callBeneficiary, assignment.beneficiary)
      );
      
      if (hasAssignment) {
        callsWithAssignments++;
      }
    });
    
    console.log(`Llamadas que tienen asignación: ${callsWithAssignments} de ${callData.length}`);
    console.log(`Porcentaje de cobertura: ${((callsWithAssignments / callData.length) * 100).toFixed(1)}%`);
    
    return {
      callBeneficiaries: callBeneficiaries.length,
      assignmentBeneficiaries: assignmentBeneficiaries.length,
      callsWithAssignments,
      coveragePercentage: (callsWithAssignments / callData.length) * 100
    };
  },

  // Detectar el problema específico
  detectProblem: (callData, assignments) => {
    console.log('\n🚨 DETECCIÓN DEL PROBLEMA:');
    
    const crossRef = this.analyzeCrossReference(callData, assignments);
    
    if (crossRef.coveragePercentage < 50) {
      console.log('❌ PROBLEMA DETECTADO: Baja cobertura de asignaciones');
      console.log('Las asignaciones no cubren la mayoría de las llamadas');
      console.log('Esto explica por qué las métricas no suman correctamente');
    }
    
    if (crossRef.callsWithAssignments === 0) {
      console.log('❌ PROBLEMA CRÍTICO: No hay coincidencias entre llamadas y asignaciones');
      console.log('Los nombres de beneficiarios no coinciden entre ambas fuentes');
    }
    
    return crossRef;
  }
};

// Esta función se debe ejecutar en la consola del navegador con los datos reales
console.log('Para usar este script:');
console.log('1. Abre la consola del navegador');
console.log('2. Ejecuta: DEBUG_ANALYSIS.analyzeCallData(useCallStore.getState().callData)');
console.log('3. Ejecuta: DEBUG_ANALYSIS.analyzeAssignments(assignmentsToUse)');
console.log('4. Ejecuta: DEBUG_ANALYSIS.detectProblem(useCallStore.getState().callData, assignmentsToUse)');

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  window.DEBUG_ANALYSIS = DEBUG_ANALYSIS;
}
