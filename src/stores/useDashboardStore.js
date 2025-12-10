import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store para datos del Dashboard de Teleoperadora
 * Persiste datos entre navegaciones para evitar recargas innecesarias
 */
const useDashboardStore = create(
  persist(
    (set, get) => ({
      // Estados de datos
      beneficiarios: [],
      seguimientos: [],
      isLoading: false,
      dataLoaded: false,
      lastLoadedEmail: null, // Para saber si cambió el usuario
      lastCallStoreUpdate: null, // ✅ NUEVO: Timestamp del último update del CallStore
      
      // Acciones
      setBeneficiarios: (beneficiarios) => {
        console.log('📦 [DASHBOARD STORE] Guardando beneficiarios:', beneficiarios.length);
        set({ beneficiarios });
      },
      
      setSeguimientos: (seguimientos) => {
        console.log('📦 [DASHBOARD STORE] Guardando seguimientos:', seguimientos.length);
        set({ seguimientos });
      },
      
      setIsLoading: (isLoading) => set({ isLoading }),
      
      setDataLoaded: (dataLoaded, userEmail = null) => {
        console.log('📦 [DASHBOARD STORE] Marcando datos como cargados para:', userEmail);
        // ✅ NUEVO: Guardar timestamp del CallStore al marcar como cargado
        const callStoreUpdate = typeof window !== 'undefined' && window.__callStoreLastUpdate__;
        set({ 
          dataLoaded,
          lastLoadedEmail: userEmail,
          lastCallStoreUpdate: callStoreUpdate || Date.now()
        });
      },
      
      // Verificar si necesitamos recargar (usuario cambió o datos nuevos en CallStore)
      needsReload: (currentUserEmail) => {
        const { lastLoadedEmail, dataLoaded, beneficiarios, lastCallStoreUpdate } = get();
        
        // Si no hay datos cargados, necesitamos recargar
        if (!dataLoaded || beneficiarios.length === 0) {
          console.log('📦 [DASHBOARD STORE] Necesita recarga: sin datos');
          return true;
        }
        
        // Si el usuario cambió, necesitamos recargar
        if (lastLoadedEmail !== currentUserEmail) {
          console.log('📦 [DASHBOARD STORE] Necesita recarga: usuario cambió de', lastLoadedEmail, 'a', currentUserEmail);
          return true;
        }
        
        // ✅ NUEVO: Verificar si hay datos nuevos en el CallStore
        const currentCallStoreUpdate = typeof window !== 'undefined' && window.__callStoreLastUpdate__;
        if (currentCallStoreUpdate && lastCallStoreUpdate && currentCallStoreUpdate !== lastCallStoreUpdate) {
          console.log('📦 [DASHBOARD STORE] Necesita recarga: nuevos datos en CallStore', {
            anterior: lastCallStoreUpdate,
            actual: currentCallStoreUpdate
          });
          return true;
        }
        
        console.log('📦 [DASHBOARD STORE] NO necesita recarga: datos válidos para', currentUserEmail);
        return false;
      },
      
      // Limpiar datos (logout)
      clearDashboard: () => {
        console.log('📦 [DASHBOARD STORE] Limpiando datos');
        set({
          beneficiarios: [],
          seguimientos: [],
          isLoading: false,
          dataLoaded: false,
          lastLoadedEmail: null,
          lastCallStoreUpdate: null
        });
      },
      
      // ✅ NUEVO: Forzar recarga de datos (útil cuando se detectan cambios en CallStore)
      invalidateCache: () => {
        console.log('📦 [DASHBOARD STORE] Invalidando caché, forzando recarga...');
        set({
          dataLoaded: false,
          lastCallStoreUpdate: null
        });
      }
    }),
    {
      name: 'dashboard-storage',
      // ✅ Storage personalizado con manejo de errores
      storage: {
        getItem: (name) => {
          try {
            const value = localStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch (error) {
            console.error('❌ Error leyendo dashboard-storage:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            if (error.name === 'QuotaExceededError') {
              console.warn('⚠️ LocalStorage lleno en dashboard-storage');
              // Si está lleno, limpiar datos antiguos del dashboard
              const state = value?.state || {};
              const minimal = {
                state: {
                  beneficiarios: [],
                  seguimientos: [],
                  dataLoaded: false,
                  lastLoadedEmail: null
                }
              };
              try {
                localStorage.setItem(name, JSON.stringify(minimal));
                console.log('✅ Dashboard-storage limpiado por QuotaExceeded');
              } catch (e) {
                console.error('❌ No se pudo limpiar dashboard-storage:', e);
              }
            } else {
              console.error('❌ Error guardando dashboard-storage:', error);
            }
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (error) {
            console.error('❌ Error eliminando dashboard-storage:', error);
          }
        }
      },
      partialize: (state) => ({
        // ✅ Persistir solo datos esenciales (no el flag isLoading)
        beneficiarios: state.beneficiarios,
        seguimientos: state.seguimientos,
        dataLoaded: state.dataLoaded,
        lastLoadedEmail: state.lastLoadedEmail
      }),
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          return persistedState;
        }
        return persistedState;
      }
    }
  )
);

export default useDashboardStore;
