/**
 * metricsUtils.js
 * Utilidad centralizada para cálculo de métricas unificadas
 * 
 * FASE 2 - TAREA 3: Métricas consistentes entre todos los módulos
 * FASE 3 - TAREA 1: Integración con dataNormalizer para normalización global
 * 
 * Propósito:
 * - Eliminar cálculos duplicados en Dashboard, Auditoría, Historial
 * - Normalizar campos y lógica de cálculo usando dataNormalizer
 * - Proveer una única fuente de verdad para métricas
 * 
 * Módulos que lo usan:
 * - Dashboard (métricas generales)
 * - Auditoría Avanzada (métricas detalladas)
 * - Historial de Seguimientos (estadísticas)
 * - Seguimientos Periódicos (performance de operadoras)
 * - Análisis de Excel (consolidación de datos)
 * 
 * @module metricsUtils
 */

import logger from './logger';
import {
  normalizeBeneficiary,
  cleanPhone,
  normalizeCallResult,
  normalizeOperator
} from './dataNormalizer';

/**
 * Normaliza un campo de nombre de beneficiario
 * DEPRECATED: Usar normalizeBeneficiary de dataNormalizer
 * Mantenido por compatibilidad
 * 
 * @param {string} value - Valor a normalizar
 * @returns {string} Valor normalizado
 */
export const normalizeBeneficiario = (value) => {
  if (!value) return '';
  const normalized = normalizeBeneficiary({ nombre: value });
  return normalized.name.toLowerCase();
};

/**
 * Normaliza un campo de teléfono
 * UPDATED: Usa cleanPhone de dataNormalizer
 * 
 * @param {string} value - Valor a normalizar
 * @returns {string} Valor normalizado
 */
export const normalizeTelefono = (value) => {
  return cleanPhone(value);
};

/**
 * Normaliza un campo de resultado/clasificación
 * UPDATED: Usa normalizeCallResult de dataNormalizer
 * 
 * @param {string} value - Valor a normalizar
 * @returns {string} Valor normalizado
 */
export const normalizeResultado = (value) => {
  const normalized = normalizeCallResult(value);
  return normalized.replace(/\s+/g, '_');
};

/**
 * Normaliza un campo de operadora
 * UPDATED: Usa normalizeOperator de dataNormalizer
 * 
 * @param {string} value - Valor a normalizar
 * @returns {string} Valor normalizado
 */
export const normalizeOperadora = (value) => {
  const normalized = normalizeOperator({ operatorName: value });
  return normalized.name.toLowerCase();
};

/**
 * Calcula métricas unificadas desde un array de análisis
 * 
 * @param {Array<Object>} analyses - Array de análisis de Excel desde Firestore
 * @returns {Object} Métricas unificadas
 * 
 * @example
 * const metrics = computeUnifiedMetrics(analyses);
 * console.log(metrics.tasaExito); // "85.5"
 */
export const computeUnifiedMetrics = (analyses) => {
  logger.info('[metricsUtils] Calculando métricas unificadas...', {
    analysesCount: analyses?.length || 0
  });

  // Validación inicial
  if (!analyses || !Array.isArray(analyses) || analyses.length === 0) {
    logger.warn('[metricsUtils] No hay análisis para calcular métricas');
    return {
      total: 0,
      exitosas: 0,
      fallidas: 0,
      sinIdentificar: 0,
      tasaExito: '0.0',
      tasaFallo: '0.0',
      tasaSinIdentificar: '0.0',
      operadoras: {},
      porFecha: {},
      lastUpdated: new Date().toISOString()
    };
  }

  // Acumuladores
  let total = 0;
  let exitosas = 0;
  let fallidas = 0;
  let sinIdentificar = 0;

  const operadoras = {};
  const porFecha = {};

  // Iterar sobre cada análisis
  analyses.forEach(analysis => {
    // Validar estructura del análisis
    if (!analysis) return;

    // Sumar totales
    const analysisTotal = analysis.totalRows || 0;
    total += analysisTotal;
    exitosas += analysis.exitosas || 0;
    fallidas += analysis.fallidas || 0;
    sinIdentificar += analysis.sinIdentificar || 0;

    // Agregar métricas por operadora
    if (analysis.metricsByOperator) {
      Object.entries(analysis.metricsByOperator).forEach(([operadora, metrics]) => {
        const normalizedOp = normalizeOperadora(operadora);

        if (!operadoras[normalizedOp]) {
          operadoras[normalizedOp] = {
            nombre: operadora,
            total: 0,
            exitosas: 0,
            fallidas: 0,
            sinIdentificar: 0
          };
        }

        operadoras[normalizedOp].total += metrics.total || 0;
        operadoras[normalizedOp].exitosas += metrics.exitosas || 0;
        operadoras[normalizedOp].fallidas += metrics.fallidas || 0;
        operadoras[normalizedOp].sinIdentificar += metrics.sinIdentificar || 0;
      });
    }

    // Agregar métricas por fecha
    if (analysis.processedAt) {
      const fecha = analysis.processedAt.split('T')[0]; // YYYY-MM-DD

      if (!porFecha[fecha]) {
        porFecha[fecha] = {
          total: 0,
          exitosas: 0,
          fallidas: 0,
          sinIdentificar: 0,
          archivos: 0
        };
      }

      porFecha[fecha].total += analysisTotal;
      porFecha[fecha].exitosas += analysis.exitosas || 0;
      porFecha[fecha].fallidas += analysis.fallidas || 0;
      porFecha[fecha].sinIdentificar += analysis.sinIdentificar || 0;
      porFecha[fecha].archivos += 1;
    }
  });

  // Calcular tasas porcentuales
  const tasaExito = total > 0 ? ((exitosas / total) * 100).toFixed(1) : '0.0';
  const tasaFallo = total > 0 ? ((fallidas / total) * 100).toFixed(1) : '0.0';
  const tasaSinIdentificar = total > 0 ? ((sinIdentificar / total) * 100).toFixed(1) : '0.0';

  // Calcular tasas por operadora
  Object.keys(operadoras).forEach(key => {
    const op = operadoras[key];
    if (op.total > 0) {
      op.tasaExito = ((op.exitosas / op.total) * 100).toFixed(1);
      op.tasaFallo = ((op.fallidas / op.total) * 100).toFixed(1);
    } else {
      op.tasaExito = '0.0';
      op.tasaFallo = '0.0';
    }
  });

  // Calcular tasas por fecha
  Object.keys(porFecha).forEach(fecha => {
    const metrics = porFecha[fecha];
    if (metrics.total > 0) {
      metrics.tasaExito = ((metrics.exitosas / metrics.total) * 100).toFixed(1);
    } else {
      metrics.tasaExito = '0.0';
    }
  });

  const unifiedMetrics = {
    // Totales generales
    total,
    exitosas,
    fallidas,
    sinIdentificar,

    // Tasas porcentuales
    tasaExito,
    tasaFallo,
    tasaSinIdentificar,

    // Desglose por operadora
    operadoras,

    // Desglose por fecha
    porFecha,

    // Metadata
    totalAnalyses: analyses.length,
    lastUpdated: new Date().toISOString()
  };

  logger.info('[metricsUtils] Métricas calculadas exitosamente', {
    total,
    exitosas,
    tasaExito,
    operadorasCount: Object.keys(operadoras).length,
    fechasCount: Object.keys(porFecha).length
  });

  return unifiedMetrics;
};

