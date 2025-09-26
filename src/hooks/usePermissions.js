import { useMemo } from 'react';
import { useAuth } from '../AuthContext';
import useUserManagementStore from '../stores/useUserManagementStore';

/**
 * Hook personalizado para gestión de permisos y roles
 */
export const usePermissions = () => {
  const { user } = useAuth();
  const { roles, getRoleById, getUserPermissions, hasPermission, isSuperAdmin, canAccessModule } = useUserManagementStore();

  // Obtener perfil completo del usuario (incluyendo rol)
  const userProfile = useMemo(() => {
    if (!user) return null;
    
    // Verificar si es super admin por email
    if (user.email === 'roberto@mistatas.com') {
      return {
        ...user,
        role: 'super_admin',
        isActive: true
      };
    }

    // Para otros usuarios, podrías obtener el perfil desde Firestore
    // Por ahora, inferir rol básico
    return {
      ...user,
      role: user.role || 'teleoperadora',
      isActive: user.isActive !== false
    };
  }, [user]);

  // Obtener información del rol actual
  const currentRole = useMemo(() => {
    if (!userProfile?.role) return null;
    return getRoleById(userProfile.role);
  }, [userProfile?.role, getRoleById]);

  // Obtener permisos del usuario actual
  const permissions = useMemo(() => {
    if (!userProfile) return [];
    return getUserPermissions(userProfile);
  }, [userProfile, getUserPermissions]);

  // Verificar si es super admin
  const isSuper = useMemo(() => {
    return isSuperAdmin(userProfile);
  }, [userProfile, isSuperAdmin]);

  // Funciones de verificación de permisos
  const checkPermission = (permission) => {
    return hasPermission(userProfile, permission);
  };

  const checkModuleAccess = (module) => {
    return canAccessModule(userProfile, module);
  };

  // Verificar acceso a módulos específicos
  const canViewDashboard = checkModuleAccess('dashboard');
  const canViewCalls = checkModuleAccess('calls');
  const canViewAssignments = checkModuleAccess('assignments');
  const canViewBeneficiaries = checkModuleAccess('beneficiaries');
  const canViewSeguimientos = checkModuleAccess('seguimientos');
  const canViewHistory = checkModuleAccess('history');
  const canViewAudit = checkModuleAccess('audit');
  const canViewReports = checkModuleAccess('reports');
  const canViewMetrics = isSuper; // Solo super admin puede ver métricas por ahora

  // Solo super admin puede acceder a configuración
  const canViewConfig = isSuper;

  // Determinar módulos visibles en la navegación
  const visibleModules = useMemo(() => {
    const modules = [];

    if (canViewDashboard) {
      modules.push({
        id: 'dashboard',
        label: 'Panel Principal',
        icon: 'BarChart3'
      });
    }

    if (canViewCalls) {
      modules.push({
        id: 'calls',
        label: 'Registro de Llamadas',
        icon: 'Phone'
      });
    }

    if (canViewAssignments) {
      modules.push({
        id: 'assignments',
        label: 'Asignaciones',
        icon: 'Users'
      });
    }

    if (canViewBeneficiaries) {
      modules.push({
        id: 'beneficiaries',
        label: 'Beneficiarios Base',
        icon: 'Database'
      });
    }

    if (canViewSeguimientos) {
      modules.push({
        id: 'seguimientos',
        label: 'Seguimientos Periódicos',
        icon: 'Activity'
      });
    }

    if (canViewHistory) {
      modules.push({
        id: 'history',
        label: 'Historial de Seguimientos',
        icon: 'Clock'
      });
    }

    if (canViewAudit) {
      modules.push({
        id: 'audit',
        label: 'Auditoría Avanzada',
        icon: 'BarChart3'
      });
    }

    if (canViewMetrics) {
      modules.push({
        id: 'metrics',
        label: 'Métricas Avanzadas',
        icon: 'PieChart'
      });
    }

    if (canViewConfig) {
      modules.push({
        id: 'config',
        label: 'Configuración',
        icon: 'Settings'
      });
    }

    return modules;
  }, [
    canViewDashboard,
    canViewCalls,
    canViewAssignments,
    canViewBeneficiaries,
    canViewSeguimientos,
    canViewHistory,
    canViewAudit,
    canViewMetrics,
    canViewConfig
  ]);

  // Determinar tab por defecto según permisos
  const defaultTab = useMemo(() => {
    if (canViewSeguimientos && userProfile?.role === 'teleoperadora') {
      return 'seguimientos';
    }
    if (canViewDashboard) {
      return 'dashboard';
    }
    return visibleModules[0]?.id || 'dashboard';
  }, [canViewSeguimientos, canViewDashboard, userProfile?.role, visibleModules]);

  return {
    // Usuario y perfil
    user: userProfile,
    currentRole,
    permissions,
    
    // Verificaciones generales
    isSuperAdmin: isSuper,
    isAdmin: userProfile?.role === 'admin' || isSuper,
    isAuditor: userProfile?.role === 'auditor',
    isTeleoperadora: userProfile?.role === 'teleoperadora',
    
    // Funciones de verificación
    checkPermission,
    checkModuleAccess,
    
    // Permisos específicos por módulo
    canViewDashboard,
    canViewCalls,
    canViewAssignments,
    canViewBeneficiaries,
    canViewSeguimientos,
    canViewHistory,
    canViewAudit,
    canViewReports,
    canViewMetrics,
    canViewConfig,
    
    // Navegación
    visibleModules,
    defaultTab,
    
    // Utilidades
    hasAnyPermission: permissions.length > 0,
    roleLevel: currentRole?.level || 0,
    roleName: currentRole?.name || 'Sin rol'
  };
};

export default usePermissions;
