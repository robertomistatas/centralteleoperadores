/**
 * firestoreSyncService.js
 * Servicio centralizado para sincronización de análisis de Excel con Firestore
 * 
 * FASE 2 - TAREA 2: CRUD completo para colección 'analisisExcel'
 * 
 * Características:
 * - CRUD completo: Create, Read, Update, Delete
 * - Listener en tiempo real con onSnapshot
 * - Validación de modo seguro
 * - Auditoría completa de operaciones
 * - Manejo robusto de errores
 * 
 * @module firestoreSyncService
 */

import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import logger from '../utils/logger';

/**
 * Nombre de la colección en Firestore
 */
const ANALYSIS_COLLECTION = 'analisisExcel';

/**
 * Verifica si el modo seguro está activo
 * Lee desde variable de entorno
 */
const isSafeModeEnabled = () => {
  return import.meta.env.VITE_EXCEL_SAFE_MODE !== 'false';
};

/**
 * Guarda un análisis de Excel en Firestore
 * 
 * @param {Object} analysisData - Datos del análisis a guardar
 * @param {string} analysisData.fileHash - Hash SHA-256 del archivo
 * @param {string} analysisData.fileName - Nombre del archivo
 * @param {number} analysisData.fileSize - Tamaño del archivo en bytes
 * @param {Object} analysisData.resumen - Resumen de métricas
 * @param {string} analysisData.processedBy - ID del usuario que procesó
 * @param {Array} analysisData.rawData - Datos completos normalizados
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export const saveExcelAnalysis = async (analysisData) => {
  // Validar modo seguro
  if (isSafeModeEnabled()) {
    logger.warn('[firestoreSyncService] Modo seguro activo - saveExcelAnalysis bloqueado');
    return {
      success: false,
      error: 'Modo seguro activo. No se puede guardar en Firestore.'
    };
  }

  try {
    logger.info('[firestoreSyncService] Guardando análisis...', {
      fileName: analysisData.fileName,
      totalRows: analysisData.totalRows
    });

    // Agregar timestamp del servidor
    const docData = {
      ...analysisData,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, ANALYSIS_COLLECTION), docData);

    logger.audit('Excel analysis saved', {
      docId: docRef.id,
      fileName: analysisData.fileName,
      fileHash: analysisData.fileHash,
      processedBy: analysisData.processedBy,
      totalRows: analysisData.totalRows,
      status: 'success'
    });

    logger.info('[firestoreSyncService] Análisis guardado exitosamente', {
      docId: docRef.id
    });

    return {
      success: true,
      id: docRef.id
    };

  } catch (error) {
    logger.error('[firestoreSyncService] Error al guardar análisis', error);
    
    logger.audit('Excel analysis save failed', {
      fileName: analysisData.fileName,
      error: error.message,
      status: 'error'
    });

    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Obtiene todos los análisis de Excel desde Firestore
 * Ordenados por timestamp descendente (más recientes primero)
 * 
 * @param {number} limitCount - Límite de documentos a retornar (opcional)
 * @returns {Promise<Array<Object>>} Array de análisis con sus IDs
 */
export const getAllAnalyses = async (limitCount = null) => {
  try {
    logger.info('[firestoreSyncService] Obteniendo todos los análisis...', {
      limit: limitCount
    });

    const analysisRef = collection(db, ANALYSIS_COLLECTION);
    let q = query(analysisRef, orderBy('timestamp', 'desc'));

    if (limitCount) {
      q = query(q, firestoreLimit(limitCount));
    }

    const snapshot = await getDocs(q);
    
    const analyses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info('[firestoreSyncService] Análisis obtenidos', {
      count: analyses.length
    });

    return analyses;

  } catch (error) {
    logger.error('[firestoreSyncService] Error al obtener análisis', error);
    return [];
  }
};

/**
 * Obtiene un análisis específico por su ID
 * 
 * @param {string} id - ID del documento en Firestore
 * @returns {Promise<Object|null>} Análisis o null si no existe
 */
