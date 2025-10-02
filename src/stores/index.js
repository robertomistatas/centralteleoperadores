// Barrel file para centralizar todas las exportaciones de stores
// Facilita las importaciones y mantiene el código organizado

export { default as useUserStore } from './useUserStore';
export { default as useCallStore } from './useCallStore';
export { default as useAppStore } from './useAppStore';
export { default as useBeneficiaryStore } from './useBeneficiaryStore';
export { default as useUserManagementStore } from './useUserManagementStore';
export { useSeguimientosStore } from './useSeguimientosStore';
export { useGestionesStore, GESTION_ESTADOS, ESTADO_COLORS } from './useGestionesStore';

// Exportar hooks combinados útiles
export const useStores = () => ({
  userStore: useUserStore,
  callStore: useCallStore,
  appStore: useAppStore,
  beneficiaryStore: useBeneficiaryStore,
  userManagementStore: useUserManagementStore,
  seguimientosStore: useSeguimientosStore,
  gestionesStore: useGestionesStore
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
