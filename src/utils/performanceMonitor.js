/**
 * performanceMonitor.js
 * Módulo centralizado para monitoreo de rendimiento
 * 
 * FASE 4 - TAREA 6: Optimización de Rendimiento
 * 
 * Características:
 * - Medición de tiempos de ejecución
 * - Monitoreo de memoria (heap)
 * - Detección de operaciones lentas
 * - FPS tracking
 * - Performance Observer API
 * - Auditoría automática con logger
 * 
 * @module performanceMonitor
 * @version 1.0.0
 */

import logger from './logger';

/**
 * Configuración de umbrales de performance
 */
const THRESHOLDS = {
  SLOW_OPERATION: 500, // ms - Operaciones que superan este tiempo se consideran lentas
  MEMORY_WARNING: 0.75, // 75% de uso de memoria genera advertencia
  MEMORY_CRITICAL: 0.90, // 90% de uso de memoria es crítico
  MIN_FPS: 50, // FPS mínimo aceptable
  MAX_MEMORY_MB: 500 // Límite máximo de memoria en MB
};

/**
 * Almacenamiento de métricas acumuladas
 */
const metrics = {
  operations: [],
  memorySnapshots: [],
  fpsReadings: [],
  slowOperations: 0,
  totalOperations: 0
};

/**
 * Mide el tiempo de ejecución de una función
 * Registra automáticamente en logger si supera el umbral
 * 
 * @param {Function} callback - Función a medir
 * @param {string} label - Etiqueta descriptiva
 * @param {Object} context - Contexto adicional para logging
 * @returns {any} Resultado de la función callback
 * 
 * @example
 * const result = measurePerformance(() => {
 *   return computeGlobalMetrics(data);
 * }, 'computeGlobalMetrics', { recordCount: data.length });
 */
export const measurePerformance = (callback, label = 'Operation', context = {}) => {
  const startTime = performance.now();
  const startMark = `${label}-start`;
  const endMark = `${label}-end`;
  
  // Crear marcas de performance
  performance.mark(startMark);
  
  let result;
  let error = null;
  
  try {
    result = callback();
  } catch (err) {
    error = err;
  }
  
  // Finalizar medición
  performance.mark(endMark);
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Crear medida de performance
  try {
    performance.measure(label, startMark, endMark);
  } catch (e) {
    // Ignorar si las marcas ya no existen
  }
  
  // Registrar métrica
  const metric = {
    label,
    duration: parseFloat(duration.toFixed(2)),
    timestamp: new Date().toISOString(),
    isSlow: duration > THRESHOLDS.SLOW_OPERATION,
    context,
    error: error ? error.message : null
  };
  
  metrics.operations.push(metric);
  metrics.totalOperations++;
  
  if (metric.isSlow) {
    metrics.slowOperations++;
    logger.warn('[PerformanceMonitor] Operación lenta detectada', {
      label,
      duration: `${duration.toFixed(2)}ms`,
      threshold: `${THRESHOLDS.SLOW_OPERATION}ms`,
      context
    });
  }
  
  // Auditoría
  logger.audit('Performance Measurement', {
    operation: label,
    duration: `${duration.toFixed(2)}ms`,
    status: error ? 'error' : 'success',
    isSlow: metric.isSlow,
    ...context
  });
  
  // Limpiar marcas antiguas (mantener últimas 100)
  if (metrics.operations.length > 100) {
    metrics.operations.shift();
  }
  
  // Si hubo error, lanzarlo después del registro
  if (error) throw error;
  
  return result;
};

/**
 * Versión async de measurePerformance
 * 
 * @param {Function} asyncCallback - Función asíncrona a medir
 * @param {string} label - Etiqueta descriptiva
 * @param {Object} context - Contexto adicional
 * @returns {Promise<any>} Resultado de la función async
 */