/**
 * Calcula métricas para un período específico
 * 
 * @param {Array<Object>} analyses - Array de análisis
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate - Fecha de fin
 * @returns {Object} Métricas del período
 */
export const computeMetricsForPeriod = (analyses, startDate, endDate) => {
  logger.info('[metricsUtils] Calculando métricas para período', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });

  const filteredAnalyses = analyses.filter(analysis => {
    if (!analysis.processedAt) return false;
    const processedDate = new Date(analysis.processedAt);
    return processedDate >= startDate && processedDate <= endDate;
  });

  return computeUnifiedMetrics(filteredAnalyses);
};

/**
 * Obtiene el top N de operadoras por tasa de éxito
 * 
 * @param {Object} metrics - Métricas unificadas (de computeUnifiedMetrics)
 * @param {number} topN - Cantidad de operadoras a retornar
 * @returns {Array<Object>} Array de operadoras ordenadas por tasa de éxito
 */
export const getTopOperatorsBySuccess = (metrics, topN = 5) => {
  if (!metrics || !metrics.operadoras) return [];

  const operadorasArray = Object.entries(metrics.operadoras).map(([key, data]) => ({
    key,
    ...data
  }));

  return operadorasArray
    .sort((a, b) => parseFloat(b.tasaExito) - parseFloat(a.tasaExito))
    .slice(0, topN);
};

/**
 * Calcula tendencia de métricas (comparación entre dos períodos)
 * 
 * @param {Object} currentMetrics - Métricas del período actual
 * @param {Object} previousMetrics - Métricas del período anterior
 * @returns {Object} Tendencias con porcentajes de cambio
 */
export const calculateTrends = (currentMetrics, previousMetrics) => {
  logger.info('[metricsUtils] Calculando tendencias...');

  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return (((current - previous) / previous) * 100).toFixed(1);
  };

  return {
    total: {
      current: currentMetrics.total,
      previous: previousMetrics.total,
      change: calculateChange(currentMetrics.total, previousMetrics.total),
      trend: currentMetrics.total > previousMetrics.total ? 'up' : 'down'
    },
    exitosas: {
      current: currentMetrics.exitosas,
      previous: previousMetrics.exitosas,
      change: calculateChange(currentMetrics.exitosas, previousMetrics.exitosas),
      trend: currentMetrics.exitosas > previousMetrics.exitosas ? 'up' : 'down'
    },
    tasaExito: {
      current: parseFloat(currentMetrics.tasaExito),
      previous: parseFloat(previousMetrics.tasaExito),
      change: calculateChange(
        parseFloat(currentMetrics.tasaExito),
        parseFloat(previousMetrics.tasaExito)
      ),
      trend: parseFloat(currentMetrics.tasaExito) > parseFloat(previousMetrics.tasaExito) ? 'up' : 'down'
    }
  };
};

/**
 * Formatea métricas para visualización en UI
 * Agrega separadores de miles, símbolos de porcentaje, etc.
 * 
 * @param {Object} metrics - Métricas a formatear
 * @returns {Object} Métricas formateadas
 */
export const formatMetricsForUI = (metrics) => {
  return {
    ...metrics,
    totalFormatted: metrics.total.toLocaleString('es-CL'),
    exitosasFormatted: metrics.exitosas.toLocaleString('es-CL'),
    fallidasFormatted: metrics.fallidas.toLocaleString('es-CL'),
    tasaExitoFormatted: `${metrics.tasaExito}%`,
    tasaFalloFormatted: `${metrics.tasaFallo}%`,
    lastUpdatedFormatted: new Date(metrics.lastUpdated).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
};

/**
 * Exporta todo como default para import completo
 */
export default {
  computeUnifiedMetrics,
  computeMetricsForPeriod,
  getTopOperatorsBySuccess,
  calculateTrends,
  formatMetricsForUI,
  normalizeBeneficiario,
  normalizeTelefono,
  normalizeResultado,
  normalizeOperadora
};
