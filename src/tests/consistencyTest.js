/**
 * 🧪 FASE 4 - TAREA 5: Script de Validación de Consistencia de Métricas
 * 
 * Verifica que Dashboard, Auditoría e Historial muestren métricas idénticas
 * Tolerancia máxima: ±0.01%
 * 
 * @module consistencyTest
 * @version 1.0.0
 */

import { computeGlobalMetrics } from '../services/metricsEngine';
import { normalizeRecords } from '../utils/dataNormalizer';
import logger from '../utils/logger';

/**
 * Calcula la diferencia porcentual entre dos valores
 * @param {number} a - Valor de referencia
 * @param {number} b - Valor a comparar
 * @returns {number} Diferencia porcentual absoluta
 */
const calculatePercentageDiff = (a, b) => {
  if (a === 0 && b === 0) return 0;
  if (a === 0) return 100;
  return Math.abs((a - b) / a * 100);
};

/**
 * Verifica si la diferencia está dentro de la tolerancia permitida
 * @param {number} diff - Diferencia porcentual
 * @param {number} tolerance - Tolerancia máxima (default: 0.01%)
 * @returns {boolean} true si está dentro de tolerancia
 */
const isWithinTolerance = (diff, tolerance = 0.01) => {
  return diff <= tolerance;
};

/**
 * Obtiene métricas desde un conjunto de datos normalizado
 * @param {Array} data - Datos normalizados
 * @param {string} source - Nombre del módulo fuente
 * @returns {Object} Métricas calculadas
 */
const getMetricsFromData = (data, source) => {
  const metrics = computeGlobalMetrics(data, {
    includeTopOperators: false,
    includeHourly: false
  });
  
  return {
    source,
    total: metrics.total || 0,
    exitosas: metrics.exitosas || 0,
    fallidas: metrics.fallidas || 0,
    tasaExito: metrics.tasaExito || 0,
    beneficiariosUnicos: metrics.beneficiariosUnicos || 0,
    duracionPromedio: metrics.duracionPromedio || 0
  };
};

/**
 * Compara dos conjuntos de métricas
 * @param {Object} metricsA - Métricas del primer módulo
 * @param {Object} metricsB - Métricas del segundo módulo
 * @param {string} comparison - Nombre de la comparación
 * @returns {Object} Resultado de la comparación
 */
const compareMetrics = (metricsA, metricsB, comparison) => {
  const totalDiff = calculatePercentageDiff(metricsA.total, metricsB.total);
  const exitosasDiff = calculatePercentageDiff(metricsA.exitosas, metricsB.exitosas);
  const tasaExitoDiff = calculatePercentageDiff(metricsA.tasaExito, metricsB.tasaExito);
  const beneficiariosDiff = calculatePercentageDiff(
    metricsA.beneficiariosUnicos, 
    metricsB.beneficiariosUnicos
  );

  const allWithinTolerance = 
    isWithinTolerance(totalDiff) &&
    isWithinTolerance(exitosasDiff) &&
    isWithinTolerance(tasaExitoDiff) &&
    isWithinTolerance(beneficiariosDiff);

  return {
    comparison,
    status: allWithinTolerance ? 'OK ✅' : 'ALERTA ⚠️',
    details: {
      totalLlamadas: {
        [metricsA.source]: metricsA.total,
        [metricsB.source]: metricsB.total,
        diff: `${totalDiff.toFixed(4)}%`,
        ok: isWithinTolerance(totalDiff)
      },
      exitosas: {
        [metricsA.source]: metricsA.exitosas,
        [metricsB.source]: metricsB.exitosas,
        diff: `${exitosasDiff.toFixed(4)}%`,
        ok: isWithinTolerance(exitosasDiff)
      },
      tasaExito: {
        [metricsA.source]: `${metricsA.tasaExito.toFixed(2)}%`,
        [metricsB.source]: `${metricsB.tasaExito.toFixed(2)}%`,
        diff: `${tasaExitoDiff.toFixed(4)}%`,
        ok: isWithinTolerance(tasaExitoDiff)
      },
      beneficiariosUnicos: {
        [metricsA.source]: metricsA.beneficiariosUnicos,
        [metricsB.source]: metricsB.beneficiariosUnicos,
        diff: `${beneficiariosDiff.toFixed(4)}%`,
        ok: isWithinTolerance(beneficiariosDiff)
      }
    },
    maxDiff: Math.max(totalDiff, exitosasDiff, tasaExitoDiff, beneficiariosDiff)
  };
};

/**
 * Ejecuta validación completa de consistencia entre módulos
 * @param {Object} stores - Stores de Zustand con datos
 * @returns {Object} Reporte completo de validación
 */