export const measurePerformanceAsync = async (asyncCallback, label = 'AsyncOperation', context = {}) => {
  const startTime = performance.now();
  
  let result;
  let error = null;
  
  try {
    result = await asyncCallback();
  } catch (err) {
    error = err;
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  const metric = {
    label,
    duration: parseFloat(duration.toFixed(2)),
    timestamp: new Date().toISOString(),
    isSlow: duration > THRESHOLDS.SLOW_OPERATION,
    context,
    error: error ? error.message : null,
    async: true
  };
  
  metrics.operations.push(metric);
  metrics.totalOperations++;
  
  if (metric.isSlow) {
    metrics.slowOperations++;
    logger.warn('[PerformanceMonitor] Operación async lenta detectada', {
      label,
      duration: `${duration.toFixed(2)}ms`,
      threshold: `${THRESHOLDS.SLOW_OPERATION}ms`,
      context
    });
  }
  
  logger.audit('Async Performance Measurement', {
    operation: label,
    duration: `${duration.toFixed(2)}ms`,
    status: error ? 'error' : 'success',
    isSlow: metric.isSlow,
    ...context
  });
  
  if (error) throw error;
  
  return result;
};

/**
 * Registra el uso actual de memoria
 * Solo funciona en navegadores que soporten performance.memory (Chrome/Edge)
 * 
 * @returns {Object|null} Información de memoria o null si no está disponible
 */
export const logMemoryUsage = () => {
  if (!performance.memory) {
    logger.warn('[PerformanceMonitor] performance.memory no disponible en este navegador');
    return null;
  }
  
  const usedMB = performance.memory.usedJSHeapSize / 1048576;
  const totalMB = performance.memory.totalJSHeapSize / 1048576;
  const limitMB = performance.memory.jsHeapSizeLimit / 1048576;
  const usagePercent = (usedMB / totalMB) * 100;
  
  const memorySnapshot = {
    usedMB: parseFloat(usedMB.toFixed(2)),
    totalMB: parseFloat(totalMB.toFixed(2)),
    limitMB: parseFloat(limitMB.toFixed(2)),
    usagePercent: parseFloat(usagePercent.toFixed(2)),
    timestamp: new Date().toISOString(),
    isWarning: usagePercent >= THRESHOLDS.MEMORY_WARNING * 100,
    isCritical: usagePercent >= THRESHOLDS.MEMORY_CRITICAL * 100
  };
  
  metrics.memorySnapshots.push(memorySnapshot);
  
  // Mantener últimos 100 snapshots
  if (metrics.memorySnapshots.length > 100) {
    metrics.memorySnapshots.shift();
  }
  
  // Log según nivel de criticidad
  if (memorySnapshot.isCritical) {
    logger.error('[PerformanceMonitor] ⛔ Uso de memoria CRÍTICO', {
      usedMB: `${memorySnapshot.usedMB} MB`,
      totalMB: `${memorySnapshot.totalMB} MB`,
      usagePercent: `${memorySnapshot.usagePercent}%`,
      threshold: `${THRESHOLDS.MEMORY_CRITICAL * 100}%`
    });
  } else if (memorySnapshot.isWarning) {
    logger.warn('[PerformanceMonitor] ⚠️ Uso de memoria elevado', {
      usedMB: `${memorySnapshot.usedMB} MB`,
      totalMB: `${memorySnapshot.totalMB} MB`,
      usagePercent: `${memorySnapshot.usagePercent}%`,
      threshold: `${THRESHOLDS.MEMORY_WARNING * 100}%`
    });
  } else {
    logger.info('[PerformanceMonitor] 💚 Memoria en rango normal', {
      usedMB: `${memorySnapshot.usedMB} MB`,
      totalMB: `${memorySnapshot.totalMB} MB`,
      usagePercent: `${memorySnapshot.usagePercent}%`
    });
  }
  
  // Auditoría
  logger.audit('Memory Usage', {
    usedMB: memorySnapshot.usedMB,
    totalMB: memorySnapshot.totalMB,
    usagePercent: memorySnapshot.usagePercent,
    status: memorySnapshot.isCritical ? 'critical' : memorySnapshot.isWarning ? 'warning' : 'ok'
  });
  
  return memorySnapshot;
};

/**
 * Inicia monitoreo automático de memoria cada N milisegundos
 * 
 * @param {number} intervalMs - Intervalo de monitoreo en milisegundos
 * @returns {Function} Función para detener el monitoreo
 */
export const startMemoryMonitoring = (intervalMs = 30000) => {
  logger.info('[PerformanceMonitor] Iniciando monitoreo de memoria', {
    interval: `${intervalMs}ms`,
    intervalMinutes: `${(intervalMs / 60000).toFixed(1)} min`
  });
  
  // Snapshot inicial
  logMemoryUsage();
  
  // Monitoreo periódico
  const intervalId = setInterval(() => {
    logMemoryUsage();
  }, intervalMs);
  
  // Retornar función de cleanup
  return () => {
    clearInterval(intervalId);
    logger.info('[PerformanceMonitor] Monitoreo de memoria detenido');
  };
};

/**
 * Calcula FPS (Frames Per Second) promedio
 * Usa requestAnimationFrame para medir fluidez de la UI
 * 
 * @param {number} durationMs - Duración de la medición en milisegundos
 * @returns {Promise<Object>} Métricas de FPS
 */
export const measureFPS = (durationMs = 5000) => {
  return new Promise((resolve) => {
    let frames = 0;
    let lastTime = performance.now();
    const startTime = lastTime;
    const fpsReadings = [];
    
    const measureFrame = (currentTime) => {
      frames++;
      
      // Calcular FPS cada segundo
      if (currentTime - lastTime >= 1000) {
        const currentFPS = Math.round((frames * 1000) / (currentTime - lastTime));
        fpsReadings.push(currentFPS);
        frames = 0;
        lastTime = currentTime;
      }
      
      // Continuar midiendo si no se alcanzó la duración
      if (currentTime - startTime < durationMs) {
        requestAnimationFrame(measureFrame);
      } else {
        // Calcular métricas finales
        const avgFPS = fpsReadings.reduce((a, b) => a + b, 0) / fpsReadings.length;
        const minFPS = Math.min(...fpsReadings);
        const maxFPS = Math.max(...fpsReadings);
        
        const fpsMetrics = {
          avgFPS: Math.round(avgFPS),
          minFPS,
          maxFPS,
          readings: fpsReadings,
          durationMs,
          timestamp: new Date().toISOString(),
          isHealthy: avgFPS >= THRESHOLDS.MIN_FPS
        };
        
        metrics.fpsReadings.push(fpsMetrics);
        
        logger.audit('FPS Measurement', {
          avgFPS: fpsMetrics.avgFPS,
          minFPS: fpsMetrics.minFPS,
          maxFPS: fpsMetrics.maxFPS,
          duration: `${durationMs}ms`,
          status: fpsMetrics.isHealthy ? 'healthy' : 'degraded'
        });
        
        if (!fpsMetrics.isHealthy) {
          logger.warn('[PerformanceMonitor] ⚠️ FPS bajo detectado', {
            avgFPS: fpsMetrics.avgFPS,
            minFPS: fpsMetrics.minFPS,
            threshold: THRESHOLDS.MIN_FPS
          });
        }
        
        resolve(fpsMetrics);
      }
    };
    
    requestAnimationFrame(measureFrame);
  });
};

/**
 * Crea un Performance Observer para métricas de navegación
 * Monitorea: navigation, resource, paint, largest-contentful-paint
 * 
 * @returns {PerformanceObserver|null} Observer o null si no está soportado
 */
export const createPerformanceObserver = () => {
  if (!window.PerformanceObserver) {
    logger.warn('[PerformanceMonitor] PerformanceObserver no disponible');
    return null;
  }
  
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Log según tipo de entrada
        switch (entry.entryType) {
          case 'navigation':
            logger.audit('Navigation Performance', {
              type: entry.type,
              domContentLoaded: `${entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart}ms`,
              loadComplete: `${entry.loadEventEnd - entry.loadEventStart}ms`,
              domInteractive: `${entry.domInteractive}ms`
            });
            break;
            
          case 'largest-contentful-paint':
            logger.audit('LCP', {
              renderTime: `${entry.renderTime}ms`,
              loadTime: `${entry.loadTime}ms`,
              size: entry.size
            });
            break;
            
          case 'paint':
            logger.audit('Paint Timing', {
              name: entry.name,
              startTime: `${entry.startTime}ms`
            });
            break;
            
          default:
            // Ignorar otros tipos
            break;
        }
      }
    });
    
    // Observar múltiples tipos de entradas
    observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'resource'] });
    
    logger.info('[PerformanceMonitor] PerformanceObserver iniciado');
    
    return observer;
  } catch (error) {
    logger.error('[PerformanceMonitor] Error al crear PerformanceObserver', {
      error: error.message
    });
    return null;
  }
};

