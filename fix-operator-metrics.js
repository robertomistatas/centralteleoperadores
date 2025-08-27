// 📈 Métricas de operador - ENFOQUE DIRECTO DESDE LLAMADAS
getOperatorMetrics: () => {
  try {
    const { callData } = get();
    
    console.log('🔍 ANÁLISIS DIRECTO - Calculando métricas desde llamadas directamente');
    console.log('📊 Total de llamadas en sistema:', callData?.length || 0);

    if (!callData || callData.length === 0) {
      return [];
    }

    // PASO 1: Analizar primeras llamadas para entender estructura
    console.log('🔍 PASO 1: Analizando estructura de llamadas...');
    console.log('📋 Primeras 3 llamadas:', callData.slice(0, 3).map(call => ({
      campos: Object.keys(call),
      beneficiario: call.beneficiary || call.beneficiario || call.nombre,
      resultado: call.result || call.resultado || call.estado,
      operador_directo: call.operator || call.operador || call.teleoperador || call.agent,
      todos_los_campos: call
    })));

    // PASO 2: Verificar distribución real de resultados
    console.log('🔍 PASO 2: Verificando distribución REAL de resultados...');
    const resultStats = { exitosas: 0, fallidas: 0, sin_clasificar: 0 };
    const resultTypes = {};

    callData.forEach(call => {
      const result = (call.result || call.resultado || call.estado || 'sin_estado').toLowerCase();
      resultTypes[result] = (resultTypes[result] || 0) + 1;
      
      const isSuccessful = result.includes('exitosa') || result.includes('exitoso') || 
                         result.includes('contactado') || result.includes('atendida') ||
                         result.includes('respuesta') || result.includes('contesto') ||
                         result.includes('successful') || result.includes('answered');
      
      if (isSuccessful) {
        resultStats.exitosas++;
      } else if (result !== 'sin_estado') {
        resultStats.fallidas++;
      } else {
        resultStats.sin_clasificar++;
      }
    });

    console.log('📊 ESTADÍSTICAS REALES:', resultStats);
    console.log('📊 TIPOS DE RESULTADOS:', resultTypes);

    // PASO 3: NUEVA ESTRATEGIA - Buscar operadoras en múltiples campos
    console.log('🔍 PASO 3: Identificando operadoras directamente...');
    
    // Lista de nombres conocidos de operadoras
    const knownOperators = [
      'Karol Aguayo', 'Daniela Carmona', 'Antonella Valdebenito', 'Javiera Reyes Alvarado',
      'karol', 'daniela', 'antonella', 'javiera'
    ];

    const operatorMetrics = {};
    let unassignedCalls = 0;

    callData.forEach((call, index) => {
      let operatorFound = null;
      
      // Buscar operador en diferentes campos
      const possibleOperators = [
        call.operator, call.operador, call.teleoperador, call.teleoperadora,
        call.agent, call.agente, call.assigned_to, call.assignedTo,
        call.operatorName, call.operator_name
      ].filter(Boolean);

      // Si hay un campo directo de operador
      if (possibleOperators.length > 0) {
        operatorFound = possibleOperators[0];
      } else {
        // Buscar en el contenido de la llamada si menciona alguna operadora conocida
        const callText = JSON.stringify(call).toLowerCase();
        for (const knownOp of knownOperators) {
          if (callText.includes(knownOp.toLowerCase())) {
            operatorFound = knownOp;
            break;
          }
        }
      }

      // Si no se encontró operador, asignar a "Sin Asignar"
      if (!operatorFound) {
        operatorFound = 'Sin Asignar';
        unassignedCalls++;
      }

      // Normalizar nombre del operador
      const normalizedOperator = operatorFound.toString().trim();

      // Inicializar métricas si no existe
      if (!operatorMetrics[normalizedOperator]) {
        operatorMetrics[normalizedOperator] = {
          operatorName: normalizedOperator,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalDuration: 0
        };
      }

      // Contar esta llamada
      const metrics = operatorMetrics[normalizedOperator];
      metrics.totalCalls++;
      metrics.totalDuration += parseInt(call.duration || call.duracion || 0);

      // Determinar éxito de la llamada
      const result = (call.result || call.resultado || call.estado || '').toLowerCase();
      const isSuccessful = result.includes('exitosa') || result.includes('exitoso') || 
                         result.includes('contactado') || result.includes('atendida') ||
                         result.includes('respuesta') || result.includes('contesto') ||
                         result.includes('successful') || result.includes('answered');

      if (isSuccessful) {
        metrics.successfulCalls++;
      } else {
        metrics.failedCalls++;
      }

      // Log de primeras 10 asignaciones para debug
      if (index < 10) {
        console.log(`📞 Llamada ${index}: Operador="${normalizedOperator}", Resultado="${result}", Éxito=${isSuccessful}`);
      }
    });

    console.log(`📊 Llamadas sin asignar: ${unassignedCalls}`);

    // PASO 4: Verificación de integridad matemática
    console.log('🔍 PASO 4: Verificación de integridad matemática...');
    
    let totalByOperators = 0;
    let successfulByOperators = 0;
    let failedByOperators = 0;

    Object.values(operatorMetrics).forEach(metrics => {
      totalByOperators += metrics.totalCalls;
      successfulByOperators += metrics.successfulCalls;
      failedByOperators += metrics.failedCalls;
    });

    console.log('🔍 VERIFICACIÓN CRÍTICA:');
    console.log(`📊 Total llamadas sistema: ${callData.length}`);
    console.log(`📊 Total llamadas operadores: ${totalByOperators}`);
    console.log(`📊 ¿Coinciden totales? ${callData.length === totalByOperators ? '✅ SÍ' : '❌ NO'}`);
    console.log(`📊 Exitosas sistema: ${resultStats.exitosas}`);
    console.log(`📊 Exitosas operadores: ${successfulByOperators}`);
    console.log(`📊 ¿Coinciden exitosas? ${resultStats.exitosas === successfulByOperators ? '✅ SÍ' : '❌ NO'}`);
    console.log(`📊 Fallidas sistema: ${resultStats.fallidas}`);
    console.log(`📊 Fallidas operadores: ${failedByOperators}`);
    console.log(`📊 ¿Coinciden fallidas? ${resultStats.fallidas === failedByOperators ? '✅ SÍ' : '❌ NO'}`);

    // PASO 5: Generar resultado final
    const result = Object.values(operatorMetrics)
      .filter(metrics => metrics.totalCalls > 0) // Solo operadores con llamadas
      .map(metrics => ({
        ...metrics,
        averageDuration: metrics.totalCalls > 0 ? 
          Math.round(metrics.totalDuration / metrics.totalCalls) : 0,
        successRate: metrics.totalCalls > 0 ? 
          Math.round((metrics.successfulCalls / metrics.totalCalls) * 100) : 0
      }))
      .sort((a, b) => b.totalCalls - a.totalCalls); // Ordenar por total de llamadas

    console.log('✅ MÉTRICAS FINALES POR OPERADOR:');
    result.forEach(op => {
      console.log(`👤 ${op.operatorName}: ${op.totalCalls} total, ${op.successfulCalls} exitosas (${op.successRate}%), ${op.failedCalls} fallidas`);
    });

    console.log(`📊 SUMA TOTAL OPERADORES: ${result.reduce((sum, op) => sum + op.totalCalls, 0)}`);

    return result;

  } catch (error) {
    console.error('❌ Error crítico en cálculo de métricas:', error);
    return [];
  }
},
