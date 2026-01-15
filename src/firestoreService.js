import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  addDoc,
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db, auth } from './firebase';

// Colecciones de Firestore
const COLLECTIONS = {
  OPERATORS: 'operators',
  ASSIGNMENTS: 'assignments',
  CALL_DATA: 'callData',
  USER_DATA: 'userData',
  BENEFICIARIES: 'beneficiaries',
  BENEFICIARY_UPLOADS: 'beneficiaryUploads'
};

// Variable para controlar el logging de errores por usuario
const permissionErrorsByUser = new Map();

// Función para resetear el estado de error (útil para testing o reconexión)
export const resetErrorState = (userId = null) => {
  if (userId) {
    permissionErrorsByUser.delete(userId);
  } else {
    permissionErrorsByUser.clear();
  }
};

// Función para obtener el ID del usuario actual
const getCurrentUserId = () => {
  try {
    // ✅ Usar la instancia de auth importada correctamente
    const user = auth.currentUser;
    if (user && user.uid) {
      console.log('🔍 Usuario autenticado detectado:', user.uid);
      return user.uid;
    }
    console.warn('⚠️ No hay usuario autenticado en Firebase Auth');
    return 'anonymous';
  } catch (error) {
    console.error('❌ Error obteniendo usuario actual:', error);
    return 'anonymous';
  }
};

// Helper function para manejar errores de permisos
const handleFirestoreError = (error, operation) => {
  const userId = getCurrentUserId();
  
  if (error.code === 'permission-denied') {
    if (!permissionErrorsByUser.has(userId)) {
      console.warn(`⚠️ Firebase Firestore: Permisos insuficientes para usuario ${userId}. La aplicación funciona en modo demo.`);
      console.info('💡 Para habilitar persistencia, configura Firestore siguiendo las instrucciones en FIREBASE_SETUP.md');
      permissionErrorsByUser.set(userId, true);
    }
    return false; // Cambio: retornar false en lugar de null para operaciones fallidas
  }
  
  if (error.code === 'failed-precondition' && error.message.includes('index')) {
    console.info('🔍 Firebase está creando índices necesarios. Usando datos locales temporalmente.');
    console.info('🔗 Estado del índice: https://console.firebase.google.com/project/centralteleoperadores/firestore/indexes');
    return false; // Cambio: retornar false en lugar de null
  }
  
  console.error(`❌ Error en ${operation}:`, error);
  throw error; // Lanzar el error para que sea capturado en el catch
};

// Estado de disponibilidad para operaciones de escritura
export const isFirestoreReady = () => {
  const userId = getCurrentUserId();
  return !permissionErrorsByUser.get(userId);
};

export const assertFirestoreReady = (operation = 'realizar la operación') => {
  if (!isFirestoreReady()) {
    const err = new Error('Firestore no está configurado o no tiene permisos. No se puede ' + operation + '.');
    err.code = 'firestore-not-ready';
    throw err;
  }
};

