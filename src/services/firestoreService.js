/**
 * firestoreService.js
 * Servicio centralizado para todas las operaciones de Firestore
 * 
 * Refactorización: Unifica acceso a Firestore, elimina queries directas en componentes
 * y centraliza manejo de errores.
 * 
 * IMPORTANTE: Este servicio reemplaza el firestoreService.js existente en src/
 * pero mantiene compatibilidad con operatorService, assignmentService, callDataService
 */

import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import logger from '../utils/logger';

/**
 * Nombres de colecciones de Firestore
 */
export const COLLECTIONS = {
  OPERATORS: 'operators',
  BENEFICIARIES: 'beneficiarios',
  BENEFICIARY_UPLOADS: 'beneficiaryUploads',
  ASSIGNMENTS: 'assignments',
  SEGUIMIENTOS: 'seguimientos',
  CALL_DATA: 'callData',
  USERS: 'users',
  METRICS: 'metrics',
  USER_DATA: 'userData',
};

/**
 * Variable para trackear errores de permisos por usuario
 */
const permissionErrorsByUser = new Map();

/**
 * Resetea el estado de errores (útil para reconexión o testing)
 */
export const resetErrorState = (userId = null) => {
  if (userId) {
    permissionErrorsByUser.delete(userId);
  } else {
    permissionErrorsByUser.clear();
  }
  logger.info('Estado de errores reseteado', userId || 'todos los usuarios');
};

/**
 * Maneja errores de Firestore de forma centralizada
 */
const handleFirestoreError = (error, operation, context = {}) => {
  const userId = context.userId || 'anonymous';
  
  // Permisos insuficientes
  if (error.code === 'permission-denied') {
    if (!permissionErrorsByUser.has(userId)) {
      logger.warn(`Permisos insuficientes para usuario ${userId}. Operación: ${operation}`);
      logger.info('Para habilitar persistencia, configura Firestore según FIREBASE_SETUP.md');
      permissionErrorsByUser.set(userId, true);
    }
    return { error: 'permission-denied', data: null };
  }
  
  // Índices faltantes
  if (error.code === 'failed-precondition' && error.message.includes('index')) {
    logger.info('Firebase está creando índices necesarios. Usando datos locales temporalmente.');
    logger.info('Estado del índice: https://console.firebase.google.com/firestore/indexes');
    return { error: 'index-building', data: null };
  }
  
  // Error de red
  if (error.code === 'unavailable') {
    logger.warn('Firestore no disponible. Verifica tu conexión.');
    return { error: 'unavailable', data: null };
  }
  
  // Error genérico
  logger.error(`Error en ${operation}:`, error, context);
  return { error: error.message, data: null };
};

/**
 * Obtiene el timestamp actual del servidor
 */
export const getServerTimestamp = () => serverTimestamp();

/**
 * Convierte un Timestamp de Firestore a Date
 */
export const timestampToDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (timestamp.toDate) return timestamp.toDate();
  return new Date(timestamp);
};

// ===== OPERACIONES BÁSICAS =====

/**
 * Obtiene un documento por su path
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @param {object} options - Opciones adicionales (userId para logging)
 * @returns {Promise<object>} Documento o null si hay error
 */
export const fetchDoc = async (collectionName, docId, options = {}) => {
  try {
    logger.firebase(`Fetching doc: ${collectionName}/${docId}`);
    
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      logger.warn(`Documento no encontrado: ${collectionName}/${docId}`);
      return null;
    }
  } catch (error) {
    const result = handleFirestoreError(error, 'fetchDoc', { collectionName, docId, ...options });
    return result.data;
  }
};

/**
 * Obtiene todos los documentos de una colección
 * @param {string} collectionName - Nombre de la colección
 * @param {object} options - Filtros y opciones (where, orderBy, limit, userId)
 * @returns {Promise<Array>} Array de documentos
 */
export const fetchCollection = async (collectionName, options = {}) => {
  try {
    logger.firebase(`Fetching collection: ${collectionName}`, options);
    
    let q = collection(db, collectionName);
    
    // Aplicar filtros
    const constraints = [];
    
    if (options.where) {
      // where puede ser un array de [field, operator, value] o un array de arrays
      if (Array.isArray(options.where[0])) {
        options.where.forEach(([field, operator, value]) => {
          constraints.push(where(field, operator, value));
        });
      } else {
        const [field, operator, value] = options.where;
        constraints.push(where(field, operator, value));
      }
    }
    
    if (options.orderBy) {
      const [field, direction = 'asc'] = Array.isArray(options.orderBy) 
        ? options.orderBy 
        : [options.orderBy];
      constraints.push(orderBy(field, direction));
    }
    
    if (options.limit) {
      constraints.push(limit(options.limit));
    }
    
    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }
    
    const querySnapshot = await getDocs(q);
    const docs = [];
    
    querySnapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    
    logger.firebase(`Fetched ${docs.length} docs from ${collectionName}`);
    return docs;
    
  } catch (error) {
    const result = handleFirestoreError(error, 'fetchCollection', { collectionName, ...options });
    return result.data || [];
  }
};

/**
 * Crea un nuevo documento (auto-genera ID)
 * @param {string} collectionName - Nombre de la colección
 * @param {object} data - Datos del documento
 * @param {object} options - Opciones adicionales
 * @returns {Promise<object>} Documento creado con ID
 */
