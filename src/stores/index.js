// Barrel file para centralizar todas las exportaciones de stores
// Facilita las importaciones y mantiene el código organizado

// ===== STORES REFACTORIZADOS (v2) =====
import useUIStore from './useUIStore';
import useAuthStore from './useAuthStore';
import useAsignationsStore from './useAsignationsStore';
import useExcelStore from './useExcelStore';

// ===== STORES EXISTENTES (compatibles) =====
import useUserStore from './useUserStore';
import useCallStore from './useCallStore';
import useAppStore from './useAppStore';
import useBeneficiaryStore from './useBeneficiaryStore';
import useUserManagementStore from './useUserManagementStore';
import useMetricsStore from './useMetricsStore';
import useDashboardStore from './useDashboardStore';

import { useSeguimientosStore } from './useSeguimientosStore';
import { useGestionesStore, GESTION_ESTADOS, ESTADO_COLORS } from './useGestionesStore';

// Re-exportar todos los stores
export { 
  useUIStore, 
  useAuthStore, 
  useAsignationsStore, 
  useExcelStore,
  useUserStore,
  useCallStore,
  useAppStore,
  useBeneficiaryStore,
  useUserManagementStore,
  useSeguimientosStore,
  useGestionesStore,
  useMetricsStore,
  useDashboardStore,
  GESTION_ESTADOS,
  ESTADO_COLORS
};

// Exportar hooks combinados útiles
export const useStores = () => ({
  // Stores refactorizados
  uiStore: useUIStore,
  authStore: useAuthStore,
  asignationsStore: useAsignationsStore,
  
  // Stores existentes
  userStore: useUserStore,
  callStore: useCallStore,
  appStore: useAppStore,
  beneficiaryStore: useBeneficiaryStore,
  userManagementStore: useUserManagementStore,
  seguimientosStore: useSeguimientosStore,
  gestionesStore: useGestionesStore,
  metricsStore: useMetricsStore,
});

// Estados y constantes para auditoría de llamadas
export const CALL_STATUSES = {
  SUCCESSFUL: 'Llamado exitoso',
  FAILED: 'Llamado fallido',
  NO_ANSWER: 'No contesta',
  BUSY: 'Ocupado',
  INVALID: 'Número inválido'
};

export const DATA_SOURCES = {
  EXCEL: 'excel',
  FIREBASE: 'firebase',
  API: 'api'
};

export const FILTER_OPTIONS = {
  STATUS: {
    ALL: 'all',
    SUCCESSFUL: 'successful',
    FAILED: 'failed'
  },
  OPERATOR: {
    ALL: 'all'
  }
};

export const USER_ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  SUPERVISOR: 'supervisor',
  AUDITOR: 'auditor',
  USER: 'user'
};
