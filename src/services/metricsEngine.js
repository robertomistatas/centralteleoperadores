/**
 * metricsEngine.js
 * Motor unificado de cálculo de métricas
 * 
 * FASE 3 - TAREA 2: Servicio Unificado de Métricas
 * 
 * Objetivo:
 * Centralizar TODOS los cálculos de métricas en un único motor
 * usado por Dashboard, Auditoría Avanzada, Historial y Excel.
 * 
 * Elimina completamente los cálculos locales duplicados.
 * 
 * @module metricsEngine
 */

import logger from '../utils/logger';
import {
  normalizeRecord,
  normalizeRecords,
  groupByOperator,
  groupByResult,
  groupByDate
} from '../utils/dataNormalizer';

/**
 * Calcula métricas globales consolidadas
 * 
 * @param {Array} records - Array de registros (pueden estar sin normalizar)
 * @param {Object} options - Opciones de cálculo
 * @returns {Object} Métricas globales
 */
export const computeGlobalMetrics = (records = [], options = {}) => {
  const startTime = Date.now();
  
  logger.info('[MetricsEngine] Iniciando cálculo de métricas globales', {
    recordsCount: records.length,
    options
  });

  // Normalizar todos los registros primero
  const normalizedRecords = normalizeRecords(records);
  
  if (normalizedRecords.length === 0) {
    logger.warn('[MetricsEngine] No hay registros normalizados para calcular');
    return getEmptyMetrics();
  }

  // Totales básicos
  const total = normalizedRecords.length;
  const byResult = groupByResult(normalizedRecords);
  const exitosas = byResult.exitosas.length;
  const fallidas = byResult.fallidas.length;
  const sinIdentificar = byResult.sinIdentificar.length;

  // Tasa de éxito
  const tasaExito = total > 0 ? (exitosas / total) * 100 : 0;
  const tasaFallida = total > 0 ? (fallidas / total) * 100 : 0;

  // Métricas por operadora
  const byOperator = groupByOperator(normalizedRecords);
  const porOperadora = {};

  Object.entries(byOperator).forEach(([operatorName, operatorRecords]) => {
    const operatorByResult = groupByResult(operatorRecords);
    const operatorTotal = operatorRecords.length;
    const operatorExitosas = operatorByResult.exitosas.length;
    const operatorFallidas = operatorByResult.fallidas.length;

    porOperadora[operatorName] = {
      total: operatorTotal,
      exitosas: operatorExitosas,
      fallidas: operatorFallidas,
      sinIdentificar: operatorByResult.sinIdentificar.length,
      tasaExito: operatorTotal > 0 ? (operatorExitosas / operatorTotal) * 100 : 0,
      tasaFallida: operatorTotal > 0 ? (operatorFallidas / operatorTotal) * 100 : 0,
      porcentajeDelTotal: total > 0 ? (operatorTotal / total) * 100 : 0
    };
  });

  // Métricas por fecha
  const byDate = groupByDate(normalizedRecords);
  const porFecha = {};

  Object.entries(byDate).forEach(([date, dateRecords]) => {
    const dateByResult = groupByResult(dateRecords);
    const dateTotal = dateRecords.length;

    porFecha[date] = {
      total: dateTotal,
      exitosas: dateByResult.exitosas.length,
      fallidas: dateByResult.fallidas.length,
      sinIdentificar: dateByResult.sinIdentificar.length,
      tasaExito: dateTotal > 0 ? (dateByResult.exitosas.length / dateTotal) * 100 : 0
    };
  });

  // Top operadoras por tasa de éxito
  const topOperadoras = Object.entries(porOperadora)
    .sort((a, b) => b[1].tasaExito - a[1].tasaExito)
    .slice(0, options.topN || 10)
    .map(([name, metrics]) => ({ name, ...metrics }));

  // Métricas de cobertura (beneficiarios únicos)
  const uniqueBeneficiaries = new Set(
    normalizedRecords
      .filter(r => r.beneficiaryName)
      .map(r => r.beneficiaryName.toLowerCase())
  );

  const uniquePhones = new Set(
    normalizedRecords
      .filter(r => r.phone)
      .map(r => r.phone)
  );

  // Días con actividad
  const uniqueDates = Object.keys(porFecha).filter(date => date !== 'Sin fecha');

  const elapsedTime = Date.now() - startTime;
  
  logger.info('[MetricsEngine] Métricas calculadas exitosamente', {
    total,
    exitosas,
    fallidas,
    operadoras: Object.keys(porOperadora).length,
    beneficiarios: uniqueBeneficiaries.size,
    elapsedTime: `${elapsedTime}ms`
  });

  return {
    // Totales
    total,
    exitosas,
    fallidas,
    sinIdentificar,
    
    // Tasas
    tasaExito: parseFloat(tasaExito.toFixed(2)),
    tasaFallida: parseFloat(tasaFallida.toFixed(2)),
    
    // Por operadora
    porOperadora,
    topOperadoras,
    totalOperadoras: Object.keys(porOperadora).length,
    
    // Por fecha
    porFecha,
    diasConActividad: uniqueDates.length,
    
    // Cobertura
    beneficiariosUnicos: uniqueBeneficiaries.size,
    telefonosUnicos: uniquePhones.size,
    
    // Promedios
    promedioLlamadasPorDia: uniqueDates.length > 0 ? total / uniqueDates.length : 0,
    promedioLlamadasPorOperadora: Object.keys(porOperadora).length > 0 
      ? total / Object.keys(porOperadora).length 
      : 0,
    
    // Metadata
    fechaCalculo: new Date().toISOString(),
    tiempoCalculo: elapsedTime
  };
};

