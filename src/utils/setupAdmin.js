/**
 * Script temporal para configurar perfil de super admin
 * Ejecutar una sola vez para asegurar permisos correctos
 */

import { db } from '../firebase.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const setupSuperAdminProfile = async () => {
  try {
    console.log('🔧 Configurando perfil de super admin...');
    
    // Crear perfil de super admin para roberto@mistatas.com
    const superAdminProfile = {
      email: 'roberto@mistatas.com',
      role: 'super_admin',
      name: 'Roberto Mistatas',
      isActive: true,
      permissions: [
        'read_all',
        'write_all', 
        'manage_users',
        'manage_metrics',
        'system_admin'
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'system'
    };
    
    // Obtener UID del usuario actual (debe estar autenticado)
    const { auth } = await import('../firebase.js');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuario no autenticado. Inicia sesión primero.');
    }
    
    if (currentUser.email !== 'roberto@mistatas.com') {
      throw new Error('Solo el super admin puede ejecutar esta función.');
    }
    
    // Crear documento de perfil
    const userProfileRef = doc(db, 'userProfiles', currentUser.uid);
    await setDoc(userProfileRef, superAdminProfile, { merge: true });
    
    console.log('✅ Perfil de super admin configurado correctamente');
    console.log('📧 Email:', currentUser.email);
    console.log('🆔 UID:', currentUser.uid);
    
    return {
      success: true,
      message: 'Perfil de super admin configurado',
      uid: currentUser.uid,
      email: currentUser.email
    };
    
  } catch (error) {
    console.error('❌ Error configurando perfil:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Función para verificar permisos actuales
export const checkCurrentPermissions = async () => {
  try {
    const { auth } = await import('../firebase.js');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return { authenticated: false };
    }
    
    const { getDoc, doc } = await import('firebase/firestore');
    const userProfileRef = doc(db, 'userProfiles', currentUser.uid);
    const profileSnap = await getDoc(userProfileRef);
    
    return {
      authenticated: true,
      uid: currentUser.uid,
      email: currentUser.email,
      hasProfile: profileSnap.exists(),
      profile: profileSnap.exists() ? profileSnap.data() : null
    };
    
  } catch (error) {
    return {
      authenticated: false,
      error: error.message
    };
  }
};