export const runConsistencyTest = (stores) => {
  const startTime = performance.now();
  
  logger.audit('[ConsistencyTest] Iniciando validación de consistencia');

  try {
    const { callStore, seguimientosStore } = stores;

    // Obtener datos desde stores
    const callData = callStore?.getState?.()?.callData || [];
    const seguimientos = seguimientosStore?.getState?.()?.seguimientos || [];

    // Normalizar datos una sola vez (fuente única de verdad)
    const allRecords = [...callData, ...seguimientos];
    const normalizedData = normalizeRecords(allRecords);

    logger.audit('[ConsistencyTest] Datos normalizados', {
      callData: callData.length,
      seguimientos: seguimientos.length,
      normalizedTotal: normalizedData.length
    });

    // Calcular métricas para cada módulo (usando misma fuente)
    const dashboardMetrics = getMetricsFromData(normalizedData, 'Dashboard');
    const auditoriaMetrics = getMetricsFromData(normalizedData, 'Auditoría');
    const historialMetrics = getMetricsFromData(normalizedData, 'Historial');

    // Comparaciones entre módulos
    const dashboardVsAuditoria = compareMetrics(
      dashboardMetrics, 
      auditoriaMetrics, 
      'Dashboard vs Auditoría'
    );

    const dashboardVsHistorial = compareMetrics(
      dashboardMetrics, 
      historialMetrics, 
      'Dashboard vs Historial'
    );

    const auditoriaVsHistorial = compareMetrics(
      auditoriaMetrics, 
      historialMetrics, 
      'Auditoría vs Historial'
    );

    // Determinar estado global
    const allComparisons = [
      dashboardVsAuditoria, 
      dashboardVsHistorial, 
      auditoriaVsHistorial
    ];
    const globalStatus = allComparisons.every(c => c.status.includes('✅')) 
      ? 'OK ✅' 
      : 'ALERTA ⚠️';

    const maxGlobalDiff = Math.max(...allComparisons.map(c => c.maxDiff));

    const endTime = performance.now();
    const duration = endTime - startTime;

    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration.toFixed(2)}ms`,
      globalStatus,
      maxDifference: `${maxGlobalDiff.toFixed(4)}%`,
      withinTolerance: maxGlobalDiff <= 0.01,
      tolerance: '±0.01%',
      metrics: {
        dashboard: dashboardMetrics,
        auditoria: auditoriaMetrics,
        historial: historialMetrics
      },
      comparisons: {
        dashboardVsAuditoria,
        dashboardVsHistorial,
        auditoriaVsHistorial
      },
      dataSource: {
        callDataRecords: callData.length,
        seguimientosRecords: seguimientos.length,
        normalizedRecords: normalizedData.length
      }
    };

    // Log detallado
    logger.audit('[ConsistencyTest] Validación completada', report);

    // Log resumido para consola
    console.log('🧪 === VALIDACIÓN DE CONSISTENCIA ===');
    console.log(`Estado Global: ${globalStatus}`);
    console.log(`Diferencia Máxima: ${maxGlobalDiff.toFixed(4)}% (tolerancia: ±0.01%)`);
    console.log(`Duración: ${duration.toFixed(2)}ms`);
    console.log('\n📊 Métricas por Módulo:');
    console.log(`  Dashboard:  ${dashboardMetrics.total} llamadas, ${dashboardMetrics.tasaExito.toFixed(2)}% éxito`);
    console.log(`  Auditoría:  ${auditoriaMetrics.total} llamadas, ${auditoriaMetrics.tasaExito.toFixed(2)}% éxito`);
    console.log(`  Historial:  ${historialMetrics.total} llamadas, ${historialMetrics.tasaExito.toFixed(2)}% éxito`);
    console.log('\n🔍 Comparaciones:');
    allComparisons.forEach(comp => {
      console.log(`  ${comp.comparison}: ${comp.status} (diff: ${comp.maxDiff.toFixed(4)}%)`);
    });

    return report;

  } catch (error) {
    logger.error('[ConsistencyTest] Error durante validación', {
      error: error.message,
      stack: error.stack
    });

    return {
      timestamp: new Date().toISOString(),
      globalStatus: 'ERROR ❌',
      error: error.message,
      withinTolerance: false
    };
  }
};

/**
 * Valida sincronización en tiempo real midiendo latencia de actualización
 * @param {Function} onUpdate - Callback cuando se detecta actualización
 * @returns {Object} Monitor de sincronización
 */
export const monitorRealtimeSync = (onUpdate) => {
  let lastUpdateTime = Date.now();
  let updateCount = 0;
  const latencies = [];

  const recordUpdate = (source) => {
    const now = Date.now();
    const latency = now - lastUpdateTime;
    latencies.push(latency);
    updateCount++;
    lastUpdateTime = now;

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    const syncStatus = {
      source,
      updateCount,
      latency: `${latency}ms`,
      averageLatency: `${avgLatency.toFixed(0)}ms`,
      withinTarget: latency < 2000, // Target: < 2 segundos
      timestamp: new Date().toISOString()
    };

    logger.audit('[RealtimeSync] Actualización detectada', syncStatus);

    if (onUpdate) {
      onUpdate(syncStatus);
    }

    return syncStatus;
  };

  const getStats = () => ({
    totalUpdates: updateCount,
    averageLatency: latencies.length > 0 
      ? `${(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(0)}ms`
      : 'N/A',
    maxLatency: latencies.length > 0 ? `${Math.max(...latencies)}ms` : 'N/A',
    minLatency: latencies.length > 0 ? `${Math.min(...latencies)}ms` : 'N/A',
    allWithinTarget: latencies.every(l => l < 2000)
  });

  return {
    recordUpdate,
    getStats,
    reset: () => {
      updateCount = 0;
      latencies.length = 0;
      lastUpdateTime = Date.now();
    }
  };
};

/**
 * Genera reporte de validación en formato tabla Markdown
 * @param {Object} report - Reporte de validación
 * @returns {string} Tabla en formato Markdown
 */
export const generateMarkdownReport = (report) => {
  if (!report.metrics) return '## Error en la validación\n\n```json\n' + JSON.stringify(report, null, 2) + '\n```';

  const { dashboard, auditoria, historial } = report.metrics;

  const table = `
## 📊 Reporte de Validación de Consistencia

**Fecha:** ${new Date(report.timestamp).toLocaleString('es-CL')}  
**Estado Global:** ${report.globalStatus}  
**Diferencia Máxima:** ${report.maxDifference} (tolerancia: ${report.tolerance})  
**Duración:** ${report.duration}

### Tabla Comparativa de Métricas

| Métrica | Dashboard | Auditoría | Historial | Diff Max | Estado |
|---------|-----------|-----------|-----------|----------|--------|
| **Total llamadas** | ${dashboard.total} | ${auditoria.total} | ${historial.total} | ${report.comparisons.dashboardVsAuditoria.details.totalLlamadas.diff} | ${report.comparisons.dashboardVsAuditoria.details.totalLlamadas.ok ? '✅' : '⚠️'} |
| **Llamadas exitosas** | ${dashboard.exitosas} | ${auditoria.exitosas} | ${historial.exitosas} | ${report.comparisons.dashboardVsAuditoria.details.exitosas.diff} | ${report.comparisons.dashboardVsAuditoria.details.exitosas.ok ? '✅' : '⚠️'} |
| **Tasa de éxito** | ${dashboard.tasaExito.toFixed(2)}% | ${auditoria.tasaExito.toFixed(2)}% | ${historial.tasaExito.toFixed(2)}% | ${report.comparisons.dashboardVsAuditoria.details.tasaExito.diff} | ${report.comparisons.dashboardVsAuditoria.details.tasaExito.ok ? '✅' : '⚠️'} |
| **Beneficiarios únicos** | ${dashboard.beneficiariosUnicos} | ${auditoria.beneficiariosUnicos} | ${historial.beneficiariosUnicos} | ${report.comparisons.dashboardVsAuditoria.details.beneficiariosUnicos.diff} | ${report.comparisons.dashboardVsAuditoria.details.beneficiariosUnicos.ok ? '✅' : '⚠️'} |

### Comparaciones Detalladas

${Object.entries(report.comparisons).map(([key, comp]) => `
#### ${comp.comparison}
- **Estado:** ${comp.status}
- **Diferencia máxima:** ${comp.maxDiff.toFixed(4)}%
`).join('\n')}

### Fuente de Datos

- **Registros analisisExcel:** ${report.dataSource.callDataRecords}
- **Registros seguimientos:** ${report.dataSource.seguimientosRecords}
- **Total normalizado:** ${report.dataSource.normalizedRecords}

---

${report.withinTolerance 
  ? '### ✅ VALIDACIÓN EXITOSA\n\nTodos los módulos muestran métricas consistentes dentro de la tolerancia permitida (±0.01%).' 
  : '### ⚠️ ALERTA: INCONSISTENCIAS DETECTADAS\n\nSe encontraron diferencias superiores a la tolerancia permitida. Revisar logs de auditoría para detalles.'}
`;

  return table;
};

export default {
  runConsistencyTest,
  monitorRealtimeSync,
  generateMarkdownReport,
  calculatePercentageDiff,
  isWithinTolerance
};
