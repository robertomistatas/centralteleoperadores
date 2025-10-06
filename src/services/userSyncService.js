/**
 * 🔄 USER SYNC SERVICE
 * Servicio para sincronización global de datos de usuario
 * Mantiene consistencia entre todos los módulos de la aplicación
 * 
 * Características:
 * - UID único como identificador universal
 * - userProfiles como fuente única de verdad
 * - Event bus para notificaciones globales
 * - Cache inteligente para optimizar consultas
 */

import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

class UserSyncService {
  constructor() {
    this.listeners = new Set();
    this.cache = new Map();
    console.log('🔄 UserSyncService inicializado');
  }

  /**
   * Obtener perfil actualizado de usuario por UID
   * @param {string} uid - UID de Firebase Auth
   * @returns {Promise<Object|null>} Perfil del usuario
   */
  async getUserProfile(uid) {
    if (!uid) {
      console.warn('⚠️ getUserProfile llamado sin UID');
      return null;
    }

    try {
      // Verificar cache primero
      if (this.cache.has(uid)) {
        const cached = this.cache.get(uid);
        // Cache válido por 5 minutos
        if (Date.now() - cached.timestamp < 300000) {
          console.log('📦 Usando perfil desde cache:', cached.data.email);
          return cached.data;
        }
      }

      console.log('📥 Obteniendo perfil desde Firebase:', uid);

      // Obtener de Firebase
      const docRef = doc(db, 'userProfiles', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = { 
          uid,
          ...docSnap.data()
        };
        
        // Actualizar cache
        this.cache.set(uid, {
          data,
          timestamp: Date.now()
        });

        console.log('✅ Perfil obtenido:', data.email);
        return data;
      }

      console.warn('⚠️ No se encontró perfil para UID:', uid);
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo perfil:', error);
      return null;
    }
  }

  /**
   * Obtener perfil por email
   * @param {string} email - Email del usuario
   * @returns {Promise<Object|null>} Perfil del usuario
   */
  async getUserProfileByEmail(email) {
    if (!email) {
      console.warn('⚠️ getUserProfileByEmail llamado sin email');
      return null;
    }

    try {
      console.log('🔍 Buscando perfil por email:', email);

      // Buscar en cache primero
      for (const [uid, cached] of this.cache.entries()) {
        if (cached.data.email?.toLowerCase() === email.toLowerCase()) {
          // Verificar si cache es válido
          if (Date.now() - cached.timestamp < 300000) {
            console.log('📦 Perfil encontrado en cache');
            return cached.data;
          }
        }
      }

      // Buscar en Firebase
      const q = query(
        collection(db, 'userProfiles'),
        where('email', '==', email)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = {
          uid: doc.id,
          ...doc.data()
        };

        // Actualizar cache
        this.cache.set(doc.id, {
          data,
          timestamp: Date.now()
        });

        console.log('✅ Perfil encontrado por email:', data.displayName);
        return data;
      }

      console.warn('⚠️ No se encontró perfil para email:', email);
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo perfil por email:', error);
      return null;
    }
  }

  /**
   * Actualizar perfil y notificar a toda la app
   * @param {string} uid - UID del usuario
   * @param {Object} updates - Datos a actualizar
   * @returns {Promise<Object|null>} Perfil actualizado
   */
  async updateUserProfile(uid, updates) {
    if (!uid) {
      throw new Error('UID requerido para actualizar perfil');
    }

    try {
      console.log('🔄 Actualizando perfil:', uid, updates);

      // Obtener perfil ANTES de actualizar para limpiar cache del email viejo
      const oldProfile = await this.getUserProfile(uid);

      // Actualizar en Firebase
      const docRef = doc(db, 'userProfiles', uid);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date()
      });

      // Invalidar cache por UID
      this.cache.delete(uid);

      // Si cambió el email, limpiar también por email viejo
      if (oldProfile?.email && updates.email && oldProfile.email !== updates.email) {
        console.log('📧 Email cambió de', oldProfile.email, 'a', updates.email);
        this.clearCacheByEmail(oldProfile.email);
      }

      // Obtener datos actualizados
      const updatedProfile = await this.getUserProfile(uid);

      if (updatedProfile) {
        // Notificar a toda la app con datos viejos y nuevos
        this.notifyProfileUpdate(updatedProfile, oldProfile);
      }

      console.log('✅ Perfil actualizado y sincronizado');
      return updatedProfile;
    } catch (error) {
      console.error('❌ Error actualizando perfil:', error);
      throw error;
    }
  }

  /**
   * Notificar actualización de perfil a toda la app
   * @param {Object} profile - Perfil actualizado
   * @param {Object} oldProfile - Perfil anterior (opcional)
   */
  notifyProfileUpdate(profile, oldProfile = null) {
    console.log('📢 Notificando actualización de perfil a toda la app:', profile.email);

    // Event bus global usando CustomEvent con datos viejos y nuevos
    const event = new CustomEvent('userProfileUpdated', {
      detail: {
        ...profile,
        oldEmail: oldProfile?.email || null,
        oldDisplayName: oldProfile?.displayName || null
      }
    });
    
    window.dispatchEvent(event);

    // Notificar a listeners registrados
    this.listeners.forEach(listener => {
      try {
        listener(profile);
      } catch (error) {
        console.error('❌ Error en listener:', error);
      }
    });
  }

  /**
   * Registrar listener para cambios de perfil
   * @param {Function} callback - Función a ejecutar cuando se actualice un perfil
   * @returns {Function} Función para desregistrar el listener
   */
  addListener(callback) {
    this.listeners.add(callback);
    console.log('👂 Listener registrado. Total:', this.listeners.size);
    
    // Retornar función de limpieza
    return () => {
      this.listeners.delete(callback);
      console.log('👋 Listener eliminado. Total:', this.listeners.size);
    };
  }

  /**
   * Limpiar cache completo
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 Cache limpiado');
  }

  /**
   * Limpiar cache de un usuario específico
   * @param {string} uid - UID del usuario
   */
  clearUserCache(uid) {
    this.cache.delete(uid);
    console.log('🧹 Cache limpiado para usuario:', uid);
  }

  /**
   * Limpiar cache por email
   * @param {string} email - Email del usuario
   */
  clearCacheByEmail(email) {
    if (!email) return;
    
    const emailLower = email.toLowerCase();
    const uidsToDelete = [];
    
    for (const [uid, cached] of this.cache.entries()) {
      if (cached.data.email?.toLowerCase() === emailLower) {
        uidsToDelete.push(uid);
      }
    }
    
    uidsToDelete.forEach(uid => this.cache.delete(uid));
    
    if (uidsToDelete.length > 0) {
      console.log('🧹 Cache limpiado para email:', email, '(', uidsToDelete.length, 'entradas)');
    }
  }

  /**
   * Obtener estadísticas del cache
   * @returns {Object} Estadísticas
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      listeners: this.listeners.size
    };
  }
}

// Instancia singleton
export const userSyncService = new UserSyncService();

// Exportar también la clase por si se necesita instanciar otra copia
export default userSyncService;
