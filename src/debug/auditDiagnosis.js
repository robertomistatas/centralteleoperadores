/**
 * Script específico para diagnosticar el problema de Auditoría Avanzada
 * Este script se puede ejecutar desde la consola del navegador
 */

export const diagnoseAuditProblem = () => {
  console.log('🚨 [AUDIT DIAGNOSIS] === DIAGNÓSTICO ESPECÍFICO DEL PROBLEMA ===');
  
  // 1. Verificar que los stores estén disponibles
  const appStore = window.useAppStore?.getState();
  const callStore = window.useCallStore?.getState();
  
  if (!appStore) {
    console.error('❌ [AUDIT DIAGNOSIS] useAppStore no está disponible en window');
    return;
  }
  
  if (!callStore) {
    console.error('❌ [AUDIT DIAGNOSIS] useCallStore no está disponible en window');
    return;
  }
  
  console.log('✅ [AUDIT DIAGNOSIS] Stores disponibles');
  
  // 2. Verificar datos básicos
  console.log('\n📊 [AUDIT DIAGNOSIS] ESTADO DE DATOS:');
  console.log('- Operadores:', appStore.operators?.length || 0);
  console.log('- Asignaciones activas:', Object.keys(appStore.operatorAssignments || {}).length);
  console.log('- Llamadas procesadas:', callStore.processedData?.length || 0);
  console.log('- CallData crudo:', callStore.callData?.length || 0);
  
  // 3. Análisis detallado de asignaciones
  console.log('\n📋 [AUDIT DIAGNOSIS] ANÁLISIS DE ASIGNACIONES:');
  if (appStore.operatorAssignments) {
    Object.entries(appStore.operatorAssignments).forEach(([operatorId, assignments]) => {
      const operator = appStore.operators?.find(op => op.id === operatorId);
      console.log(`👤 ${operator?.name || operatorId}: ${assignments?.length || 0} beneficiarios`);
      
      if (assignments && assignments.length > 0) {
        console.log(`   📋 Primer beneficiario: "${assignments[0]?.beneficiary || assignments[0]?.beneficiario}"`);
      }
    });
  }
  
  // 4. Análisis de llamadas procesadas
  console.log('\n📞 [AUDIT DIAGNOSIS] ANÁLISIS DE LLAMADAS:');
  if (callStore.processedData && callStore.processedData.length > 0) {
    console.log('✅ Hay llamadas procesadas disponibles');
    
    // Mostrar muestra de las primeras 3 llamadas
    callStore.processedData.slice(0, 3).forEach((call, index) => {
      console.log(`📞 Llamada ${index + 1}:`, {
        beneficiario: call.beneficiario || call.beneficiary,
        operador: call.operador || call.operator,
        resultado: call.resultado || call.categoria,
        duracion: call.duracion
      });
    });
    
    // Verificar coincidencias entre beneficiarios de llamadas y asignaciones
    const beneficiariosEnLlamadas = new Set(
      callStore.processedData.map(call => call.beneficiario || call.beneficiary)
    );
    
    const beneficiariosEnAsignaciones = new Set();
    Object.values(appStore.operatorAssignments || {}).forEach(assignments => {
      if (assignments && Array.isArray(assignments)) {
        assignments.forEach(a => {
          beneficiariosEnAsignaciones.add(a.beneficiary || a.beneficiario);
        });
      }
    });
    
    console.log(`🔍 Beneficiarios en llamadas: ${beneficiariosEnLlamadas.size}`);
    console.log(`🔍 Beneficiarios en asignaciones: ${beneficiariosEnAsignaciones.size}`);
    
    // Buscar coincidencias
    const coincidencias = Array.from(beneficiariosEnLlamadas).filter(b => 
      beneficiariosEnAsignaciones.has(b)
    );
    
    console.log(`🎯 Coincidencias encontradas: ${coincidencias.length}`);
    if (coincidencias.length > 0) {
      console.log('✅ Ejemplos de coincidencias:', coincidencias.slice(0, 3));
    } else {
      console.log('❌ No hay coincidencias - ESTE ES EL PROBLEMA');
      console.log('📋 Muestra llamadas:', Array.from(beneficiariosEnLlamadas).slice(0, 3));
      console.log('📋 Muestra asignaciones:', Array.from(beneficiariosEnAsignaciones).slice(0, 3));
    }
  } else {
    console.log('❌ No hay llamadas procesadas disponibles');
  }
  
  // 5. Probar función getOperatorMetrics directamente
  console.log('\n📈 [AUDIT DIAGNOSIS] PROBANDO getOperatorMetrics:');
  
  try {
    const metrics = callStore.getOperatorMetrics(appStore.operators, appStore.operatorAssignments);
    console.log('📊 Resultado de getOperatorMetrics:', metrics);
    
    if (metrics.length === 0) {
      console.log('❌ getOperatorMetrics devuelve array vacío - CONFIRMADO EL PROBLEMA');
    } else {
      console.log('✅ getOperatorMetrics funciona correctamente');
      metrics.forEach((metric, index) => {
        console.log(`${index + 1}. ${metric.operador}: ${metric.totalLlamadas} llamadas`);
      });
    }
  } catch (error) {
    console.error('❌ Error ejecutando getOperatorMetrics:', error);
  }
  
  // 6. Recomendaciones
  console.log('\n🔧 [AUDIT DIAGNOSIS] RECOMENDACIONES:');
  
  if (callStore.processedData?.length === 0) {
    console.log('❌ PROBLEMA: No hay datos de llamadas procesados');
    console.log('💡 SOLUCIÓN: Cargar archivo Excel con datos de llamadas');
  } else if (Object.keys(appStore.operatorAssignments || {}).length === 0) {
    console.log('❌ PROBLEMA: No hay asignaciones de operadores');
    console.log('💡 SOLUCIÓN: Configurar asignaciones en el módulo de Asignaciones');
  } else {
    console.log('🔍 PROBLEMA: Datos disponibles pero no se mapean correctamente');
    console.log('💡 SOLUCIÓN: Verificar formato de nombres de beneficiarios');
  }
  
  console.log('\n✅ [AUDIT DIAGNOSIS] DIAGNÓSTICO COMPLETADO');
};

// Hacer disponible globalmente para consola del navegador
window.diagnoseAuditProblem = diagnoseAuditProblem;

// Auto-ejecutar en desarrollo
if (import.meta.env.DEV) {
  setTimeout(() => {
    console.log('🔧 Auto-ejecutando diagnóstico de auditoría...');
    diagnoseAuditProblem();
  }, 3000);
}