/**
 * Obtiene resumen de todas las métricas acumuladas
 * 
 * @returns {Object} Resumen completo de performance
 */
export const getPerformanceSummary = () => {
  const slowOpsPercent = metrics.totalOperations > 0 
    ? ((metrics.slowOperations / metrics.totalOperations) * 100).toFixed(1)
    : '0.0';
  
  const avgDuration = metrics.operations.length > 0
    ? (metrics.operations.reduce((sum, op) => sum + op.duration, 0) / metrics.operations.length).toFixed(2)
    : '0.00';
  
  const lastMemory = metrics.memorySnapshots[metrics.memorySnapshots.length - 1] || null;
  const lastFPS = metrics.fpsReadings[metrics.fpsReadings.length - 1] || null;
  
  return {
    operations: {
      total: metrics.totalOperations,
      slow: metrics.slowOperations,
      slowPercent: `${slowOpsPercent}%`,
      avgDuration: `${avgDuration}ms`,
      recent: metrics.operations.slice(-10)
    },
    memory: {
      current: lastMemory,
      snapshots: metrics.memorySnapshots.length,
      avgUsageMB: metrics.memorySnapshots.length > 0
        ? (metrics.memorySnapshots.reduce((sum, s) => sum + s.usedMB, 0) / metrics.memorySnapshots.length).toFixed(2)
        : '0.00'
    },
    fps: {
      current: lastFPS,
      measurements: metrics.fpsReadings.length,
      avgFPS: metrics.fpsReadings.length > 0
        ? Math.round(metrics.fpsReadings.reduce((sum, f) => sum + f.avgFPS, 0) / metrics.fpsReadings.length)
        : 0
    },
    thresholds: THRESHOLDS,
    timestamp: new Date().toISOString()
  };
};

/**
 * Limpia todas las métricas acumuladas
 */
export const clearMetrics = () => {
  metrics.operations = [];
  metrics.memorySnapshots = [];
  metrics.fpsReadings = [];
  metrics.slowOperations = 0;
  metrics.totalOperations = 0;
  
  logger.info('[PerformanceMonitor] Métricas limpiadas');
};

/**
 * Exporta métricas a formato JSON para análisis externo
 * 
 * @returns {string} JSON con todas las métricas
 */
export const exportMetrics = () => {
  const summary = getPerformanceSummary();
  const exportData = {
    summary,
    rawMetrics: {
      operations: metrics.operations,
      memorySnapshots: metrics.memorySnapshots,
      fpsReadings: metrics.fpsReadings
    },
    exportedAt: new Date().toISOString()
  };
  
  return JSON.stringify(exportData, null, 2);
};

/**
 * Exportación por defecto
 */
export default {
  measurePerformance,
  measurePerformanceAsync,
  logMemoryUsage,
  startMemoryMonitoring,
  measureFPS,
  createPerformanceObserver,
  getPerformanceSummary,
  clearMetrics,
  exportMetrics,
  THRESHOLDS
};
