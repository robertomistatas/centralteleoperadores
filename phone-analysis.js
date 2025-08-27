// 🔍 ANÁLISIS PROFUNDO DE ESTRUCTURA DE DATOS
// Este script analiza la conexión entre asignaciones y llamadas

const PHONE_ANALYSIS = {
  
  // 1. Analizar estructura de llamadas
  analyzeCallData: (callData) => {
    console.log('\n📊 ANÁLISIS DE ESTRUCTURA DE LLAMADAS:');
    console.log(`Total de llamadas: ${callData.length}`);
    
    if (callData.length > 0) {
      const firstCall = callData[0];
      console.log('\n📋 Campos disponibles en primera llamada:', Object.keys(firstCall));
      console.log('📋 Primera llamada completa:', firstCall);
      
      // Analizar campos de teléfono posibles
      const phoneFields = ['phone', 'telefono', 'numero', 'numero_cliente', 'numero_telefono', 'numero_llamada'];
      console.log('\n📞 CAMPOS DE TELÉFONO ENCONTRADOS:');
      phoneFields.forEach(field => {
        if (firstCall[field]) {
          console.log(`- ${field}: ${firstCall[field]}`);
        }
      });
      
      // Analizar campos de beneficiario
      const beneficiaryFields = ['beneficiary', 'beneficiario', 'nombre', 'cliente', 'nombre_cliente'];
      console.log('\n👤 CAMPOS DE BENEFICIARIO ENCONTRADOS:');
      beneficiaryFields.forEach(field => {
        if (firstCall[field]) {
          console.log(`- ${field}: ${firstCall[field]}`);
        }
      });
      
      // Analizar distribución de números únicos
      const uniquePhones = [...new Set(callData.map(call => 
        call.phone || call.telefono || call.numero || call.numero_cliente || ''
      ))].filter(phone => phone.trim());
      
      console.log(`\n📊 Números únicos en llamadas: ${uniquePhones.length}`);
      console.log('📋 Primeros 10 números:', uniquePhones.slice(0, 10));
    }
    
    return {
      totalCalls: callData.length,
      fields: callData.length > 0 ? Object.keys(callData[0]) : [],
      uniquePhones: callData.length > 0 ? [...new Set(callData.map(call => 
        call.phone || call.telefono || call.numero || call.numero_cliente || ''
      ))].filter(phone => phone.trim()).length : 0
    };
  },

  // 2. Analizar estructura de asignaciones
  analyzeAssignments: (assignments) => {
    console.log('\n👥 ANÁLISIS DE ESTRUCTURA DE ASIGNACIONES:');
    console.log(`Total de asignaciones: ${assignments.length}`);
    
    if (assignments.length > 0) {
      const firstAssignment = assignments[0];
      console.log('\n📋 Campos disponibles en primera asignación:', Object.keys(firstAssignment));
      console.log('📋 Primera asignación completa:', firstAssignment);
      
      // Analizar operadores únicos
      const operators = [...new Set(assignments.map(a => 
        a.operator || a.operatorName || 'Sin Asignar'
      ))];
      console.log(`\n👩‍💼 Operadores únicos: ${operators.length}`);
      operators.forEach(op => console.log(`- ${op}`));
      
      // Analizar números de teléfono en asignaciones
      const assignmentPhones = assignments.map(a => {
        // Buscar todos los campos posibles de teléfono
        const phones = [
          a.phone,
          a.primaryPhone,
          a.telefono,
          a.numero_cliente,
          ...(a.phones || [])
        ].filter(phone => phone && phone !== 'N/A');
        
        return {
          beneficiary: a.beneficiary,
          operator: a.operator || a.operatorName,
          phones: phones
        };
      }).filter(item => item.phones.length > 0);
      
      console.log(`\n📞 Asignaciones con teléfonos: ${assignmentPhones.length}`);
      console.log('📋 Primeras 5 asignaciones con teléfonos:', assignmentPhones.slice(0, 5));
      
      // Extraer todos los números únicos de asignaciones
      const allAssignmentPhones = assignmentPhones
        .flatMap(item => item.phones)
        .filter(phone => phone && phone.trim() && phone !== 'N/A');
      
      const uniqueAssignmentPhones = [...new Set(allAssignmentPhones)];
      console.log(`\n📊 Números únicos en asignaciones: ${uniqueAssignmentPhones.length}`);
      console.log('📋 Primeros 10 números:', uniqueAssignmentPhones.slice(0, 10));
      
      return {
        totalAssignments: assignments.length,
        operators: operators,
        phonesWithAssignments: assignmentPhones.length,
        uniqueAssignmentPhones: uniqueAssignmentPhones.length,
        allPhones: uniqueAssignmentPhones
      };
    }
    
    return {
      totalAssignments: 0,
      operators: [],
      phonesWithAssignments: 0,
      uniqueAssignmentPhones: 0,
      allPhones: []
    };
  },

  // 3. Cruzar datos de llamadas con asignaciones
  crossReference: (callData, assignments) => {
    console.log('\n🔗 CRUCE DE INFORMACIÓN:');
    
    const callAnalysis = this.analyzeCallData(callData);
    const assignmentAnalysis = this.analyzeAssignments(assignments);
    
    // Normalizar número de teléfono
    const normalizePhone = (phone) => {
      if (!phone) return '';
      return phone.toString().replace(/[^\d]/g, '').slice(-8); // Últimos 8 dígitos
    };
    
    // Crear mapeo de teléfono a operador
    const phoneToOperator = {};
    assignments.forEach(assignment => {
      const phones = [
        assignment.phone,
        assignment.primaryPhone,
        assignment.telefono,
        assignment.numero_cliente,
        ...(assignment.phones || [])
      ].filter(phone => phone && phone !== 'N/A');
      
      phones.forEach(phone => {
        const normalizedPhone = normalizePhone(phone);
        if (normalizedPhone) {
          phoneToOperator[normalizedPhone] = assignment.operator || assignment.operatorName || 'Sin Asignar';
        }
      });
    });
    
    console.log(`📱 Teléfonos mapeados a operadores: ${Object.keys(phoneToOperator).length}`);
    console.log('📋 Primeros 10 mapeos:', Object.entries(phoneToOperator).slice(0, 10));
    
    // Analizar llamadas que pueden ser mapeadas
    let callsWithOperator = 0;
    const operatorCallCounts = {};
    
    callData.forEach(call => {
      const callPhone = call.phone || call.telefono || call.numero || call.numero_cliente || '';
      const normalizedCallPhone = normalizePhone(callPhone);
      
      if (normalizedCallPhone && phoneToOperator[normalizedCallPhone]) {
        const operator = phoneToOperator[normalizedCallPhone];
        callsWithOperator++;
        
        if (!operatorCallCounts[operator]) {
          operatorCallCounts[operator] = { total: 0, successful: 0, failed: 0 };
        }
        
        operatorCallCounts[operator].total++;
        
        // Analizar éxito/fallo
        const result = (call.result || call.resultado || call.estado || '').toLowerCase();
        const isSuccessful = result.includes('exitosa') || result.includes('exitoso') || 
                           result.includes('contactado') || result.includes('atendida') ||
                           result.includes('respuesta') || result.includes('contesto');
        
        if (isSuccessful) {
          operatorCallCounts[operator].successful++;
        } else {
          operatorCallCounts[operator].failed++;
        }
      }
    });
    
    console.log(`\n📊 RESULTADOS DEL CRUCE:`);
    console.log(`- Llamadas totales: ${callData.length}`);
    console.log(`- Llamadas con operador identificado: ${callsWithOperator}`);
    console.log(`- Porcentaje de cobertura: ${((callsWithOperator / callData.length) * 100).toFixed(1)}%`);
    
    console.log(`\n👩‍💼 MÉTRICAS POR OPERADOR:`);
    Object.entries(operatorCallCounts).forEach(([operator, counts]) => {
      const successRate = counts.total > 0 ? ((counts.successful / counts.total) * 100).toFixed(1) : 0;
      console.log(`- ${operator}: ${counts.total} llamadas (${counts.successful} exitosas, ${counts.failed} fallidas) - ${successRate}% éxito`);
    });
    
    return {
      callsWithOperator,
      coveragePercentage: (callsWithOperator / callData.length) * 100,
      operatorCallCounts,
      phoneToOperator
    };
  }
};

// Instrucciones para usar
console.log('🔍 SCRIPT DE ANÁLISIS PROFUNDO CARGADO');
console.log('\nPara analizar los datos:');
console.log('1. PHONE_ANALYSIS.analyzeCallData(useCallStore.getState().callData)');
console.log('2. PHONE_ANALYSIS.analyzeAssignments(useAppStore.getState().getAllAssignments())');
console.log('3. PHONE_ANALYSIS.crossReference(useCallStore.getState().callData, useAppStore.getState().getAllAssignments())');

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  window.PHONE_ANALYSIS = PHONE_ANALYSIS;
}
