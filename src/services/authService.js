/**
 * authService.js
 * Servicio centralizado para autenticación con Firebase
 * 
 * Refactorización: Separa lógica de autenticación de componentes y stores
 */

import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
import firestoreService from './firestoreService';
import logger from '../utils/logger';

const { COLLECTIONS } = firestoreService;

/**
 * Inicia sesión con email y contraseña
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña
 * @returns {Promise<object>} Usuario autenticado y perfil
 */
export const login = async (email, password) => {
  try {
    logger.auth('Iniciando sesión:', email);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Obtener perfil del usuario desde Firestore
    const userProfile = await firestoreService.fetchDoc(COLLECTIONS.USERS, user.uid);
    
    logger.auth('Sesión iniciada exitosamente:', user.uid);
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      ...userProfile,
    };
  } catch (error) {
    logger.error('Error al iniciar sesión:', error);
    
    // Traducir errores comunes
    let message = 'Error al iniciar sesión. Inténtelo nuevamente.';
    
    switch (error.code) {
      case 'auth/invalid-email':
        message = 'El correo electrónico no es válido.';
        break;
      case 'auth/user-disabled':
        message = 'Esta cuenta ha sido deshabilitada.';
        break;
      case 'auth/user-not-found':
        message = 'No se encontró una cuenta con este correo.';
        break;
      case 'auth/wrong-password':
        message = 'La contraseña es incorrecta.';
        break;
      case 'auth/too-many-requests':
        message = 'Demasiados intentos fallidos. Inténtelo más tarde.';
        break;
    }
    
    throw new Error(message);
  }
};

/**
 * Cierra la sesión del usuario actual
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    logger.auth('Cerrando sesión');
    await signOut(auth);
    logger.auth('Sesión cerrada exitosamente');
  } catch (error) {
    logger.error('Error al cerrar sesión:', error);
    throw new Error('Error al cerrar sesión. Inténtelo nuevamente.');
  }
};

/**
 * Registra un nuevo usuario
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña
 * @param {object} profile - Datos adicionales del perfil
 * @returns {Promise<object>} Usuario creado
 */
export const register = async (email, password, profile = {}) => {
  try {
    logger.auth('Registrando nuevo usuario:', email);
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Actualizar perfil de Firebase Auth
    if (profile.displayName) {
      await updateProfile(user, {
        displayName: profile.displayName,
      });
    }
    
    // Crear documento de usuario en Firestore
    const userProfile = {
      email: user.email,
      displayName: profile.displayName || '',
      role: profile.role || 'teleoperadora',
      createdAt: new Date().toISOString(),
      isActive: true,
      ...profile,
    };
    
    await firestoreService.set(COLLECTIONS.USERS, user.uid, userProfile);
    
    logger.auth('Usuario registrado exitosamente:', user.uid);
    
    return {
      uid: user.uid,
      email: user.email,
      ...userProfile,
    };
  } catch (error) {
    logger.error('Error al registrar usuario:', error);
    
    let message = 'Error al registrar usuario. Inténtelo nuevamente.';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Ya existe una cuenta con este correo electrónico.';
        break;
      case 'auth/invalid-email':
        message = 'El correo electrónico no es válido.';
        break;
      case 'auth/weak-password':
        message = 'La contraseña debe tener al menos 6 caracteres.';
        break;
    }
    
    throw new Error(message);
  }
};

/**
 * Envía email para restablecer contraseña
 * @param {string} email - Email del usuario
 * @returns {Promise<void>}
 */
export const resetPassword = async (email) => {
  try {
    logger.auth('Enviando email de restablecimiento:', email);
    await sendPasswordResetEmail(auth, email);
    logger.auth('Email de restablecimiento enviado');
  } catch (error) {
    logger.error('Error al enviar email de restablecimiento:', error);
    
    let message = 'Error al enviar email. Inténtelo nuevamente.';
    
    switch (error.code) {
      case 'auth/invalid-email':
        message = 'El correo electrónico no es válido.';
        break;
      case 'auth/user-not-found':
        message = 'No se encontró una cuenta con este correo.';
        break;
    }
    
    throw new Error(message);
  }
};

/**
 * Observa cambios en el estado de autenticación
 * @param {function} callback - Callback(user) cuando cambia el estado
 * @returns {function} Función unsubscribe
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      logger.auth('Usuario autenticado:', user.uid);
      
      // Obtener perfil completo
      const userProfile = await firestoreService.fetchDoc(COLLECTIONS.USERS, user.uid);
      
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        ...userProfile,
      });
    } else {
      logger.auth('Usuario no autenticado');
      callback(null);
    }
  });
};

/**
 * Obtiene el usuario actual
 * @returns {object|null} Usuario actual o null
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Verifica si hay un usuario autenticado
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!auth.currentUser;
};

// Exportar como objeto por defecto
const authService = {
  login,
  logout,
  register,
  resetPassword,
  onAuthChange,
  getCurrentUser,
  isAuthenticated,
};

export default authService;