export const create = async (collectionName, data, options = {}) => {
  try {
    logger.firebase(`Creating doc in ${collectionName}`, data);
    
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, collectionName), docData);
    
    logger.firebase(`Created doc ${docRef.id} in ${collectionName}`);
    return { id: docRef.id, ...data };
    
  } catch (error) {
    const result = handleFirestoreError(error, 'create', { collectionName, ...options });
    return result.data;
  }
};

/**
 * Crea o actualiza un documento con ID específico
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @param {object} data - Datos del documento
 * @param {object} options - Opciones adicionales (merge: true para merge)
 * @returns {Promise<object>} Documento creado/actualizado
 */
export const set = async (collectionName, docId, data, options = {}) => {
  try {
    logger.firebase(`Setting doc ${collectionName}/${docId}`, data);
    
    const docRef = doc(db, collectionName, docId);
    const docData = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(docRef, docData, { merge: options.merge || false });
    
    logger.firebase(`Set doc ${docId} in ${collectionName}`);
    return { id: docId, ...data };
    
  } catch (error) {
    const result = handleFirestoreError(error, 'set', { collectionName, docId, ...options });
    return result.data;
  }
};

/**
 * Actualiza un documento existente (merge parcial)
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @param {object} updates - Campos a actualizar
 * @param {object} options - Opciones adicionales
 * @returns {Promise<boolean>} true si éxito
 */
export const update = async (collectionName, docId, updates, options = {}) => {
  try {
    logger.firebase(`Updating doc ${collectionName}/${docId}`, updates);
    
    const docRef = doc(db, collectionName, docId);
    const docData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(docRef, docData);
    
    logger.firebase(`Updated doc ${docId} in ${collectionName}`);
    return true;
    
  } catch (error) {
    handleFirestoreError(error, 'update', { collectionName, docId, ...options });
    return false;
  }
};

/**
 * Elimina un documento
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @param {object} options - Opciones adicionales
 * @returns {Promise<boolean>} true si éxito
 */
export const remove = async (collectionName, docId, options = {}) => {
  try {
    logger.firebase(`Deleting doc ${collectionName}/${docId}`);
    
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    
    logger.firebase(`Deleted doc ${docId} from ${collectionName}`);
    return true;
    
  } catch (error) {
    handleFirestoreError(error, 'remove', { collectionName, docId, ...options });
    return false;
  }
};

// ===== LISTENERS EN TIEMPO REAL =====

/**
 * Suscripción a cambios de un documento
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @param {function} callback - Callback(doc) cuando cambia
 * @param {function} errorCallback - Callback(error) en caso de error
 * @returns {function} Función unsubscribe
 */
export const onSnapshotDoc = (collectionName, docId, callback, errorCallback) => {
  try {
    logger.firebase(`Setting up snapshot listener for ${collectionName}/${docId}`);
    
    const docRef = doc(db, collectionName, docId);
    
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() });
        } else {
          callback(null);
        }
      },
      (error) => {
        handleFirestoreError(error, 'onSnapshotDoc', { collectionName, docId });
        if (errorCallback) errorCallback(error);
      }
    );
  } catch (error) {
    logger.error('Error setting up snapshot listener:', error);
    return () => {}; // Retorna unsubscribe vacío
  }
};

/**
 * Suscripción a cambios de una colección
 * @param {string} collectionName - Nombre de la colección
 * @param {object} queryOptions - Filtros (where, orderBy, limit)
 * @param {function} callback - Callback(docs[]) cuando cambia
 * @param {function} errorCallback - Callback(error) en caso de error
 * @returns {function} Función unsubscribe
 */
export const onSnapshotCollection = (collectionName, queryOptions, callback, errorCallback) => {
  try {
    logger.firebase(`Setting up snapshot listener for collection ${collectionName}`, queryOptions);
    
    let q = collection(db, collectionName);
    const constraints = [];
    
    if (queryOptions.where) {
      if (Array.isArray(queryOptions.where[0])) {
        queryOptions.where.forEach(([field, operator, value]) => {
          constraints.push(where(field, operator, value));
        });
      } else {
        const [field, operator, value] = queryOptions.where;
        constraints.push(where(field, operator, value));
      }
    }
    
    if (queryOptions.orderBy) {
      const [field, direction = 'asc'] = Array.isArray(queryOptions.orderBy) 
        ? queryOptions.orderBy 
        : [queryOptions.orderBy];
      constraints.push(orderBy(field, direction));
    }
    
    if (queryOptions.limit) {
      constraints.push(limit(queryOptions.limit));
    }
    
    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const docs = [];
        querySnapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() });
        });
        callback(docs);
      },
      (error) => {
        handleFirestoreError(error, 'onSnapshotCollection', { collectionName, ...queryOptions });
        if (errorCallback) errorCallback(error);
      }
    );
  } catch (error) {
    logger.error('Error setting up collection snapshot listener:', error);
    return () => {}; // Retorna unsubscribe vacío
  }
};

// ===== EXPORTAR SERVICIO COMPLETO =====

const firestoreService = {
  // Colecciones
  COLLECTIONS,
  
  // Operaciones básicas
  fetchDoc,
  fetchCollection,
  create,
  set,
  update,
  remove,
  
  // Listeners
  onSnapshotDoc,
  onSnapshotCollection,
  
  // Utilidades
  getServerTimestamp,
  timestampToDate,
  resetErrorState,
};

export default firestoreService;
