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

// Servicio para Operadores
export const operatorService = {
  // Crear operador
  async create(userId, operatorData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.OPERATORS), {
        ...operatorData,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return { id: docRef.id, ...operatorData };
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

  // Actualizar operador
  async update(operatorId, data) {
    try {
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
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.OPERATORS));
      
      const operators = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('✅ Operadores obtenidos:', operators.length);
      
      // Ordenar por fecha de creación (más recientes primero)
      return operators.sort((a, b) => {
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
  // Crear/actualizar asignaciones para un operador
  async saveOperatorAssignments(userId, operatorId, assignments) {
    try {
      const docRef = doc(db, COLLECTIONS.ASSIGNMENTS, `${userId}_${operatorId}`);
      await setDoc(docRef, {
        userId,
        operatorId,
        assignments,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      return handleFirestoreError(error, 'guardar asignaciones');
    }
  },

  // Obtener asignaciones de un operador
  async getOperatorAssignments(userId, operatorId) {
    try {
      const docRef = doc(db, COLLECTIONS.ASSIGNMENTS, `${userId}_${operatorId}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().assignments || [];
      }
      return [];
    } catch (error) {
      const result = handleFirestoreError(error, 'obtener asignaciones');
      return result || [];
    }
  },

  // Obtener todas las asignaciones del usuario
  async getAllUserAssignments(userId) {
    const currentUserId = getCurrentUserId();
    if (permissionErrorsByUser.has(currentUserId)) {
      return {}; // Retornar inmediatamente si ya sabemos que hay problemas de permisos para este usuario
    }
    
    try {
      const q = query(
        collection(db, COLLECTIONS.ASSIGNMENTS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      const allAssignments = {};
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        allAssignments[data.operatorId] = data.assignments || [];
      });
      
      return allAssignments;
    } catch (error) {
      const result = handleFirestoreError(error, 'obtener todas las asignaciones');
      return result || {};
    }
  },

  // Eliminar asignaciones de un operador
  async deleteOperatorAssignments(userId, operatorId) {
    try {
      console.log('🗑️ Eliminando asignaciones del operador:', { userId, operatorId });
      const docId = `${userId}_${operatorId}`;
      await deleteDoc(doc(db, COLLECTIONS.ASSIGNMENTS, docId));
      console.log('✅ Asignaciones del operador eliminadas exitosamente');
      return true;
    } catch (error) {
      // Si el documento no existe, no es un error crítico
      if (error.code === 'not-found') {
        console.log('ℹ️ No había asignaciones para este operador (documento no existe)');
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
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.assignments && Array.isArray(data.assignments)) {
          data.assignments.forEach(assignment => {
            allAssignments.push({
              ...assignment,
              operatorId: data.operatorId,
              userId: data.userId
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
