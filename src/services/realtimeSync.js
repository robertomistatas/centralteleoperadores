/**
 * realtimeSync.js
 * Servicio de sincronización realtime cross-module
 * 
 * FASE 3 - TAREA 3: Sincronización Realtime Cross-Module
 * 
 * Objetivo:
 * Mantener todos los módulos sincronizados automáticamente cuando
 * cambia la información base en Firestore.
 * 
 * Flujo:
 * Firestore (analisisExcel, seguimientos) → Listeners onSnapshot → 
 * metricsEngine → Zustand Stores → UI actualizada
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

/**
 * Estado de los listeners activos
 */
let activeListeners = {
  analisisExcel: null,
  seguimientos: null,
  operators: null
};

/**
 * Inicializa sincronización realtime para análisis de Excel
 * 
 * @returns {Function} Función para desuscribirse
 */
const initExcelAnalysisSync = () => {
  logger.info('[RealtimeSync] Iniciando listener para analisisExcel');

  try {
    const unsubscribe = onSnapshot(
      collection(db, 'analisisExcel'),
      (snapshot) => {
        logger.info('[RealtimeSync] Snapshot recibido de analisisExcel', {
          size: snapshot.size,
          docChanges: snapshot.docChanges().length
        });

        // Obtener todos los datos
        const allAnalyses = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Extraer registros individuales (rawData o fullData)
        const allRecords = allAnalyses.flatMap(analysis => 
          analysis.rawData || analysis.fullData || []
        );

        // Calcular métricas unificadas
        const unifiedMetrics = computeGlobalMetrics(allRecords);

        // Actualizar store
        const setMetrics = useMetricsStore.getState().setExcelAnalysisMetrics;
        if (setMetrics) {
          setMetrics(unifiedMetrics);
          logger.info('[RealtimeSync] Métricas de Excel actualizadas', {
            total: unifiedMetrics.total,
            exitosas: unifiedMetrics.exitosas,
            operadoras: unifiedMetrics.totalOperadoras
          });
        }

        // Audit log
        logger.audit('Realtime sync - Excel analysis', {
          analysesCount: allAnalyses.length,
          recordsCount: allRecords.length,
          metrics: {
            total: unifiedMetrics.total,
            tasaExito: unifiedMetrics.tasaExito
          }
        });
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
 * 
 * @returns {Function} Función para desuscribirse
 */
const initSeguimientosSync = () => {
  logger.info('[RealtimeSync] Iniciando listener para seguimientos');

  try {
    const unsubscribe = onSnapshot(
      collection(db, 'seguimientos'),
      (snapshot) => {
        logger.info('[RealtimeSync] Snapshot recibido de seguimientos', {
          size: snapshot.size,
          docChanges: snapshot.docChanges().length
        });

        // Obtener todos los seguimientos
        const allSeguimientos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calcular métricas unificadas
        const unifiedMetrics = computeGlobalMetrics(allSeguimientos);

        // Actualizar store (si existe método específico para seguimientos)
        const setSeguimientosMetrics = useMetricsStore.getState().setSeguimientosMetrics;
        if (setSeguimientosMetrics) {
          setSeguimientosMetrics(unifiedMetrics);
        }

        // Audit log
        logger.audit('Realtime sync - Seguimientos', {
          seguimientosCount: allSeguimientos.length,
          metrics: {
            total: unifiedMetrics.total,
            tasaExito: unifiedMetrics.tasaExito
          }
        });
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
 * 
 * @returns {Function} Función para desuscribirse
 */
const initOperatorsSync = () => {
  logger.info('[RealtimeSync] Iniciando listener para operators');

  try {
    const unsubscribe = onSnapshot(
      collection(db, 'operators'),
      (snapshot) => {
        logger.info('[RealtimeSync] Snapshot recibido de operators', {
          size: snapshot.size
        });

        const allOperators = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Actualizar metadata de operadoras en store
        const setOperators = useMetricsStore.getState().setOperators;
        if (setOperators) {
          setOperators(allOperators);
        }

        logger.audit('Realtime sync - Operators metadata', {
          operatorsCount: allOperators.length
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
 */
export const stopRealtimeSync = () => {
  logger.info('[RealtimeSync] Deteniendo todos los listeners');

  Object.values(activeListeners).forEach(unsub => {
    if (typeof unsub === 'function') {
      unsub();
    }
  });

  activeListeners = {
    analisisExcel: null,
    seguimientos: null,
    operators: null
  };

  logger.audit('Realtime sync stopped', {
    timestamp: new Date().toISOString()
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
