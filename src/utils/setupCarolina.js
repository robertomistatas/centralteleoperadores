/**
 * 🔧 INICIALIZADOR DE PERFIL CAROLINA REYES
 * Script para asegurar que Carolina tenga perfil correcto en Firestore
 */

import { db } from '../firebase.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export const ensureCarolinaProfile = async () => {
  try {
    console.log('🔧 Verificando perfil de Carolina Reyes...');
    
    // Definir datos de Carolina
    const carolinaData = {
      email: 'carolina@mistatas.com',
      displayName: 'Carolina Reyes Valencia',
      role: 'admin',
      isActive: true,
      permissions: [
        'dashboard',
        'calls', 
        'assignments',
        'beneficiaries',
        'seguimientos',
        'history',
        'audit',
        'reports'
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'system',
      profileType: 'admin_ensured'
    };
    
    // Generar UID consistente para Carolina
    const carolinaUID = 'carolina-reyes-admin-001';
    
    // Verificar si ya existe
    const carolinaRef = doc(db, 'userProfiles', carolinaUID);
    const existingDoc = await getDoc(carolinaRef);
    
    if (existingDoc.exists()) {
      const existing = existingDoc.data();
      if (existing.role !== 'admin') {
        console.log('🔧 Actualizando rol de Carolina a admin...');
        await setDoc(carolinaRef, {
          ...existing,
          role: 'admin',
          updatedAt: serverTimestamp(),
          lastRoleUpdate: serverTimestamp()
        }, { merge: true });
        console.log('✅ Rol de Carolina actualizado a admin');
      } else {
        console.log('✅ Perfil de Carolina ya existe y es correcto');
      }
    } else {
      console.log('🔧 Creando perfil de Carolina...');
      await setDoc(carolinaRef, carolinaData);
      console.log('✅ Perfil de Carolina creado exitosamente');
    }
    
    return {
      success: true,
      uid: carolinaUID,
      profile: carolinaData
    };
    
  } catch (error) {
    console.error('❌ Error asegurando perfil de Carolina:', error);
    throw error;
  }
};

// Función para uso manual en consola
export const setupCarolinaProfileManual = async () => {
  try {
    const result = await ensureCarolinaProfile();
    console.log('🎯 PERFIL DE CAROLINA CONFIGURADO:', result);
    return result;
  } catch (error) {
    console.error('❌ Error en setup manual:', error);
    return { success: false, error: error.message };
  }
};