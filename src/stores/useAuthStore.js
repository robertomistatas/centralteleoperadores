/**
 * useAuthStore.js
 * Store para gestión de autenticación y usuario actual
 * 
 * Refactorización: Centraliza estado de autenticación, usa authService
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService from '../services/authService';
import logger from '../utils/logger';

/**
 * Estado inicial del store
 */
const initialState = {
  user: null,
  role: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  unsubscribe: null, // Función para cancelar listener de auth
};

/**
 * Store de autenticación
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // ===== INICIALIZACIÓN =====
      
      /**
       * Inicializa listener de cambios de autenticación
       */
      initialize: () => {
        const { unsubscribe: currentUnsubscribe } = get();
        
        // Cancelar listener anterior si existe
        if (currentUnsubscribe) {
          currentUnsubscribe();
        }

        set({ loading: true });

        // Suscribirse a cambios de auth
        const unsubscribe = authService.onAuthChange((user) => {
          if (user) {
            set({
              user,
              role: user.role || 'teleoperadora',
              isAuthenticated: true,
              loading: false,
              error: null,
            });
            logger.auth('Usuario autenticado en store:', user.uid);
          } else {
            set({
              user: null,
              role: null,
              isAuthenticated: false,
              loading: false,
              error: null,
            });
            logger.auth('Usuario no autenticado');
          }
        });

        set({ unsubscribe });
      },

      // ===== ACCIONES DE AUTENTICACIÓN =====
      
      /**
       * Inicia sesión
       * @param {object} credentials - {email, password}
       */
      login: async (credentials) => {
        try {
          set({ loading: true, error: null });
          logger.auth('Intentando login:', credentials.email);

          const user = await authService.login(credentials.email, credentials.password);

          set({
            user,
            role: user.role || 'teleoperadora',
            isAuthenticated: true,
            loading: false,
            error: null,
          });

          logger.auth('Login exitoso:', user.uid);
          return { success: true, user };
          
        } catch (error) {
          logger.error('Error en login:', error);
          set({
            loading: false,
            error: error.message,
          });
          return { success: false, error: error.message };
        }
      },

      /**
       * Cierra sesión
       */
      logout: async () => {
        try {
          set({ loading: true });
          logger.auth('Cerrando sesión');

          await authService.logout();

          // Cancelar listener
          const { unsubscribe } = get();
          if (unsubscribe) {
            unsubscribe();
          }

          set({
            ...initialState,
            loading: false,
          });

          logger.auth('Logout exitoso');
          return { success: true };
          
        } catch (error) {
          logger.error('Error en logout:', error);
          set({ loading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      /**
       * Registra un nuevo usuario
       * @param {object} data - {email, password, displayName, role}
       */
      register: async (data) => {
        try {
          set({ loading: true, error: null });
          logger.auth('Registrando usuario:', data.email);

          const user = await authService.register(data.email, data.password, {
            displayName: data.displayName,
            role: data.role || 'teleoperadora',
          });

          set({
            user,
            role: user.role,
            isAuthenticated: true,
            loading: false,
            error: null,
          });

          logger.auth('Registro exitoso:', user.uid);
          return { success: true, user };
          
        } catch (error) {
          logger.error('Error en registro:', error);
          set({
            loading: false,
            error: error.message,
          });
          return { success: false, error: error.message };
        }
      },

      /**
       * Solicita restablecimiento de contraseña
       * @param {string} email
       */
      resetPassword: async (email) => {
        try {
          set({ loading: true, error: null });
          await authService.resetPassword(email);
          set({ loading: false });
          return { success: true };
        } catch (error) {
          logger.error('Error en resetPassword:', error);
          set({ loading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      // ===== ACCIONES DE USUARIO =====
      
      /**
       * Actualiza el usuario manualmente (útil para actualizaciones de perfil)
       * @param {object} updates - Campos a actualizar
       */
      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },

      /**
       * Establece el usuario directamente (útil para testing o contextos especiales)
       * @param {object} user
       */
      setUser: (user) => {
        set({
          user,
          role: user?.role || null,
          isAuthenticated: !!user,
        });
      },

      // ===== UTILIDADES =====
      
      /**
       * Verifica si el usuario tiene un rol específico
       * @param {string} requiredRole
       */
      hasRole: (requiredRole) => {
        const { role } = get();
        if (!role) return false;
        
        // Super admin tiene acceso a todo
        if (role === 'super_admin') return true;
        
        return role === requiredRole;
      },

      /**
       * Verifica si el usuario es super admin
       */
      isSuperAdmin: () => {
        const { role } = get();
        return role === 'super_admin';
      },

      /**
       * Verifica si el usuario es admin
       */
      isAdmin: () => {
        const { role } = get();
        return role === 'admin' || role === 'super_admin';
      },

      /**
       * Verifica si el usuario es teleoperadora
       */
      isTeleoperadora: () => {
        const { role } = get();
        return role === 'teleoperadora';
      },

      // ===== RESET =====
      
      /**
       * Resetea el store (útil para testing o logout completo)
       */
      reset: () => {
        const { unsubscribe } = get();
        if (unsubscribe) {
          unsubscribe();
        }
        set({ ...initialState, loading: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Solo persistir datos básicos, no funciones ni listeners
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
