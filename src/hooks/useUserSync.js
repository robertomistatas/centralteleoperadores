/**
 * 🔄 USE USER SYNC HOOK
 * Hook para mantener datos de usuario sincronizados en todos los componentes
 * 
 * Características:
 * - Sincronización automática con userProfiles
 * - Escucha actualizaciones globales en tiempo real
 * - Cache inteligente
 * - Manejo de estados de carga y error
 * 
 * Uso:
 * const { profile, isLoading, error, refresh } = useUserSync(user.uid);
 */

import { useEffect, useState, useCallback } from 'react';
import { userSyncService } from '../services/userSyncService';

/**
 * Hook para sincronización de datos de usuario
 * @param {string} uid - UID de Firebase Auth del usuario
 * @returns {Object} { profile, isLoading, error, refresh }
 */
export const useUserSync = (uid) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Cargar perfil desde userSyncService
   */
  const loadProfile = useCallback(async () => {
    if (!uid) {
      setIsLoading(false);
      setProfile(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 useUserSync: Cargando perfil para UID:', uid);
      const data = await userSyncService.getUserProfile(uid);
      
      setProfile(data);
      
      if (data) {
        console.log('✅ useUserSync: Perfil cargado:', data.email);
      } else {
        console.warn('⚠️ useUserSync: No se encontró perfil para UID:', uid);
      }
    } catch (err) {
      console.error('❌ useUserSync: Error cargando perfil:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  /**
   * Efecto principal: cargar perfil y escuchar actualizaciones
   */
  useEffect(() => {
    if (!uid) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    // Cargar perfil inicial
    loadProfile();

    // Escuchar actualizaciones globales
    const handleProfileUpdate = (event) => {
      const updatedProfile = event.detail;
      
      // Solo actualizar si es el mismo usuario
      if (updatedProfile && updatedProfile.uid === uid && mounted) {
        console.log('🔄 useUserSync: Perfil actualizado globalmente:', updatedProfile.email);
        setProfile(updatedProfile);
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    // Cleanup
    return () => {
      mounted = false;
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, [uid, loadProfile]);

  /**
   * Función para forzar recarga del perfil
   */
  const refresh = useCallback(() => {
    userSyncService.clearUserCache(uid);
    loadProfile();
  }, [uid, loadProfile]);

  return {
    profile,
    isLoading,
    error,
    refresh
  };
};

/**
 * Hook para sincronización por email (útil para casos legacy)
 * @param {string} email - Email del usuario
 * @returns {Object} { profile, isLoading, error, refresh }
 */
export const useUserSyncByEmail = (email) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!email) {
      setIsLoading(false);
      setProfile(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 useUserSyncByEmail: Buscando perfil por email:', email);
      const data = await userSyncService.getUserProfileByEmail(email);
      
      setProfile(data);
      
      if (data) {
        console.log('✅ useUserSyncByEmail: Perfil encontrado:', data.displayName);
      } else {
        console.warn('⚠️ useUserSyncByEmail: No se encontró perfil para email:', email);
      }
    } catch (err) {
      console.error('❌ useUserSyncByEmail: Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (!email) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    loadProfile();

    // Escuchar actualizaciones globales
    const handleProfileUpdate = (event) => {
      const updatedProfile = event.detail;
      
      // Actualizar si el email coincide
      if (updatedProfile && updatedProfile.email?.toLowerCase() === email.toLowerCase() && mounted) {
        console.log('🔄 useUserSyncByEmail: Perfil actualizado:', updatedProfile.email);
        setProfile(updatedProfile);
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, [email, loadProfile]);

  const refresh = useCallback(() => {
    if (profile?.uid) {
      userSyncService.clearUserCache(profile.uid);
    }
    loadProfile();
  }, [profile, loadProfile]);

  return {
    profile,
    isLoading,
    error,
    refresh
  };
};

export default useUserSync;
