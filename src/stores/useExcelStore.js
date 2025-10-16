/**
 * useExcelStore.js
 * Store Zustand para gestión del análisis de archivos Excel
 * 
 * Estado:
 * - Archivo cargado y su hash
 * - Datos procesados y preview
 * - Resumen de métricas
 * - Estados de carga y error
 * - Historial de archivos analizados
 * 
 * FASE 2: Persistencia en Firestore
 * - persistToFirestore(): Guarda análisis en colección 'analisisExcel'
 * - Validación de modo seguro (safeMode)
 * - Detección de duplicados por fileHash
 */

import { create } from 'zustand';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import logger from '../utils/logger';

/**
 * Estado inicial del store
 */
const initialState = {
  // Archivo actual
  file: null,
  fileHash: null,
  
  // Datos procesados
  previewData: [],
  fullData: [],
  resumen: {
    total: 0,
    exitosas: 0,
    fallidas: 0,
    sinIdentificar: 0,
    conTelefono: 0,
    conFecha: 0,
    conBeneficiario: 0
  },
  
  // Metadata
  columnMapping: {},
  warnings: [],
  metadata: null,
  
  // Estados de carga
  loading: false,
  loadingStage: null, // 'reading' | 'processing' | 'analyzing'
  error: null,
  
  // Historial (para idempotencia)
  processedFiles: [], // [{ hash, filename, timestamp, resumen }]
  
  // Configuración - Leer desde variable de entorno
  safeMode: import.meta.env.VITE_EXCEL_SAFE_MODE !== 'false', // Por defecto en modo seguro
};

/**
 * Store de Excel
 */