// Servicio para Operadores
export const operatorService = {
  // Crear operador
  async create(userId, operatorData, options = {}) {
    try {
      assertFirestoreReady('crear operador');

      if (!operatorData?.email) {
        throw new Error('operatorData.email es requerido para crear operador');
      }

      const payload = {
        ...operatorData,
        userId,
        emailNormalized: operatorData.email?.toLowerCase?.().trim?.() || operatorData.email,
        isActive: operatorData.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (!payload.emailNormalized) {
        throw new Error('operatorId/emailNormalized inválido. No se puede crear operador.');
      }

      if (options.id) {
        const opId = options.id;
        await setDoc(doc(db, COLLECTIONS.OPERATORS, opId), payload, { merge: true });
        return { id: opId, ...payload };
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.OPERATORS), payload);
      return { id: docRef.id, ...payload };
    } catch (error) {
      return handleFirestoreError(error, 'crear operador');
    }
  },

  // Obtener operadores del usuario
  async getByUser(userId) {
    const currentUserId = getCurrentUserId();
    if (permissionErrorsByUser.has(currentUserId)) {
      return []; // Retornar inmediatamente si ya sabemos que hay problemas de permisos para este usuario
    }
    
    try {
      // Consulta simplificada que no requiere índices complejos
      const q = query(
        collection(db, COLLECTIONS.OPERATORS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      // Ordenar en el cliente mientras se crea el índice
      const operators = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar por fecha de creación (más recientes primero)
      return operators.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    } catch (error) {
      const result = handleFirestoreError(error, 'obtener operadores');
      return result || []; // Retornar array vacío si hay error de permisos
    }
  },

  // 🆕 Obtener operadores por email (útil para teleoperadoras)
  async getByEmail(email) {
    const currentUserId = getCurrentUserId();
    if (permissionErrorsByUser.has(currentUserId)) {
      return [];
    }

    try {
      const normalizedEmail = email?.toLowerCase().trim();
      if (!normalizedEmail) {
        console.warn('⚠️ operatorService.getByEmail llamado sin email válido');
        return [];
      }

      console.log('🔍 Buscando operador por email:', normalizedEmail);
      const q = query(
        collection(db, COLLECTIONS.OPERATORS),
        where('email', '==', normalizedEmail)
      );
      const querySnapshot = await getDocs(q);

      const operators = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (operators.length === 0) {
        console.warn('⚠️ No se encontraron operadores con el email:', normalizedEmail);
      } else {
        console.log('✅ Operadores encontrados por email:', operators.length);
      }

      return operators;
    } catch (error) {
      const result = handleFirestoreError(error, 'obtener operadores por email');
      return result || [];
    }
  },

  // Actualizar operador
  async update(operatorId, data) {
    try {
      assertFirestoreReady('actualizar operador');

      if (!operatorId) {
        throw new Error('operatorId requerido para actualizar operador');
      }

      const operatorRef = doc(db, COLLECTIONS.OPERATORS, operatorId);
      await updateDoc(operatorRef, {
        ...data,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      return handleFirestoreError(error, 'actualizar operador');
    }
  },

  // Eliminar operador
  async delete(operatorId) {
    try {
      assertFirestoreReady('eliminar operador');

      if (!operatorId) {
        throw new Error('operatorId requerido para eliminar operador');
      }

      console.log('🗑️ Eliminando operador de Firestore:', operatorId);
      await deleteDoc(doc(db, COLLECTIONS.OPERATORS, operatorId));
      console.log('✅ Operador eliminado exitosamente de Firestore');
      return true;
    } catch (error) {
      console.error('❌ Error eliminando operador de Firestore:', error);
      return handleFirestoreError(error, 'eliminar operador');
    }
  },

  // 🆕 Obtener TODOS los operadores (para admin)
  async getAll() {
    const currentUserId = getCurrentUserId();
    if (permissionErrorsByUser.has(currentUserId)) {
      console.log(`⚠️ Omitiendo getAll() para usuario ${currentUserId} debido a errores previos`);
      return []; // Retornar inmediatamente si ya sabemos que hay problemas de permisos para este usuario
    }
    
    try {
      console.log('📥 Obteniendo todos los operadores desde Firebase...');
      let querySnapshot;
      try {
        const q = query(collection(db, COLLECTIONS.OPERATORS), where('isActive', '==', true));
        querySnapshot = await getDocs(q);
      } catch (err) {
        console.warn('⚠️ getAll operators (activos) falló, usando fallback completo:', err?.message);
        querySnapshot = await getDocs(collection(db, COLLECTIONS.OPERATORS));
      }
      
      const operators = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('✅ Operadores obtenidos:', operators.length);
      
      // Ordenar por fecha de creación (más recientes primero)
      const activeOnly = operators.filter(op => op.isActive !== false);

      return activeOnly.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('❌ Error obteniendo todos los operadores:', error);
      const result = handleFirestoreError(error, 'obtener todos los operadores');
      return result || []; // Retornar array vacío si hay error de permisos
    }
  }
};

// Servicio para Asignaciones
export const assignmentService = {
  // Crear/actualizar asignaciones para un operador (docId = operatorId)
  async saveOperatorAssignments(userId, operatorId, assignments) {
    try {
      assertFirestoreReady('guardar asignaciones');

      if (!operatorId) {
        throw new Error('operatorId requerido para guardar asignaciones');
      }

      const docRef = doc(db, COLLECTIONS.ASSIGNMENTS, operatorId);

      await setDoc(docRef, {
        operatorId,
        ownerUserId: userId || null,
        assignments,
        updatedAt: new Date()
      }, { merge: true });

      // Limpieza opcional: eliminar documento legado `${userId}_${operatorId}` si existe
      if (userId) {
        const legacyRef = doc(db, COLLECTIONS.ASSIGNMENTS, `${userId}_${operatorId}`);
        const legacySnap = await getDoc(legacyRef);
        if (legacySnap.exists()) {
          await deleteDoc(legacyRef);
        }
      }

      return true;
    } catch (error) {
      return handleFirestoreError(error, 'guardar asignaciones');
    }
  },

  // Obtener asignaciones de un operador (prioriza nuevo esquema assignments/{operatorId})
  async getOperatorAssignments(userId, operatorId) {
    try {
      // Nuevo esquema
      const primaryRef = doc(db, COLLECTIONS.ASSIGNMENTS, operatorId);
      const primarySnap = await getDoc(primaryRef);

      if (primarySnap.exists()) {
        return primarySnap.data().assignments || [];
      }

      // Compatibilidad con esquema legado `${userId}_${operatorId}`
      if (userId) {
        const legacyRef = doc(db, COLLECTIONS.ASSIGNMENTS, `${userId}_${operatorId}`);
        const legacySnap = await getDoc(legacyRef);
        if (legacySnap.exists()) {
          return legacySnap.data().assignments || [];
        }
      }

      return [];
    } catch (error) {
      const result = handleFirestoreError(error, 'obtener asignaciones');
      return result || [];
    }
  },

  // Obtener todas las asignaciones del usuario (ownerUserId) con fallback a esquema legado
  async getAllUserAssignments(userId) {
    const currentUserId = getCurrentUserId();
    if (permissionErrorsByUser.has(currentUserId)) {
      return {};
    }
    
    try {
      // Nuevo esquema: ownerUserId
      const q = query(
        collection(db, COLLECTIONS.ASSIGNMENTS),
        where('ownerUserId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      const allAssignments = {};
      querySnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const opId = data.operatorId || docSnap.id;
        allAssignments[opId] = data.assignments || [];
      });

      // Compatibilidad: si no hay resultados y existen documentos legados
      if (Object.keys(allAssignments).length === 0) {
        const legacyQuery = query(
          collection(db, COLLECTIONS.ASSIGNMENTS),
          where('userId', '==', userId)
        );
        const legacySnapshot = await getDocs(legacyQuery);
        legacySnapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          const opId = data.operatorId || docSnap.id;
          allAssignments[opId] = data.assignments || [];
        });
      }
      
      return allAssignments;
    } catch (error) {
      const result = handleFirestoreError(error, 'obtener todas las asignaciones');
      return result || {};
    }
  },

  // Eliminar asignaciones de un operador
  async deleteOperatorAssignments(userId, operatorId) {
    try {
      assertFirestoreReady('eliminar asignaciones');

      if (!operatorId) {
        throw new Error('operatorId requerido para eliminar asignaciones');
      }

      const primaryId = operatorId;
      const legacyId = userId ? `${userId}_${operatorId}` : null;

      console.log('🗑️ Eliminando asignaciones del operador:', { operatorId, primaryId, legacyId });

      // Eliminar documento principal
      const primaryRef = doc(db, COLLECTIONS.ASSIGNMENTS, primaryId);
      const primarySnap = await getDoc(primaryRef);
      if (primarySnap.exists()) {
        await deleteDoc(primaryRef);
        console.log('✅ Asignaciones eliminadas (nuevo esquema)');
      }

      // Eliminar documento legado si existe
      if (legacyId) {
        const legacyRef = doc(db, COLLECTIONS.ASSIGNMENTS, legacyId);
        const legacySnap = await getDoc(legacyRef);
        if (legacySnap.exists()) {
          await deleteDoc(legacyRef);
          console.log('✅ Asignaciones legado eliminadas');
        }
      }

      return true;
    } catch (error) {
      if (error.code === 'not-found') {
        console.log('ℹ️ No había asignaciones para este operador');
        return true;
      }
      console.error('❌ Error eliminando asignaciones del operador:', error);
      return handleFirestoreError(error, 'eliminar asignaciones');
    }
  },

  // 🆕 Obtener TODAS las asignaciones (para admin)
  async getAll() {
    const currentUserId = getCurrentUserId();
    if (permissionErrorsByUser.has(currentUserId)) {
      console.log(`⚠️ Omitiendo getAll() para usuario ${currentUserId} debido a errores previos`);
      return []; // Retornar inmediatamente si ya sabemos que hay problemas de permisos para este usuario
    }
    
    try {
      console.log('📥 Obteniendo todas las asignaciones desde Firebase...');
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.ASSIGNMENTS));
      
      const allAssignments = [];
      querySnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const operatorId = data.operatorId || docSnap.id;
        if (data.assignments && Array.isArray(data.assignments)) {
          data.assignments.forEach(assignment => {
            allAssignments.push({
              ...assignment,
              operatorId,
              userId: data.ownerUserId || data.userId || null
            });
          });
        }
      });
      
      console.log('✅ Asignaciones obtenidas:', allAssignments.length);
      return allAssignments;
    } catch (error) {
      console.error('❌ Error obteniendo todas las asignaciones:', error);
      const result = handleFirestoreError(error, 'obtener todas las asignaciones');
      return result || []; // Retornar array vacío si hay error de permisos
    }
  },

  // 🆕 Obtener asignaciones agrupadas por operatorId (independiente del userId dueño)
  async getAssignmentsByOperatorIds(operatorIds = []) {
    const currentUserId = getCurrentUserId();
    if (permissionErrorsByUser.has(currentUserId)) {
      return {};
    }

    if (!Array.isArray(operatorIds) || operatorIds.length === 0) {
      return {};
    }

    const assignmentsByOperator = {};

    // Firestore "in" soporta máximo 10 elementos por consulta
    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < operatorIds.length; i += chunkSize) {
      chunks.push(operatorIds.slice(i, i + chunkSize));
    }

    try {
      for (const chunk of chunks) {
        const q = query(
          collection(db, COLLECTIONS.ASSIGNMENTS),
          where('operatorId', 'in', chunk)
        );
        const querySnapshot = await getDocs(q);

        querySnapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          const operatorId = data.operatorId || docSnap.id;

          if (!operatorId) {
            return;
          }

          if (!assignmentsByOperator[operatorId]) {
            assignmentsByOperator[operatorId] = [];
          }

          if (Array.isArray(data.assignments)) {
            assignmentsByOperator[operatorId].push(...data.assignments);
          }
        });
      }

      return assignmentsByOperator;
    } catch (error) {
      const result = handleFirestoreError(error, 'obtener asignaciones por operatorId');
      return result || {};
    }
  }
};

