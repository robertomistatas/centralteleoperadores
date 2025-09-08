/**
 * Inicializador del store de beneficiarios
 * Garantiza la persistencia correcta de datos
 */

import React from 'react';
import useBeneficiaryStore from '../stores/useBeneficiaryStore';

let initialized = false;

export const initializeBeneficiaryStore = async (userId) => {
  if (initialized) return;
  
  const store = useBeneficiaryStore.getState();
  
  try {
    // Verificar si ya tenemos datos persistidos
    const hasPersistedData = store.beneficiaries && store.beneficiaries.length > 0;
    
    if (!hasPersistedData) {
      // Si no hay datos persistidos, cargar desde Firebase
      console.log('📥 Cargando beneficiarios desde Firebase...');
      await store.loadBeneficiaries(userId);
    } else {
      // Si hay datos persistidos, solo actualizar estadísticas
      console.log('📋 Usando datos persistidos del store...');
      const stats = store.calculateStats(store.beneficiaries);
      useBeneficiaryStore.setState({ stats });
    }
    
    initialized = true;
    
  } catch (error) {
    console.error('❌ Error inicializando store de beneficiarios:', error);
    // En caso de error, intentar cargar desde Firebase de todas formas
    try {
      await store.forceReload(userId);
    } catch (retryError) {
      console.error('❌ Error en reintento de carga:', retryError);
    }
  }
};

// Función para resetear la inicialización (útil para testing)
export const resetInitialization = () => {
  initialized = false;
};

// Hook personalizado para usar con componentes
export const useBeneficiaryStoreWithInit = (userId) => {
  const store = useBeneficiaryStore();
  
  React.useEffect(() => {
    if (userId) {
      initializeBeneficiaryStore(userId);
    }
  }, [userId]);
  
  return store;
};

export default {
  initializeBeneficiaryStore,
  resetInitialization,
  useBeneficiaryStoreWithInit
};
