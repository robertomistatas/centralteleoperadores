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
  serverTimestamp
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser as deleteAuthUser
} from 'firebase/auth';
import { db, auth } from '../firebase';

/**
 * Servicio para gestión de usuarios y roles
 * Solo accesible por super usuarios
 */
class UserManagementService {
  constructor() {
    this.collection = 'userProfiles';
    this.rolesCollection = 'roles';
  }

  /**
   * Verificar si el usuario actual es super admin
   */
  isSuperAdmin(user) {
    return user?.email === 'roberto@mistatas.com';
  }

  /**
   * Función de diagnóstico para verificar la conexión con Firebase
   * @returns {Promise<Object>} Información de diagnóstico
   */
  async diagnoseUserCollection() {
    try {
      console.log('🩺 DIAGNÓSTICO: Iniciando diagnóstico de colección de usuarios');
      
      // Verificar autenticación
      const currentUser = auth.currentUser;
      console.log('🩺 Usuario autenticado:', currentUser?.email);
      console.log('🩺 Es super admin:', this.isSuperAdmin(currentUser));
      
      // Intentar acceder a la colección sin query (más simple)
      console.log('🩺 Intentando acceso directo a la colección...');
      const collectionRef = collection(db, this.collection);
      const snapshot = await getDocs(collectionRef);
      
      console.log('🩺 Documentos encontrados:', snapshot.size);
      
      const docs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        docs.push({
          id: doc.id,
          email: data.email,
          role: data.role,
          createdAt: data.createdAt?.toDate?.() || data.createdAt
        });
        console.log('🩺 Doc:', doc.id, data);
      });
      