export const getAnalysisById = async (id) => {
  try {
    logger.info('[firestoreSyncService] Obteniendo análisis por ID', { id });

    const docRef = doc(db, ANALYSIS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const analysis = {
        id: docSnap.id,
        ...docSnap.data()
      };

      logger.info('[firestoreSyncService] Análisis encontrado', {
        id,
        fileName: analysis.fileName
      });

      return analysis;
    } else {
      logger.warn('[firestoreSyncService] Análisis no encontrado', { id });
      return null;
    }

  } catch (error) {
    logger.error('[firestoreSyncService] Error al obtener análisis', error);
    return null;
  }
};

/**
 * Obtiene análisis por hash de archivo
 * Útil para verificar duplicados
 * 
 * @param {string} fileHash - Hash SHA-256 del archivo
 * @returns {Promise<Array<Object>>} Array de análisis que coinciden con el hash
 */
export const getAnalysisByHash = async (fileHash) => {
  try {
    logger.info('[firestoreSyncService] Buscando análisis por hash', {
      fileHash: fileHash.substring(0, 16)
    });

    const q = query(
      collection(db, ANALYSIS_COLLECTION),
      where('fileHash', '==', fileHash)
    );

    const snapshot = await getDocs(q);

    const analyses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info('[firestoreSyncService] Análisis encontrados por hash', {
      count: analyses.length
    });

    return analyses;

  } catch (error) {
    logger.error('[firestoreSyncService] Error al buscar por hash', error);
    return [];
  }
};

/**
 * Obtiene análisis procesados por un usuario específico
 * 
 * @param {string} userId - ID del usuario
 * @param {number} limitCount - Límite de resultados (opcional)
 * @returns {Promise<Array<Object>>} Array de análisis del usuario
 */
export const getAnalysesByUser = async (userId, limitCount = null) => {
  try {
    logger.info('[firestoreSyncService] Obteniendo análisis por usuario', {
      userId,
      limit: limitCount
    });

    let q = query(
      collection(db, ANALYSIS_COLLECTION),
      where('processedBy', '==', userId),
      orderBy('timestamp', 'desc')
    );

    if (limitCount) {
      q = query(q, firestoreLimit(limitCount));
    }

    const snapshot = await getDocs(q);

    const analyses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info('[firestoreSyncService] Análisis del usuario obtenidos', {
      userId,
      count: analyses.length
    });

    return analyses;

  } catch (error) {
    logger.error('[firestoreSyncService] Error al obtener análisis por usuario', error);
    return [];
  }
};

/**
 * Elimina un análisis de Firestore
 * Requiere validación de modo seguro
 * 
 * @param {string} id - ID del documento a eliminar
 * @param {string} userId - ID del usuario que realiza la eliminación
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteAnalysis = async (id, userId) => {
  // Validar modo seguro
  if (isSafeModeEnabled()) {
    logger.warn('[firestoreSyncService] Modo seguro activo - deleteAnalysis bloqueado');
    return {
      success: false,
      error: 'Modo seguro activo. No se puede eliminar de Firestore.'
    };
  }

  try {
    logger.info('[firestoreSyncService] Eliminando análisis...', { id });

    // Obtener datos del documento antes de eliminar (para auditoría)
    const docRef = doc(db, ANALYSIS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      logger.warn('[firestoreSyncService] Análisis no encontrado para eliminar', { id });
      return {
        success: false,
        error: 'Análisis no encontrado'
      };
    }

    const analysisData = docSnap.data();

    // Eliminar documento
    await deleteDoc(docRef);

    // Auditoría
    logger.audit('Excel analysis deleted', {
      docId: id,
      fileName: analysisData.fileName,
      fileHash: analysisData.fileHash,
      deletedBy: userId,
      status: 'deleted'
    });

    logger.info('[firestoreSyncService] Análisis eliminado exitosamente', { id });

    return {
      success: true
    };

  } catch (error) {
    logger.error('[firestoreSyncService] Error al eliminar análisis', error);

    logger.audit('Excel analysis deletion failed', {
      docId: id,
      deletedBy: userId,
      error: error.message,
      status: 'error'
    });

    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Listener en tiempo real para todos los análisis
 * Usa onSnapshot para recibir actualizaciones automáticas
 * 
 * @param {Function} callback - Función a ejecutar cuando hay cambios (recibe array de análisis)
 * @param {Function} errorCallback - Función a ejecutar en caso de error (opcional)
 * @returns {Function} Función unsubscribe para detener el listener
 * 
 * @example
 * const unsubscribe = listenToAnalyses((analyses) => {
 *   console.log('Nuevos análisis:', analyses);
 * });
 * 
 * // Detener listener
 * unsubscribe();
 */