export const useExcelStore = create((set, get) => ({
  ...initialState,

  // ===== SETTERS BÁSICOS =====
  
  /**
   * Establece el archivo actual
   */
  setFile: (file, hash) => {
    logger.info('[useExcelStore] Archivo establecido', { 
      filename: file?.name, 
      hash: hash?.substring(0, 16) 
    });
    set({ file, fileHash: hash, error: null });
  },

  /**
   * Establece los datos de preview
   */
  setPreviewData: (data) => {
    logger.info('[useExcelStore] Preview data establecida', { rows: data.length });
    set({ previewData: data });
  },

  /**
   * Establece todos los datos procesados
   */
  setFullData: (data) => {
    logger.info('[useExcelStore] Datos completos establecidos', { rows: data.length });
    set({ fullData: data });
  },

  /**
   * Establece el resumen de métricas
   */
  setResumen: (resumen) => {
    logger.info('[useExcelStore] Resumen establecido', resumen);
    set({ resumen });
  },

  /**
   * Establece el mapeo de columnas
   */
  setColumnMapping: (mapping) => {
    logger.info('[useExcelStore] Mapeo de columnas establecido', mapping);
    set({ columnMapping: mapping });
  },

  /**
   * Establece warnings
   */
  setWarnings: (warnings) => {
    logger.info('[useExcelStore] Warnings establecidos', { count: warnings.length });
    set({ warnings });
  },

  /**
   * Establece metadata
   */
  setMetadata: (metadata) => {
    set({ metadata });
  },

  /**
   * Establece estado de carga
   */
  setLoading: (loading, stage = null) => {
    set({ loading, loadingStage: stage });
  },

  /**
   * Establece error
   */
  setError: (error) => {
    logger.error('[useExcelStore] Error establecido', { error });
    set({ error, loading: false, loadingStage: null });
  },

  // ===== FUNCIONES DE ANÁLISIS =====

  /**
   * Procesa un resultado completo del excelProcessor
   */
  processAnalysisResult: (result) => {
    const { data, resumen, columnMapping, warnings, metadata } = result;
    
    logger.info('[useExcelStore] Procesando resultado de análisis', {
      totalRows: data.length,
      exitosas: resumen.exitosas,
      warnings: warnings.length
    });
    
    set({
      fullData: data,
      previewData: data.slice(0, 20), // Primeros 20 para preview
      resumen,
      columnMapping,
      warnings,
      metadata,
      loading: false,
      loadingStage: null,
      error: null
    });
    
    // Agregar al historial
    get().addToHistory();
  },

  /**
   * Agrega el archivo actual al historial
   */
  addToHistory: () => {
    const { file, fileHash, resumen, metadata, processedFiles } = get();
    
    if (!file || !fileHash) return;
    
    // Verificar si ya existe
    const existingIndex = processedFiles.findIndex(f => f.hash === fileHash);
    
    const historyEntry = {
      hash: fileHash,
      filename: file.name,
      timestamp: new Date().toISOString(),
      resumen: { ...resumen },
      metadata
    };
    
    let newHistory;
    if (existingIndex >= 0) {
      // Actualizar existente
      newHistory = [...processedFiles];
      newHistory[existingIndex] = historyEntry;
      logger.info('[useExcelStore] Archivo actualizado en historial', { filename: file.name });
    } else {
      // Agregar nuevo (máximo 10 en historial)
      newHistory = [historyEntry, ...processedFiles].slice(0, 10);
      logger.info('[useExcelStore] Archivo agregado al historial', { filename: file.name });
    }
    
    set({ processedFiles: newHistory });
  },

  /**
   * Verifica si un hash ya fue procesado
   */
  isFileProcessed: (hash) => {
    const { processedFiles } = get();
    return processedFiles.find(f => f.hash === hash);
  },

  /**
   * Obtiene datos paginados
   */
  getPaginatedData: (page = 1, pageSize = 20) => {
    const { fullData } = get();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
      data: fullData.slice(startIndex, endIndex),
      page,
      pageSize,
      totalPages: Math.ceil(fullData.length / pageSize),
      totalRows: fullData.length
    };
  },

  /**
   * Filtra datos por clasificación
   */
  getFilteredData: (clasificacion) => {
    const { fullData } = get();
    
    if (!clasificacion || clasificacion === 'all') {
      return fullData;
    }
    
    return fullData.filter(row => row._clasificacion === clasificacion);
  },

  /**
   * Busca en los datos
   */
  searchData: (searchTerm) => {
    const { fullData } = get();
    
    if (!searchTerm || searchTerm.trim() === '') {
      return fullData;
    }
    
    const term = searchTerm.toLowerCase().trim();
    
    return fullData.filter(row => {
      return Object.values(row).some(value => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(term);
        }
        return false;
      });
    });
  },

  /**
   * Exporta datos filtrados
   */
  exportData: (filter = null) => {
    const { fullData } = get();
    
    let dataToExport = fullData;
    if (filter) {
      dataToExport = get().getFilteredData(filter);
    }
    
    // Eliminar campos internos (_)
    return dataToExport.map(row => {
      const cleaned = {};
      for (const [key, value] of Object.entries(row)) {
        if (!key.startsWith('_')) {
          cleaned[key] = value;
        }
      }
      return cleaned;
    });
  },

  // ===== CONFIGURACIÓN =====

  /**
   * Activa/desactiva modo seguro
   */
  setSafeMode: (enabled) => {
    logger.info('[useExcelStore] Modo seguro', { enabled });
    set({ safeMode: enabled });
  },

  /**
   * Verifica si el modo seguro está activo
   */
  isSafeModeEnabled: () => {
    return get().safeMode;
  },

  // ===== LIMPIEZA =====

  /**
   * Limpia el estado actual
   */
  clear: () => {
    logger.info('[useExcelStore] Limpiando estado');
    set({
      file: null,
      fileHash: null,
      previewData: [],
      fullData: [],
      resumen: {
        total: 0,
        exitosas: 0,
        fallidas: 0,
        sinIdentificar: 0,
        conTelefono: 0,
        conFecha: 0,
        conBeneficiario: 0
      },
      columnMapping: {},
      warnings: [],
      metadata: null,
      loading: false,
      loadingStage: null,
      error: null
    });
  },

  /**
   * Limpia el historial
   */
  clearHistory: () => {
    logger.info('[useExcelStore] Limpiando historial');
    set({ processedFiles: [] });
  },

  /**
   * Reset completo del store
   */
  reset: () => {
    logger.info('[useExcelStore] Reset completo del store');
    set(initialState);
  },

  // ===== GETTERS COMPUTADOS =====

  /**
   * Obtiene la tasa de éxito
   */
  getSuccessRate: () => {
    const { resumen } = get();
    if (resumen.total === 0) return 0;
    return Math.round((resumen.exitosas / resumen.total) * 100);
  },

  /**
   * Obtiene la tasa de fallo
   */
  getFailureRate: () => {
    const { resumen } = get();
    if (resumen.total === 0) return 0;
    return Math.round((resumen.fallidas / resumen.total) * 100);
  },

  /**
   * Obtiene estadísticas por operadora (si existe la columna)
   */
  getOperatorStats: () => {
    const { fullData } = get();
    
    const stats = {};
    
    fullData.forEach(row => {
      const operadora = row.operadora || 'Sin asignar';
      
      if (!stats[operadora]) {
        stats[operadora] = {
          total: 0,
          exitosas: 0,
          fallidas: 0,
          sinIdentificar: 0
        };
      }
      
      stats[operadora].total++;
      stats[operadora][row._clasificacion]++;
    });
    
    return stats;
  },

  /**
   * Verifica si hay datos cargados
   */
  hasData: () => {
    return get().fullData.length > 0;
  },

  /**
   * Obtiene información del estado actual
   */
  getStatus: () => {
    const { file, fullData, loading, error } = get();
    
    if (error) return { status: 'error', message: error };
    if (loading) return { status: 'loading', message: 'Procesando archivo...' };
    if (!file) return { status: 'empty', message: 'No hay archivo cargado' };
    if (fullData.length === 0) return { status: 'no-data', message: 'Sin datos procesados' };
    
    return { status: 'ready', message: 'Datos listos' };
  },

  // ===== FASE 2: PERSISTENCIA EN FIRESTORE =====

  /**
   * Persiste el análisis actual en Firestore
   * @param {string} userId - ID del usuario que realiza la operación
   * @returns {Promise<{success: boolean, id?: string, error?: string}>}
   */
  persistToFirestore: async (userId) => {
    const state = get();
    
    // 1. Verificar modo seguro
    if (state.safeMode) {
      logger.warn('[useExcelStore] Modo seguro activo - persistencia bloqueada');
      return {
        success: false,
        error: 'Modo seguro activo. No se pueden guardar datos en Firestore.'
      };
    }

    // 2. Validar que hay datos para guardar
    if (!state.file || !state.fileHash || state.fullData.length === 0) {
      logger.error('[useExcelStore] No hay datos válidos para persistir');
      return {
        success: false,
        error: 'No hay datos válidos para guardar.'
      };
    }

    try {
      set({ loading: true, loadingStage: 'persisting', error: null });

      // 3. Verificar si el archivo ya fue guardado (por hash)
      const analisisRef = collection(db, 'analisisExcel');
      const q = query(analisisRef, where('fileHash', '==', state.fileHash));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const existingDoc = snapshot.docs[0];
        const existingData = existingDoc.data();
        
        logger.warn('[useExcelStore] Archivo duplicado detectado', {
          fileHash: state.fileHash.substring(0, 16),
          existingId: existingDoc.id,
          existingFileName: existingData.fileName
        });

        // Auditoría de intento de duplicado
        logger.audit('Excel persistence - duplicate prevented', {
          userId,
          fileHash: state.fileHash,
          fileName: state.file.name,
          existingDocId: existingDoc.id,
          status: 'blocked'
        });

        set({ loading: false, loadingStage: null });
        
        return {
          success: false,
          error: `Este archivo ya fue analizado previamente (${existingData.fileName}).`,
          existingId: existingDoc.id
        };
      }

      // 4. Preparar documento para Firestore
      const documentData = {
        // Identificación
        fileHash: state.fileHash,
        fileName: state.file.name,
        fileSize: state.file.size,
        
        // Resumen de métricas
        resumen: state.resumen,
        
        // Metadata temporal
        timestamp: serverTimestamp(),
        processedBy: userId,
        processedAt: new Date().toISOString(),
        
        // Totales rápidos
        totalRows: state.fullData.length,
        exitosas: state.resumen.exitosas,
        fallidas: state.resumen.fallidas,
        sinIdentificar: state.resumen.sinIdentificar,
        
        // Métricas por operadora
        metricsByOperator: get().getOperatorStats(),
        
        // Métricas por fecha (si existen columnas de fecha)
        metricsByDate: state.metadata?.dateColumns || {},
        
        // Origen de los datos
        source: 'excel',
        
        // Datos completos normalizados
        rawData: state.fullData,
        
        // Mapeo de columnas detectado
        columnMapping: state.columnMapping,
        
        // Advertencias del procesamiento
        warnings: state.warnings,
        
        // Metadata adicional
        metadata: state.metadata
      };

      // 5. Guardar en Firestore
      logger.info('[useExcelStore] Guardando análisis en Firestore...', {
        fileName: state.file.name,
        totalRows: state.fullData.length
      });

      const docRef = await addDoc(analisisRef, documentData);

      logger.info('[useExcelStore] Análisis guardado exitosamente', {
        docId: docRef.id,
        fileName: state.file.name
      });

      // 6. Auditoría de operación exitosa
      logger.audit('Excel persistence - success', {
        userId,
        docId: docRef.id,
        fileHash: state.fileHash,
        fileName: state.file.name,
        totalRows: state.fullData.length,
        exitosas: state.resumen.exitosas,
        fallidas: state.resumen.fallidas,
        status: 'saved'
      });

      set({ loading: false, loadingStage: null });

      return {
        success: true,
        id: docRef.id
      };

    } catch (error) {
      logger.error('[useExcelStore] Error al persistir en Firestore', error);
      
      // Auditoría de error
      logger.audit('Excel persistence - error', {
        userId,
        fileHash: state.fileHash,
        fileName: state.file.name,
        error: error.message,
        status: 'failed'
      });

      set({ 
        loading: false, 
        loadingStage: null,
        error: `Error al guardar: ${error.message}` 
      });

      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Cambia el modo seguro (solo para desarrollo/testing)
   */
  toggleSafeMode: () => {
    const currentMode = get().safeMode;
    logger.warn('[useExcelStore] Cambiando modo seguro', { 
      from: currentMode, 
      to: !currentMode 
    });
    set({ safeMode: !currentMode });
  }
}));

export default useExcelStore;
