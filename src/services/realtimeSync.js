/**
 * realtimeSync.js
 * Servicio de sincronización realtime cross-module
 * 
 * FASE 3 - TAREA 3: Sincronización Realtime Cross-Module
 * FASE 4 - TAREA 6: Optimización con throttling y debouncing
 * 
 * Objetivo:
 * Mantener todos los módulos sincronizados automáticamente cuando
 * cambia la información base en Firestore.
 * 
 * Flujo:
 * Firestore (analisisExcel, seguimientos) → Listeners onSnapshot → 
 * [THROTTLE 2s] → metricsEngine → Zustand Stores → UI actualizada
 * 
 * Optimizaciones TAREA 6:
 * - Throttling: Máximo 1 actualización cada 2 segundos
 * - Debouncing: Agrupa múltiples cambios en ventana de 500ms
 * - Performance tracking: Mide latencia Firestore → UI
 * - Memory monitoring: Audita uso de memoria en cada ciclo
 * 
 * Módulos sincronizados:
 * - Dashboard
 * - Auditoría Avanzada
 * - Historial de Seguimientos
 * - Análisis de Excel
 * - Seguimientos Periódicos
 */

import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '../firebase';
import useMetricsStore from '../stores/useMetricsStore';
import { computeGlobalMetrics } from './metricsEngine';
import logger from '../utils/logger';
import { measurePerformance, logMemoryUsage } from '../utils/performanceMonitor';

/**
 * Configuración de throttling/debouncing
 */
const SYNC_CONFIG = {
  THROTTLE_INTERVAL: 2000, // Mínimo 2 segundos entre actualizaciones
  DEBOUNCE_WINDOW: 500,    // Agrupar cambios en ventana de 500ms
  MAX_LATENCY_MS: 1500     // Latencia máxima aceptable
};

/**
 * Estado de los listeners activos y control de throttling
 */
let activeListeners = {
  analisisExcel: null,
  seguimientos: null,
  operators: null
};

let lastSyncTimes = {
  analisisExcel: 0,
  seguimientos: 0,
  operators: 0
};

let pendingUpdates = {
  analisisExcel: null,
  seguimientos: null,
  operators: null
};

let debounceTimers = {
  analisisExcel: null,
  seguimientos: null,
  operators: null
};

/**
 * Función auxiliar de throttling
 * Asegura mínimo THROTTLE_INTERVAL ms entre ejecuciones
 * 
 * @param {string} source - Nombre de la fuente de datos
 * @param {Function} callback - Función a ejecutar
 */
const throttledExecute = (source, callback) => {
  const now = Date.now();
  const timeSinceLastSync = now - lastSyncTimes[source];
  
  // Si aún no ha pasado el intervalo mínimo, agendar para después
  if (timeSinceLastSync < SYNC_CONFIG.THROTTLE_INTERVAL) {
    const delay = SYNC_CONFIG.THROTTLE_INTERVAL - timeSinceLastSync;
    
    logger.info(`[RealtimeSync] Throttling ${source}`, {
      delay: `${delay}ms`,
      timeSinceLastSync: `${timeSinceLastSync}ms`,
      minInterval: `${SYNC_CONFIG.THROTTLE_INTERVAL}ms`
    });
    
    // Guardar callback pendiente
    pendingUpdates[source] = callback;
    
    // Si no hay timer activo, crear uno
    if (!debounceTimers[source]) {
      debounceTimers[source] = setTimeout(() => {
        if (pendingUpdates[source]) {
          const pendingCallback = pendingUpdates[source];
          pendingUpdates[source] = null;
          debounceTimers[source] = null;
          lastSyncTimes[source] = Date.now();
          
          // Ejecutar con medición de performance
          measurePerformance(
            () => pendingCallback(),
            `RealtimeSync-${source}-Throttled`,
            { source, throttled: true }
          );
        }
      }, delay);
    }
    
    return;
  }
  
  // Ejecutar inmediatamente si ha pasado el intervalo
  lastSyncTimes[source] = now;
  
  measurePerformance(
    () => callback(),
    `RealtimeSync-${source}`,
    { source, throttled: false }
  );
};