export const listenToAnalyses = (callback, errorCallback = null) => {
  logger.info('[firestoreSyncService] 📡 Iniciando listener en tiempo real');

  const q = query(
    collection(db, ANALYSIS_COLLECTION),
    orderBy('timestamp', 'desc')
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const analyses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      logger.info('[firestoreSyncService] 📡 Actualización realtime recibida', {
        count: analyses.length,
        added: snapshot.docChanges().filter(c => c.type === 'added').length,
        modified: snapshot.docChanges().filter(c => c.type === 'modified').length,
        removed: snapshot.docChanges().filter(c => c.type === 'removed').length
      });

      // Auditoría de cambios
      const changes = snapshot.docChanges();
      if (changes.length > 0) {
        logger.audit('Realtime sync update', {
          totalDocuments: analyses.length,
          changes: {
            added: changes.filter(c => c.type === 'added').length,
            modified: changes.filter(c => c.type === 'modified').length,
            removed: changes.filter(c => c.type === 'removed').length
          },
          timestamp: new Date().toISOString()
        });
      }

      callback(analyses);
    },
    (error) => {
      logger.error('[firestoreSyncService] ❌ Error en listener realtime', error);

      logger.audit('Realtime sync error', {
        error: error.message,
        timestamp: new Date().toISOString(),
        status: 'error'
      });

      if (errorCallback) {
        errorCallback(error);
      }
    }
  );

  return unsubscribe;
};

/**
 * Obtiene estadísticas globales de todos los análisis
 * Calcula totales agregados sin traer todos los datos
 * 
 * @returns {Promise<Object>} Estadísticas agregadas
 */
export const getGlobalStats = async () => {
  try {
    logger.info('[firestoreSyncService] Calculando estadísticas globales...');

    const snapshot = await getDocs(collection(db, ANALYSIS_COLLECTION));

    let totalRows = 0;
    let totalExitosas = 0;
    let totalFallidas = 0;
    let totalSinIdentificar = 0;
    let totalArchivos = snapshot.size;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      totalRows += data.totalRows || 0;
      totalExitosas += data.exitosas || 0;
      totalFallidas += data.fallidas || 0;
      totalSinIdentificar += data.sinIdentificar || 0;
    });

    const tasaExito = totalRows > 0 ? ((totalExitosas / totalRows) * 100).toFixed(2) : 0;

    const stats = {
      totalArchivos,
      totalRows,
      totalExitosas,
      totalFallidas,
      totalSinIdentificar,
      tasaExito: parseFloat(tasaExito),
      lastCalculated: new Date().toISOString()
    };

    logger.info('[firestoreSyncService] Estadísticas globales calculadas', stats);

    return stats;

  } catch (error) {
    logger.error('[firestoreSyncService] Error al calcular estadísticas', error);
    return null;
  }
};

/**
 * Exporta funciones helper
 */
export default {
  saveExcelAnalysis,
  getAllAnalyses,
  getAnalysisById,
  getAnalysisByHash,
  getAnalysesByUser,
  deleteAnalysis,
  listenToAnalyses,
  getGlobalStats,
  ANALYSIS_COLLECTION
};
