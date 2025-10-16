import { useMemo, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import useUserManagementStore from '../stores/useUserManagementStore';
import { userManagementService } from '../services/userManagementService';

/**
 * Hook personalizado para gestión de permisos y roles
 */
export const usePermissions = () => {
  const { user } = useAuth();
  const { roles, getRoleById, getUserPermissions, hasPermission, isSuperAdmin, canAccessModule } = useUserManagementStore();
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Cargar perfil del usuario desde Firestore
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.email) {
        setUserProfile(null);
        return;
      }

      setProfileLoading(true);
      try {
        console.log('🔍 Cargando perfil para usuario:', user.email);
        
        // Verificar si es super admin por email
        if (user.email === 'roberto@mistatas.com') {
          console.log('👑 Usuario identificado como Super Admin');
          setUserProfile({
            ...user,
            role: 'super_admin',
            isActive: true
          });
        } else if (user.email?.toLowerCase() === 'carolina@mistatas.com' || 
                   user.displayName?.toLowerCase().includes('carolina reyes')) {
          console.log('👑 Usuario identificado como Carolina Reyes (Admin)');
          setUserProfile({
            ...user,
            role: 'admin',
            isActive: true
          });
        } else {
          // 🧠 SISTEMA INTELIGENTE: Buscar perfil con múltiples estrategias
          console.log('📡 Consultando Firestore para email:', user.email);
          
          // Estrategia 1: Buscar por email exacto
          let profile = await userManagementService.getUserProfileByEmail(user.email);
          
          // Estrategia 2: Si no encuentra, buscar por UID (usuarios sincronizados)
          if (!profile && user.uid) {
            console.log('🔍 Buscando por UID:', user.uid);
            profile = await userManagementService.getUserProfile(user.uid);
          }
          
          // Estrategia 3: Buscar usuarios pendientes por email
          if (!profile) {
            console.log('🔍 Buscando en usuarios pendientes...');
            try {
              const { smartUserCreationService } = await import('../services/smartUserCreationService');
              const pendingUsers = await smartUserCreationService.getPendingUsers();
              const pendingUser = pendingUsers.find(u => u.email === user.email?.toLowerCase());
              
              if (pendingUser) {
                console.log('✅ Usuario encontrado en pendientes:', pendingUser);
                profile = {
                  role: pendingUser.role,
                  email: pendingUser.email,
                  displayName: pendingUser.displayName,
                  isActive: true,
                  isPending: true
                };
              }
            } catch (error) {
              console.log('⚠️ Error buscando usuarios pendientes:', error);
            }
          }
          
          console.log('📄 Perfil obtenido de Firestore:', profile);
          
          if (profile) {
            const finalProfile = {
              ...user,
              ...profile,
              role: profile.role || 'teleoperadora'
            };
            console.log('✅ Perfil final aplicado:', finalProfile);
            setUserProfile(finalProfile);
          } else {
            console.log('❌ No se encontró perfil en Firestore, usando rol por defecto');
            // Usuario sin perfil en Firestore, usar rol por defecto
            setUserProfile({
              ...user,
              role: 'teleoperadora',
              isActive: true
            });
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Fallback a rol por defecto
        setUserProfile({
          ...user,
          role: 'teleoperadora',
          isActive: true
        });
      } finally {
        setProfileLoading(false);
      }
    };

    loadUserProfile();
  }, [user?.email]);

  // Obtener perfil completo del usuario (incluyendo rol)
  const memoizedUserProfile = useMemo(() => {
    return userProfile;
  }, [userProfile]);

  // Obtener información del rol actual
  const currentRole = useMemo(() => {
    if (!memoizedUserProfile?.role) return null;
    return getRoleById(memoizedUserProfile.role);
  }, [memoizedUserProfile?.role, getRoleById]);

  // Obtener permisos del usuario actual
  const permissions = useMemo(() => {
    if (!memoizedUserProfile) return [];
    return getUserPermissions(memoizedUserProfile);
  }, [memoizedUserProfile, getUserPermissions]);

  // Verificar si es super admin
  const isSuper = useMemo(() => {
    return isSuperAdmin(memoizedUserProfile);
  }, [memoizedUserProfile, isSuperAdmin]);

  // Funciones de verificación de permisos
  const checkPermission = (permission) => {
    return hasPermission(memoizedUserProfile, permission);
  };

  const checkModuleAccess = (module) => {
    return canAccessModule(memoizedUserProfile, module);
  };

  // Verificar acceso a módulos específicos
  const canViewDashboard = checkModuleAccess('dashboard');
  const canViewCalls = checkModuleAccess('calls');
  const canViewAssignments = checkModuleAccess('assignments');
  const canViewBeneficiaries = checkModuleAccess('beneficiaries');
  const canViewSeguimientos = checkModuleAccess('seguimientos');
  const canViewCalendar = checkModuleAccess('seguimientos'); // Usar mismo permiso que seguimientos
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

    if (canViewCalendar) {
      modules.push({
        id: 'calendar',
        label: 'Ver Calendario',
        icon: 'Calendar'
      });
    }

    // ✅ GESTIONES - Visible para TODOS los roles (colaborativo)
    modules.push({
      id: 'gestiones',
      label: 'Gestiones',
      icon: 'Users'
    });

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

    // ⭐ NUEVO: Módulo de Análisis de Excel (solo Super Admin)
    if (isSuper) {
      modules.push({
        id: 'excel',
        label: 'Análisis de Excel',
        icon: 'FileSpreadsheet'
      });
      modules.push({
        id: 'excelCharts',
        label: 'Visualizaciones Excel',
        icon: 'BarChart3'
      });
      modules.push({
        id: 'excelComparison',
        label: 'Comparar Análisis',
        icon: 'GitCompare'
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
    // 🔥 CRÍTICO: NO calcular defaultTab hasta que el perfil esté cargado
    if (!memoizedUserProfile || !memoizedUserProfile.role) {
      console.log('⏳ Esperando perfil de usuario para calcular defaultTab...');
      return null; // Retornar null hasta que tengamos el rol
    }
    
    console.log('🔍 Determinando defaultTab:', {
      canViewSeguimientos,
      canViewDashboard,
      userRole: memoizedUserProfile?.role,
      isSuper,
      visibleModulesCount: visibleModules.length,
      firstModule: visibleModules[0]?.id
    });

    // Super Admin y Admin siempre cargan en Dashboard
    if (isSuper || memoizedUserProfile?.role === 'admin') {
      console.log('✅ defaultTab = dashboard (Admin/Super Admin)');
      return 'dashboard';
    }

    // Teleoperadora carga en Seguimientos (su módulo principal)
    if (canViewSeguimientos && memoizedUserProfile?.role === 'teleoperadora') {
      console.log('✅ defaultTab = seguimientos (Teleoperadora)');
      return 'seguimientos';
    }

    // Fallback: Dashboard si tiene permiso, o primer módulo visible
    if (canViewDashboard) {
      console.log('✅ defaultTab = dashboard (fallback con permiso)');
      return 'dashboard';
    }
    
    // Último recurso: seguimientos si tiene permiso, sino el primer módulo
    if (canViewSeguimientos) {
      console.log('✅ defaultTab = seguimientos (último recurso con permiso)');
      return 'seguimientos';
    }
    
    console.log('⚠️ defaultTab = primer módulo visible:', visibleModules[0]?.id);
    return visibleModules[0]?.id || 'dashboard';
  }, [canViewSeguimientos, canViewDashboard, memoizedUserProfile?.role, isSuper]); // ✅ REMOVIDO visibleModules de dependencias

  return {
    // Usuario y perfil
    user: memoizedUserProfile,
    currentRole,
    permissions,
    profileLoading,
    
    // Verificaciones generales
    isSuperAdmin: isSuper,
    isAdmin: memoizedUserProfile?.role === 'admin' || isSuper,
    isAuditor: memoizedUserProfile?.role === 'auditor',
    isTeleoperadora: memoizedUserProfile?.role === 'teleoperadora',
    
    // Funciones de verificación
    checkPermission,
    checkModuleAccess,
    
    // Permisos específicos por módulo
    canViewDashboard,
    canViewCalls,
    canViewAssignments,
    canViewBeneficiaries,
    canViewSeguimientos,
    canViewCalendar,
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