/**
 * Procesa actualización de métricas con performance tracking
 * 
 * @param {Array} records - Registros a procesar
 * @param {string} source - Fuente de datos
 * @param {Function} setMetrics - Función para actualizar store
 */
const processMetricsUpdate = (records, source, setMetrics) => {
  const startTime = performance.now();
  
  // Calcular métricas con medición
  const unifiedMetrics = measurePerformance(
    () => computeGlobalMetrics(records),
    `computeGlobalMetrics-${source}`,
    { recordCount: records.length, source }
  );
  
  // Actualizar store
  if (setMetrics) {
    setMetrics(unifiedMetrics);
    
    const latency = performance.now() - startTime;
    
    logger.info(`[RealtimeSync] Métricas de ${source} actualizadas`, {
      total: unifiedMetrics.total,
      exitosas: unifiedMetrics.exitosas,
      operadoras: unifiedMetrics.totalOperadoras,
      latency: `${latency.toFixed(2)}ms`,
      withinTarget: latency < SYNC_CONFIG.MAX_LATENCY_MS
    });
    
    // Advertencia si la latencia es alta
    if (latency >= SYNC_CONFIG.MAX_LATENCY_MS) {
      logger.warn(`[RealtimeSync] ⚠️ Alta latencia en ${source}`, {
        latency: `${latency.toFixed(2)}ms`,
        target: `${SYNC_CONFIG.MAX_LATENCY_MS}ms`,
        recordCount: records.length
      });
    }
    
    // Log de memoria cada 10 actualizaciones
    if (Math.random() < 0.1) {
      logMemoryUsage();
    }
  }
  
  return unifiedMetrics;
};

/**
 * Inicializa sincronización realtime para análisis de Excel
 * CON OPTIMIZACIÓN: Throttling + Performance Monitoring
 * 
 * @returns {Function} Función para desuscribirse
 */
const initExcelAnalysisSync = () => {
  logger.info('[RealtimeSync] Iniciando listener para analisisExcel (optimizado)');

  try {
    const unsubscribe = onSnapshot(
      collection(db, 'analisisExcel'),
      (snapshot) => {
        const snapshotTime = performance.now();
        
        logger.info('[RealtimeSync] Snapshot recibido de analisisExcel', {
          size: snapshot.size,
          docChanges: snapshot.docChanges().length
        });

        // Ejecutar con throttling
        throttledExecute('analisisExcel', () => {
          // Obtener todos los datos
          const allAnalyses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Extraer registros individuales (rawData o fullData)
          const allRecords = allAnalyses.flatMap(analysis => 
            analysis.rawData || analysis.fullData || []
          );

          // Procesar métricas con tracking
          const setMetrics = useMetricsStore.getState().setExcelAnalysisMetrics;
          const unifiedMetrics = processMetricsUpdate(allRecords, 'analisisExcel', setMetrics);
          
          const totalLatency = performance.now() - snapshotTime;

          // Audit log con latencia total
          logger.audit('Realtime sync - Excel analysis', {
            analysesCount: allAnalyses.length,
            recordsCount: allRecords.length,
            totalLatency: `${totalLatency.toFixed(2)}ms`,
            metrics: {
              total: unifiedMetrics.total,
              tasaExito: unifiedMetrics.tasaExito
            }
          });
        }); // Cierre de throttledExecute
      },
      (error) => {
        logger.error('[RealtimeSync] Error en listener de analisisExcel', {
          error: error.message,
          code: error.code
        });
      }
    );

    activeListeners.analisisExcel = unsubscribe;
    return unsubscribe;
  } catch (error) {
    logger.error('[RealtimeSync] Error al iniciar listener de analisisExcel', error);
    return () => {};
  }
};