      return {
        success: true,
        authenticated: !!currentUser,
        userEmail: currentUser?.email,
        isSuperAdmin: this.isSuperAdmin(currentUser),
        collectionExists: true,
        documentsCount: snapshot.size,
        documents: docs
      };
      
    } catch (error) {
      console.error('🩺 Error en diagnóstico:', error);
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        authenticated: !!auth.currentUser,
        userEmail: auth.currentUser?.email
      };
    }
  }

  /**
   * Crear usuarios de prueba para resolver el problema de colección vacía
   */
  async createTestUsers() {
    try {
      console.log('🧪 Creando usuarios de prueba...');
      
      const testUsers = [
        {
          email: 'javiera.reyes@mistatas.com',
          displayName: 'Javiera Reyes Alvarado',
          role: 'teleoperadora',
          isActive: true
        },
        {
          email: 'admin@mistatas.com', 
          displayName: 'Administrador Sistema',
          role: 'admin',
          isActive: true
        }
      ];

      const createdUsers = [];

      for (const testUser of testUsers) {
        try {
          // Crear perfil directamente en Firestore (sin crear en Auth)
          const userProfile = {
            uid: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            email: testUser.email,
            displayName: testUser.displayName,
            role: testUser.role,
            isActive: testUser.isActive,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: auth.currentUser?.uid,
            lastLogin: null,
            isTestUser: true // Marcar como usuario de prueba
          };

          await setDoc(doc(db, this.collection, userProfile.uid), userProfile);
          
          console.log('✅ Usuario de prueba creado:', testUser.email);
          createdUsers.push({ id: userProfile.uid, ...userProfile });
          
        } catch (error) {
          console.error('❌ Error creando usuario de prueba:', testUser.email, error);
        }
      }

      console.log(`🧪 Usuarios de prueba creados: ${createdUsers.length}`);
      return createdUsers;
      
    } catch (error) {
      console.error('❌ Error en createTestUsers:', error);
      throw error;
    }
  }

  /**
   * Eliminar usuarios de prueba
   */
  async cleanTestUsers() {
    try {
      console.log('🧹 Limpiando usuarios de prueba...');
      
      const q = query(
        collection(db, this.collection),
        where('isTestUser', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const deletePromises = [];
      
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      
      console.log(`🧹 ${querySnapshot.size} usuarios de prueba eliminados`);
      return querySnapshot.size;
      
    } catch (error) {
      console.error('❌ Error limpiando usuarios de prueba:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los usuarios (solo super admin)
   */
  async getAllUsers() {
    try {
      console.log('🔍 Iniciando carga de usuarios...');
      console.log('🔍 Usuario actual:', auth.currentUser?.email);
      console.log('🔍 Colección:', this.collection);
      
      const q = query(
        collection(db, this.collection),
        orderBy('createdAt', 'desc')
      );
      
      console.log('🔍 Ejecutando query...');
      const querySnapshot = await getDocs(q);
      const users = [];

      console.log('🔍 Docs encontrados:', querySnapshot.size);

      querySnapshot.forEach((doc) => {
        const userData = {
          id: doc.id,
          ...doc.data()
        };
        console.log('📄 Usuario encontrado:', userData);
        users.push(userData);
      });

      console.log(`✅ Total usuarios obtenidos: ${users.length}`);
      return users;
    } catch (error) {
      console.error('❌ Error obteniendo usuarios:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      return [];
    }
  }

  /**
   * Crear un nuevo usuario (solo perfil en Firestore)
   * Nota: No crea usuario en Firebase Auth por limitaciones de permisos del cliente
   */
  async createUser(userData) {
    try {
      const { email, password, displayName, role, isActive, ...otherData } = userData;

      // Validar permisos
      if (!this.isSuperAdmin(auth.currentUser)) {
        throw new Error('Sin permisos para esta operación');
      }

      // Validar datos requeridos
      if (!email || !displayName) {
        throw new Error('Email y nombre son requeridos');
      }

      // Generar UID único para el perfil
      const profileId = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Crear solo el perfil en Firestore
      const userProfile = {
        uid: profileId,
        email: email.toLowerCase().trim(),
        displayName: displayName.trim(),
        role: role || 'teleoperadora',
        isActive: isActive !== false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid,
        lastLogin: null,
        authenticationStatus: 'pending', // El usuario deberá autenticarse por separado
        profileType: 'admin_created', // Indica que fue creado por un admin
        ...otherData
      };

      // Verificar que el email no exista ya
      const existingUsers = await this.getAllUsers();
      const emailExists = existingUsers.some(user => 
        user.email.toLowerCase() === email.toLowerCase()
      );

      if (emailExists) {
        throw new Error('Ya existe un usuario con este email');
      }

      await setDoc(doc(db, this.collection, profileId), userProfile);

      console.log('✅ Perfil de usuario creado:', profileId);
      console.log('📧 El usuario deberá registrarse en Firebase Auth con el email:', email);
      
      return { id: profileId, ...userProfile };
    } catch (error) {
      console.error('❌ Error creando perfil de usuario:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Actualizar usuario
   */
  async updateUser(userId, updateData) {
    try {
      const docRef = doc(db, this.collection, userId);
      const updatePayload = {
        ...updateData,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid
      };

      await updateDoc(docRef, updatePayload);

      console.log('✅ Usuario actualizado:', userId);
      return updatePayload;
    } catch (error) {
      console.error('❌ Error actualizando usuario:', error);
      throw new Error('Error al actualizar el usuario');
    }
  }

  /**
   * Eliminar usuario (soft delete)
   */
  async deleteUser(userId) {
    try {
      // Soft delete - solo marcar como inactivo
      await this.updateUser(userId, { 
        isActive: false, 
        deletedAt: serverTimestamp(),
        deletedBy: auth.currentUser?.uid
      });

      console.log('✅ Usuario eliminado (soft delete):', userId);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando usuario:', error);
      throw new Error('Error al eliminar el usuario');
    }
  }

  /**
   * Obtener perfil de usuario
   */
  async getUserProfile(userId) {
    try {
      const docRef = doc(db, this.collection, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error obteniendo perfil:', error);
      return null;
    }
  }

  /**
   * Actualizar último login
   */
  async updateLastLogin(userId) {
    try {
      const docRef = doc(db, this.collection, userId);
      await updateDoc(docRef, {
        lastLogin: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Error actualizando último login:', error);
    }
  }

  /**
   * Buscar usuarios por criterios
   */
  async searchUsers(searchTerm, role = null) {
    try {
      let q = collection(db, this.collection);

      if (role) {
        q = query(q, where('role', '==', role));
      }

      const querySnapshot = await getDocs(q);
      const users = [];

      querySnapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() };
        
        // Filtrar por término de búsqueda en el cliente
        if (!searchTerm || 
            userData.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userData.email?.toLowerCase().includes(searchTerm.toLowerCase())) {
          users.push(userData);
        }
      });

      return users;
    } catch (error) {
      console.error('❌ Error buscando usuarios:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getUserStats() {
    try {
      const users = await this.getAllUsers();
      
      const stats = {
        total: users.length,
        active: users.filter(u => u.isActive !== false).length,
        byRole: {},
        recentLogins: users.filter(u => {
          if (!u.lastLogin) return false;
          const lastLogin = new Date(u.lastLogin.toDate ? u.lastLogin.toDate() : u.lastLogin);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return lastLogin >= weekAgo;
        }).length
      };

      // Contar por rol
      users.forEach(user => {
        const role = user.role || 'sin_rol';
        stats.byRole[role] = (stats.byRole[role] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return { total: 0, active: 0, byRole: {}, recentLogins: 0 };
    }
  }

  /**
   * Validar permisos de usuario
   */
  validateUserPermissions(user, requiredPermission) {
    if (!user) return false;
    
    // Super admin tiene todos los permisos
    if (this.isSuperAdmin(user)) return true;

    // Mapeo de roles a permisos
    const rolePermissions = {
      super_admin: ['all'],
      admin: ['dashboard', 'calls', 'assignments', 'beneficiaries', 'seguimientos', 'history', 'audit', 'reports'],
      auditor: ['dashboard', 'history', 'audit', 'reports'],
      teleoperadora: ['seguimientos']
    };

    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes('all') || userPermissions.includes(requiredPermission);
  }

  /**
   * Crear perfil para usuario existente
   */
  async createProfileForExistingUser(user, profileData) {
    try {
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        role: profileData.role || 'teleoperadora',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid,
        lastLogin: null,
        ...profileData
      };

      await setDoc(doc(db, this.collection, user.uid), userProfile);
      
      console.log('✅ Perfil creado para usuario existente:', user.uid);
      return userProfile;
    } catch (error) {
      console.error('❌ Error creando perfil:', error);
      throw error;
    }
  }

  /**
   * Migrar usuarios existentes sin perfil
   */
  async migrateExistingUsers() {
    try {
      console.log('🔄 Iniciando migración de usuarios...');
      
      // Obtener usuarios de Firebase Auth (esto requiere Admin SDK en producción)
      // Por ahora, crear perfiles para usuarios conocidos
      
      const knownUsers = [
        {
          email: 'roberto@mistatas.com',
          displayName: 'Roberto Mistatas',
          role: 'super_admin'
        }
      ];

      const migratedUsers = [];

      for (const userData of knownUsers) {
        try {
          // Verificar si ya existe el perfil
          const existingProfile = await this.searchUsers(userData.email);
          
          if (existingProfile.length === 0) {
            // Solo crear si no existe
            console.log('Creando perfil para:', userData.email);
            migratedUsers.push(userData.email);
          }
        } catch (error) {
          console.error('Error migrando usuario:', userData.email, error);
        }
      }

      console.log(`✅ Migración completada: ${migratedUsers.length} usuarios migrados`);
      return migratedUsers;
    } catch (error) {
      console.error('❌ Error en migración:', error);
      throw error;
    }
  }

  /**
   * Obtener mensajes de error legibles
   */
  getErrorMessage(error) {
    const errorMessages = {
      'auth/email-already-in-use': 'El email ya está registrado',
      'auth/invalid-email': 'Email inválido',
      'auth/weak-password': 'La contraseña es muy débil',
      'auth/user-not-found': 'Usuario no encontrado',
      'permission-denied': 'Sin permisos para esta operación',
      'unavailable': 'Servicio no disponible'
    };

    return errorMessages[error.code] || error.message || 'Error desconocido';
  }
}

// Exportar instancia singleton
export const userManagementService = new UserManagementService();
export default userManagementService;