// Servicio para Datos de Llamadas
export const callDataService = {
  // Guardar datos de llamadas
  async saveCallData(userId, callData) {
    try {
      const docRef = doc(db, COLLECTIONS.CALL_DATA, userId);
      await setDoc(docRef, {
        userId,
        callData,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      return handleFirestoreError(error, 'guardar datos de llamadas');
    }
  },

  // Obtener datos de llamadas
  async getCallData(userId) {
    const currentUserId = getCurrentUserId();
    if (permissionErrorsByUser.has(currentUserId)) {
      return []; // Retornar inmediatamente si ya sabemos que hay problemas de permisos para este usuario
    }
    
    try {
      const docRef = doc(db, COLLECTIONS.CALL_DATA, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().callData || [];
      }
      return [];
    } catch (error) {
      const result = handleFirestoreError(error, 'obtener datos de llamadas');
      return result || [];
    }
  }
};

// Servicio para Datos de Usuario
export const userDataService = {
  // Guardar configuración del usuario
  async saveUserConfig(userId, config) {
    try {
      const docRef = doc(db, COLLECTIONS.USER_DATA, userId);
      await setDoc(docRef, {
        userId,
        config,
        updatedAt: new Date()
      }, { merge: true });
      return true;
    } catch (error) {
      return handleFirestoreError(error, 'guardar configuración de usuario');
    }
  },

  // Obtener configuración del usuario
  async getUserConfig(userId) {
    try {
      const docRef = doc(db, COLLECTIONS.USER_DATA, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().config || {};
      }
      return {};
    } catch (error) {
      const result = handleFirestoreError(error, 'obtener configuración de usuario');
      return result || {};
    }
  }
};