/**
 * Inicializa sincronización realtime para seguimientos
 * CON OPTIMIZACIÓN: Throttling + Performance Monitoring
 * 
 * @returns {Function} Función para desuscribirse
 */
const initSeguimientosSync = () => {
  logger.info('[RealtimeSync] Iniciando listener para seguimientos (optimizado)');

  try {
    const unsubscribe = onSnapshot(
      collection(db, 'seguimientos'),
      (snapshot) => {
        const snapshotTime = performance.now();
        
        logger.info('[RealtimeSync] Snapshot recibido de seguimientos', {
          size: snapshot.size,
          docChanges: snapshot.docChanges().length
        });

        // Ejecutar con throttling
        throttledExecute('seguimientos', () => {
          // Obtener todos los seguimientos
          const allSeguimientos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Procesar métricas con tracking
          const setSeguimientosMetrics = useMetricsStore.getState().setSeguimientosMetrics;
          const unifiedMetrics = processMetricsUpdate(
            allSeguimientos, 
            'seguimientos', 
            setSeguimientosMetrics
          );
          
          const totalLatency = performance.now() - snapshotTime;

          // Audit log con latencia total
          logger.audit('Realtime sync - Seguimientos', {
            seguimientosCount: allSeguimientos.length,
            totalLatency: `${totalLatency.toFixed(2)}ms`,
            metrics: {
              total: unifiedMetrics.total,
              tasaExito: unifiedMetrics.tasaExito
            }
          });
        }); // Cierre de throttledExecute
      },
      (error) => {
        logger.error('[RealtimeSync] Error en listener de seguimientos', {
          error: error.message,
          code: error.code
        });
      }
    );

    activeListeners.seguimientos = unsubscribe;
    return unsubscribe;
  } catch (error) {
    logger.error('[RealtimeSync] Error al iniciar listener de seguimientos', error);
    return () => {};
  }
};

/**
 * Inicializa sincronización realtime para operadoras
 * (Metadata de operadoras, no registros de llamadas)
 * CON OPTIMIZACIÓN: Throttling (metadata cambia raramente, no requiere tracking intensivo)
 * 
 * @returns {Function} Función para desuscribirse
 */
const initOperatorsSync = () => {
  logger.info('[RealtimeSync] Iniciando listener para operators (optimizado)');

  try {
    const unsubscribe = onSnapshot(
      collection(db, 'operators'),
      (snapshot) => {
        const snapshotTime = performance.now();
        
        logger.info('[RealtimeSync] Snapshot recibido de operators', {
          size: snapshot.size
        });

        // Throttling ligero (metadata cambia poco)
        throttledExecute('operators', () => {
          const allOperators = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Actualizar metadata de operadoras en store
          const setOperators = useMetricsStore.getState().setOperators;
          if (setOperators) {
            setOperators(allOperators);
          }
          
          const totalLatency = performance.now() - snapshotTime;

          logger.audit('Realtime sync - Operators metadata', {
            operatorsCount: allOperators.length,
            totalLatency: `${totalLatency.toFixed(2)}ms`
          });
        });
      },
      (error) => {
        logger.error('[RealtimeSync] Error en listener de operators', {
          error: error.message,
          code: error.code
        });
      }
    );

    activeListeners.operators = unsubscribe;
    return unsubscribe;
  } catch (error) {
    logger.error('[RealtimeSync] Error al iniciar listener de operators', error);
    return () => {};
  }
};

/**
 * Inicializa TODOS los listeners de sincronización realtime
 * Debe llamarse solo para usuarios Super Admin
 * 
 * @param {Object} options - Opciones de configuración
 * @returns {Function} Función para desuscribirse de todos los listeners
 */
