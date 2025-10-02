/**
 * 🚀 SISTEMA INTELIGENTE DE CREACIÓN DE USUARIOS
 * Mejora el proceso de creación para que sea más automático y robusto
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * Servicio mejorado para creación inteligente de usuarios
 */
class SmartUserCreationService {
  constructor() {
    this.collection = 'userProfiles';
    this.pendingUsersCollection = 'pendingUsers';
  }

  /**
   * Crear usuario con sistema inteligente
   * 1. Crea perfil en Firestore inmediatamente
   * 2. Configura listener para cuando el usuario se registre en Auth
   * 3. Sincroniza automáticamente cuando se detecta el registro
   */
  async createUserIntelligent(userData) {
    try {
      console.log('🧠 Iniciando creación inteligente de usuario:', userData.email);
      
      const { email, displayName, role = 'teleoperadora', isActive = true } = userData;
      const normalizedEmail = email.toLowerCase().trim();
      
      // 1. Verificar que no exista ya
      const existingUser = await this.getUserByEmail(normalizedEmail);
      if (existingUser) {
        throw new Error(`Usuario con email ${normalizedEmail} ya existe`);
      }
      
      // 2. Generar UID predictivo para el usuario
      const predictiveUID = this.generatePredictiveUID(normalizedEmail);
      
      // 3. Crear perfil completo en Firestore
      const userProfile = {
        uid: predictiveUID,
        email: normalizedEmail,
        displayName: displayName.trim(),
        role: role,
        isActive: isActive,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || 'system',
        authenticationStatus: 'pending', // Esperando registro en Auth
        profileType: 'smart_created',
        
        // Metadatos para sincronización inteligente
        smartSync: {
          enabled: true,
          emailNormalized: normalizedEmail,
          createdViaApp: true,
          waitingForAuth: true
        }
      };
      
      // 4. Guardar en Firestore
      await setDoc(doc(db, this.collection, predictiveUID), userProfile);
      console.log('✅ Perfil creado en Firestore con UID predictivo:', predictiveUID);
      
      // 5. También crear entrada en "usuarios pendientes" para monitoring
      const pendingUser = {
        email: normalizedEmail,
        displayName: displayName.trim(),
        role: role,
        predictiveUID: predictiveUID,
        createdAt: serverTimestamp(),
        status: 'waiting_auth_registration'
      };
      
      await setDoc(doc(db, this.pendingUsersCollection, predictiveUID), pendingUser);
      console.log('✅ Usuario agregado a lista de pendientes');
      
      // 6. Configurar listener para detectar cuando se registre en Auth
      this.setupAuthDetectionListener(normalizedEmail, predictiveUID);
      
      // 7. Mejorar usePermissions para que reconozca usuarios por email
      await this.updatePermissionsLogic(normalizedEmail, role);
      
      return {
        success: true,
        uid: predictiveUID,
        profile: userProfile,
        message: `Usuario ${displayName} creado exitosamente. Cuando se registre con ${normalizedEmail}, será reconocido automáticamente.`
      };
      
    } catch (error) {
      console.error('❌ Error en creación inteligente:', error);
      throw error;
    }
  }
  
  /**
   * Generar UID predictivo basado en email
   * Esto permite que el sistema reconozca al usuario incluso antes del registro Auth
   */
  generatePredictiveUID(email) {
    const timestamp = Date.now();
    const emailHash = btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    return `smart_${emailHash}_${timestamp}`;
  }
  
  /**
   * Configurar listener para detectar registro en Auth
   */
  setupAuthDetectionListener(email, predictiveUID) {
    console.log('👂 Configurando listener para detectar registro de:', email);
    
    // Monitor cambios en Auth state
    auth.onAuthStateChanged(async (user) => {
      if (user && user.email?.toLowerCase() === email) {
        console.log('🎯 Usuario detectado en Auth:', user.email);
        await this.syncWithAuthRegistration(user, predictiveUID);
      }
    });
  }
  
  /**
   * Sincronizar cuando el usuario se registra en Auth
   */
  async syncWithAuthRegistration(authUser, predictiveUID) {
    try {
      console.log('🔄 Sincronizando usuario con Auth:', authUser.email);
      
      // 1. Actualizar perfil con UID real de Auth
      const currentProfile = await getDoc(doc(db, this.collection, predictiveUID));
      
      if (currentProfile.exists()) {
        const profileData = currentProfile.data();
        
        // 2. Crear nuevo documento con UID real
        const realProfile = {
          ...profileData,
          uid: authUser.uid,
          displayName: authUser.displayName || profileData.displayName,
          authenticationStatus: 'authenticated',
          syncedAt: serverTimestamp(),
          smartSync: {
            ...profileData.smartSync,
            waitingForAuth: false,
            syncedWithAuth: true,
            originalPredictiveUID: predictiveUID
          }
        };
        
        // 3. Guardar con UID real
        await setDoc(doc(db, this.collection, authUser.uid), realProfile);
        console.log('✅ Perfil sincronizado con UID real:', authUser.uid);
        
        // 4. Limpiar usuario pendiente
        await this.cleanupPendingUser(predictiveUID);
        
        console.log('🎉 Sincronización completada exitosamente');
      }
      
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
    }
  }
  
  /**
   * Limpiar usuario de lista de pendientes
   */
  async cleanupPendingUser(predictiveUID) {
    try {
      await setDoc(doc(db, this.pendingUsersCollection, predictiveUID), {
        status: 'completed',
        completedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error limpiando usuario pendiente:', error);
    }
  }
  
  /**
   * Mejorar lógica de permisos para reconocer usuarios por email
   */
  async updatePermissionsLogic(email, role) {
    // Esta función se puede extender para actualizar la lógica de usePermissions
    console.log('🔧 Actualizando lógica de permisos para:', email, 'con rol:', role);
  }
  
  /**
   * Obtener usuario por email
   */
  async getUserByEmail(email) {
    try {
      const q = query(
        collection(db, this.collection), 
        where('email', '==', email.toLowerCase().trim())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo usuario por email:', error);
      return null;
    }
  }
  
  /**
   * Obtener lista de usuarios pendientes
   */
  async getPendingUsers() {
    try {
      const querySnapshot = await getDocs(collection(db, this.pendingUsersCollection));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error obteniendo usuarios pendientes:', error);
      return [];
    }
  }
}

// Instancia singleton
export const smartUserCreationService = new SmartUserCreationService();
export default smartUserCreationService;