/**
 * Retorna objeto de métricas vacío
 * @returns {Object}
 */
const getEmptyMetrics = () => ({
  total: 0,
  exitosas: 0,
  fallidas: 0,
  sinIdentificar: 0,
  tasaExito: 0,
  tasaFallida: 0,
  porOperadora: {},
  topOperadoras: [],
  totalOperadoras: 0,
  porFecha: {},
  diasConActividad: 0,
  beneficiariosUnicos: 0,
  telefonosUnicos: 0,
  promedioLlamadasPorDia: 0,
  promedioLlamadasPorOperadora: 0,
  fechaCalculo: new Date().toISOString(),
  tiempoCalculo: 0
});

/**
 * Calcula métricas para un período específico
 * 
 * @param {Array} records - Registros a analizar
 * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
 * @param {string} endDate - Fecha fin (YYYY-MM-DD)
 * @returns {Object} Métricas del período
 */
export const computePeriodMetrics = (records = [], startDate, endDate) => {
  logger.info('[MetricsEngine] Calculando métricas para período', {
    startDate,
    endDate,
    totalRecords: records.length
  });

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Incluir todo el día final

  const filteredRecords = records.filter(record => {
    const recordDate = new Date(record.fecha || record.date);
    return recordDate >= start && recordDate <= end;
  });

  logger.info('[MetricsEngine] Registros en período', {
    filtered: filteredRecords.length
  });

  return computeGlobalMetrics(filteredRecords);
};

/**
 * Compara métricas entre dos períodos
 * 
 * @param {Array} records - Todos los registros
 * @param {string} period1Start - Inicio período 1
 * @param {string} period1End - Fin período 1
 * @param {string} period2Start - Inicio período 2
 * @param {string} period2End - Fin período 2
 * @returns {Object} Comparación de métricas
 */
export const comparePeriodsMetrics = (
  records,
  period1Start,
  period1End,
  period2Start,
  period2End
) => {
  const metrics1 = computePeriodMetrics(records, period1Start, period1End);
  const metrics2 = computePeriodMetrics(records, period2Start, period2End);

  const calculateChange = (oldValue, newValue) => {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  };

  return {
    period1: {
      start: period1Start,
      end: period1End,
      metrics: metrics1
    },
    period2: {
      start: period2Start,
      end: period2End,
      metrics: metrics2
    },
    changes: {
      total: {
        absolute: metrics2.total - metrics1.total,
        percentage: calculateChange(metrics1.total, metrics2.total)
      },
      exitosas: {
        absolute: metrics2.exitosas - metrics1.exitosas,
        percentage: calculateChange(metrics1.exitosas, metrics2.exitosas)
      },
      tasaExito: {
        absolute: metrics2.tasaExito - metrics1.tasaExito,
        percentage: calculateChange(metrics1.tasaExito, metrics2.tasaExito)
      }
    }
  };
};

/**
 * Calcula métricas por operadora específica
 * 
 * @param {Array} records - Todos los registros
 * @param {string} operatorName - Nombre de la operadora
 * @returns {Object} Métricas de la operadora
 */
export const computeOperatorMetrics = (records = [], operatorName) => {
  logger.info('[MetricsEngine] Calculando métricas para operadora', {
    operatorName,
    totalRecords: records.length
  });

  const normalizedRecords = normalizeRecords(records);
  const operatorRecords = normalizedRecords.filter(
    r => r.operatorName.toLowerCase() === operatorName.toLowerCase()
  );

  if (operatorRecords.length === 0) {
    logger.warn('[MetricsEngine] No hay registros para operadora', { operatorName });
    return getEmptyMetrics();
  }

  return computeGlobalMetrics(operatorRecords, {
    operatorName
  });
};

/**
 * Calcula tendencias (últimos N días vs anteriores N días)
 * 
 * @param {Array} records - Todos los registros
 * @param {number} days - Número de días para comparar
 * @returns {Object} Análisis de tendencias
 */
export const computeTrends = (records = [], days = 30) => {
  const now = new Date();
  const recentEnd = now.toISOString().split('T')[0];
  const recentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  
  const previousEnd = new Date(now.getTime() - (days + 1) * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const previousStart = new Date(now.getTime() - (days * 2) * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return comparePeriodsMetrics(
    records,
    previousStart,
    previousEnd,
    recentStart,
    recentEnd
  );
};

/**
 * Exporta métricas formateadas para UI
 * 
 * @param {Object} metrics - Métricas calculadas
 * @param {string} locale - Locale para formateo (default: 'es-CL')
 * @returns {Object} Métricas formateadas
 */
export const formatMetricsForUI = (metrics, locale = 'es-CL') => {
  const formatNumber = (num) => num.toLocaleString(locale);
  const formatPercent = (num) => `${num.toFixed(1)}%`;

  return {
    ...metrics,
    totalFormatted: formatNumber(metrics.total),
    exitosasFormatted: formatNumber(metrics.exitosas),
    fallidasFormatted: formatNumber(metrics.fallidas),
    tasaExitoFormatted: formatPercent(metrics.tasaExito),
    tasaFallidaFormatted: formatPercent(metrics.tasaFallida),
    beneficiariosUnicosFormatted: formatNumber(metrics.beneficiariosUnicos),
    promedioLlamadasPorDiaFormatted: formatNumber(
      Math.round(metrics.promedioLlamadasPorDia)
    )
  };
};

export default {
  computeGlobalMetrics,
  computePeriodMetrics,
  comparePeriodsMetrics,
  computeOperatorMetrics,
  computeTrends,
  formatMetricsForUI
};
