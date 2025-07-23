import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Store para manejo del estado del usuario
 * Incluye persistencia en localStorage para mantener sesión entre recargas
 */
const useUserStore = create(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      // Acciones
      setUser: (userData) => {
        set({ 
          user: userData, 
          isAuthenticated: !!userData,
          error: null 
        });
      },

      setLoading: (loading) => {
        set({ loading });
      },

      setError: (error) => {
        set({ error });
      },

      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false, 
          loading: false,
          error: null 
        });
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ 
            user: { ...currentUser, ...updates } 
          });
        }
      },

      // Getters computed
      getUserDisplayName: () => {
        const { user } = get();
        return user?.displayName || user?.email || 'Usuario';
      },

      getUserEmail: () => {
        const { user } = get();
        return user?.email || '';
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin' || false;
      }
    }),
    {
      name: 'user-storage', // Clave en localStorage
      storage: createJSONStorage(() => localStorage),
      // Solo persistir datos esenciales, no estados temporales
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useUserStore;