export const initRealtimeSync = (options = {}) => {
  logger.info('[RealtimeSync] Iniciando sincronización realtime completa', options);

  // Verificar SafeMode
  const isSafeMode = import.meta.env.VITE_EXCEL_SAFE_MODE !== 'false';
  if (isSafeMode && !options.forcedInit) {
    logger.warn('[RealtimeSync] SafeMode activo - sincronización realtime deshabilitada');
    return () => {};
  }

  // Iniciar listeners
  const unsubscribers = [];

  if (options.syncExcel !== false) {
    unsubscribers.push(initExcelAnalysisSync());
  }

  if (options.syncSeguimientos !== false) {
    unsubscribers.push(initSeguimientosSync());
  }

  if (options.syncOperators !== false) {
    unsubscribers.push(initOperatorsSync());
  }

  logger.audit('Realtime sync initialized', {
    listeners: unsubscribers.length,
    safeMode: isSafeMode,
    timestamp: new Date().toISOString()
  });

  // Retornar función de cleanup
  return () => {
    logger.info('[RealtimeSync] Deteniendo sincronización realtime');
    unsubscribers.forEach(unsub => {
      if (typeof unsub === 'function') {
        unsub();
      }
    });
    activeListeners = {
      analisisExcel: null,
      seguimientos: null,
      operators: null
    };
  };
};

/**
 * Detiene TODOS los listeners activos
 * OPTIMIZADO: Limpia timers pendientes y callbacks
 */
export const stopRealtimeSync = () => {
  logger.info('[RealtimeSync] Deteniendo todos los listeners');

  // Limpiar timers de debouncing
  Object.keys(debounceTimers).forEach(source => {
    if (debounceTimers[source]) {
      clearTimeout(debounceTimers[source]);
      debounceTimers[source] = null;
    }
  });

  // Limpiar callbacks pendientes
  Object.keys(pendingUpdates).forEach(source => {
    pendingUpdates[source] = null;
  });

  // Detener listeners
  Object.values(activeListeners).forEach(unsub => {
    if (typeof unsub === 'function') {
      unsub();
    }
  });

  // Reset estado
  activeListeners = {
    analisisExcel: null,
    seguimientos: null,
    operators: null
  };
  
  lastSyncTimes = {
    analisisExcel: 0,
    seguimientos: 0,
    operators: 0
  };

  logger.audit('Realtime sync stopped', {
    timestamp: new Date().toISOString(),
    cleaned: {
      listeners: true,
      timers: true,
      pendingCallbacks: true
    }
  });
};

/**
 * Verifica si hay listeners activos
 * 
 * @returns {boolean}
 */
export const hasActiveListeners = () => {
  return Object.values(activeListeners).some(listener => listener !== null);
};

/**
 * Obtiene estado de los listeners
 * 
 * @returns {Object}
 */
export const getListenersStatus = () => {
  return {
    analisisExcel: activeListeners.analisisExcel !== null,
    seguimientos: activeListeners.seguimientos !== null,
    operators: activeListeners.operators !== null,
    hasActive: hasActiveListeners()
  };
};

/**
 * Fuerza una actualización manual de métricas
 * Sin esperar cambios en Firestore
 * 
 * @param {string} collection - Colección a actualizar ('excel' | 'seguimientos' | 'all')
 */
export const forceMetricsUpdate = async (collection = 'all') => {
  logger.info('[RealtimeSync] Forzando actualización de métricas', { collection });

  try {
    if (collection === 'excel' || collection === 'all') {
      // Trigger manual del listener de Excel
      const { getDocs } = await import('firebase/firestore');
      const { collection: firestoreCollection } = await import('firebase/firestore');
      
      const snapshot = await getDocs(firestoreCollection(db, 'analisisExcel'));
      const allAnalyses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const allRecords = allAnalyses.flatMap(a => a.rawData || a.fullData || []);
      const metrics = computeGlobalMetrics(allRecords);
      
      useMetricsStore.getState().setExcelAnalysisMetrics?.(metrics);
    }

    logger.audit('Manual metrics update forced', {
      collection,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[RealtimeSync] Error al forzar actualización', error);
  }
};

export default {
  initRealtimeSync,
  stopRealtimeSync,
  hasActiveListeners,
  getListenersStatus,
  forceMetricsUpdate
};
