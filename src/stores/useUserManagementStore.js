import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userManagementService } from '../services/userManagementService';

// Flag global para evitar loops de carga
let isLoadingUsers = false;

const normalizeEmailKey = (user = {}) => (user.emailNormalized || user.email || '').toLowerCase().trim();

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  const d = new Date(value);
  return isNaN(d) ? 0 : d.getTime();
};

const pickBestProfile = (profiles = []) => {
  return profiles.reduce((best, current) => {
    if (!best) return current;

    const bestActive = best.isActive !== false;
    const currentActive = current.isActive !== false;

    if (currentActive !== bestActive) {
      return currentActive ? current : best;
    }

    const bestTime = toMillis(best.updatedAt || best.createdAt);
    const currentTime = toMillis(current.updatedAt || current.createdAt);

    return currentTime > bestTime ? current : best;
  }, null);
};

const deduplicateProfiles = (profiles = []) => {
  const grouped = profiles.reduce((acc, profile) => {
    const key = normalizeEmailKey(profile);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(profile);
    return acc;
  }, {});

  const deduped = Object.values(grouped).map(pickBestProfile).filter(Boolean);
  return deduped;
};

// Comparar listas por identidad (email normalizado) y estado activo
const areUserListsEqualByIdentity = (a = [], b = []) => {
  if (a.length !== b.length) return false;

  const mapFrom = (list) => {
    const m = new Map();
    list.forEach(user => {
      const key = normalizeEmailKey(user);
      if (!key) return;
      m.set(key, user.isActive !== false);
    });
    return m;
  };

  const mapA = mapFrom(a);
  const mapB = mapFrom(b);

  if (mapA.size !== mapB.size) return false;

  for (const [key, isActive] of mapA.entries()) {
    if (!mapB.has(key)) return false;
    if (mapB.get(key) !== isActive) return false;
  }

  return true;
};

/**
 * Store para gestión de usuarios, roles y permisos
 * Solo accesible por super usuarios
 */
const useUserManagementStore = create(
  persist(
    (set, get) => ({
      // Estado principal
      users: [],
      roles: [
        {
          id: 'super_admin',
          name: 'Super Administrador',
          description: 'Acceso total al sistema',
          permissions: ['all'],
          level: 100,
          color: 'purple'
        },
        {
          id: 'admin',
          name: 'Administrador',
          description: 'Gestión completa de teleoperadoras y auditoría',
          permissions: ['dashboard', 'calls', 'assignments', 'beneficiaries', 'seguimientos', 'history', 'audit', 'reports'],
          level: 80,
          color: 'blue'
        },
        {
          id: 'auditor',
          name: 'Auditor',
          description: 'Solo auditoría y reportes',
          permissions: ['dashboard', 'history', 'audit', 'reports'],
          level: 60,
          color: 'green'
        },
        {
          id: 'teleoperadora',
          name: 'Teleoperadora',
          description: 'Solo seguimientos de sus beneficiarios asignados',
          permissions: ['seguimientos'],
          level: 40,
          color: 'orange'
        }
      ],
      
      // Estados de UI
      isLoading: false,
      isLoaded: false,
      selectedUser: null,
      searchTerm: '',
      filterRole: 'all',
      
      // Estadísticas
      stats: {
        totalUsers: 0,
        activeUsers: 0,
        usersByRole: {}
      },

      // Acciones - Gestión de usuarios
      setUsers: (users) => {
        const activeUsers = (users || []).filter(user => user.isActive !== false);
        const deduped = deduplicateProfiles(activeUsers);

        // Evitar loops: no escribir si no hay cambios relevantes
        if (areUserListsEqualByIdentity(get().users, deduped)) {
          return;
        }

        const stats = get().calculateStats(deduped);
        set({ users: deduped, stats });
      },

      loadUsers: async () => {
        if (isLoadingUsers || get().isLoaded) {
          return;
        }

        isLoadingUsers = true;
        set({ isLoading: true });

        try {
          const users = await userManagementService.getAllUsers();
          const dedupedUsers = deduplicateProfiles(users);
          get().setUsers(dedupedUsers);
          set({ isLoaded: true });
        } catch (error) {
          console.error('[UserStore] loadUsers failed', error);
        } finally {
          isLoadingUsers = false;
          set({ isLoading: false });
        }
      },

      createUser: async (userData) => {
        try {
          const newUser = await userManagementService.createUser(userData);
          set(state => ({
            users: (() => {
              const deduped = deduplicateProfiles([...state.users, newUser]);
              return deduped;
            })(),
            stats: get().calculateStats(deduplicateProfiles([...state.users, newUser]))
          }));
          return newUser;
        } catch (error) {
          console.error('Error creando usuario:', error);
          throw error;
        }
      },

      updateUser: async (userId, updateData) => {
        try {
          // 🔍 Obtener el usuario actual para guardar su email anterior
          const currentUser = get().users.find(u => u.id === userId);
          const oldEmail = currentUser?.email;
          
          console.log('🔄 Store: Actualizando usuario', { userId, oldEmail, newEmail: updateData.email });
          
          // Usar el método completo que actualiza todo el sistema
          const result = await userManagementService.updateUserComplete(userId, updateData, oldEmail);
          
          console.log('✅ Store: Resultado de actualización:', result);
          
          // Actualizar el usuario en el estado local
          set(state => {
            const updatedUsers = state.users.map(user => 
              user.id === userId ? { ...user, ...updateData } : user
            );
            const deduped = deduplicateProfiles(updatedUsers);
            return {
              users: deduped,
              stats: get().calculateStats(deduped)
            };
          });
          
          // 🔥 IMPORTANTE: Forzar recarga de módulos que dependen de los datos de usuario
          console.log('🔄 Store: Notificando cambios a otros módulos...');
          
          // Disparar evento personalizado para que otros módulos se actualicen
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('userDataUpdated', {
              detail: {
                userId,
                oldEmail,
                newEmail: updateData.email,
                updateData,
                result
              }
            }));
          }
          
          return { ...updateData, ...result };
        } catch (error) {
          console.error('❌ Store: Error actualizando usuario:', error);
          throw error;
        }
      },

      deleteUser: async (userId) => {
        try {
          const target = get().users.find(u => u.id === userId);
          const emailKey = normalizeEmailKey(target || {});

          await userManagementService.deactivateUserByEmail(emailKey);

          set(state => {
            const filteredUsers = state.users.filter(user => normalizeEmailKey(user) !== emailKey && user.id !== userId);
            return {
              users: filteredUsers,
              stats: get().calculateStats(filteredUsers)
            };
          });
        } catch (error) {
          console.error('Error eliminando usuario:', error);
          throw error;
        }
      },

      toggleUserStatus: async (userId) => {
        const user = get().users.find(u => u.id === userId);
        if (user) {
          return get().updateUser(userId, { isActive: !user.isActive });
        }
      },

      // Acciones - UI
      setSelectedUser: (user) => set({ selectedUser: user }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      setFilterRole: (role) => set({ filterRole: role }),

      // Getters
      getUsersByRole: (roleId) => {
        return get().users.filter(user => user.role === roleId);
      },

      getFilteredUsers: () => {
        const { users, searchTerm, filterRole } = get();
        let filtered = users;

        // Filtrar por término de búsqueda
        if (searchTerm) {
          filtered = filtered.filter(user =>
            user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        // Filtrar por rol
        if (filterRole && filterRole !== 'all') {
          filtered = filtered.filter(user => user.role === filterRole);
        }

        return filtered;
      },

      getRoleById: (roleId) => {
        return get().roles.find(role => role.id === roleId);
      },

      getUserPermissions: (user) => {
        const role = get().getRoleById(user?.role);
        return role?.permissions || [];
      },

      hasPermission: (user, permission) => {
        const permissions = get().getUserPermissions(user);
        return permissions.includes('all') || permissions.includes(permission);
      },

      isSuperAdmin: (user) => {
        return user?.email === 'roberto@mistatas.com' || user?.role === 'super_admin';
      },

      canAccessModule: (user, module) => {
        // Super admin tiene acceso a todo
        if (get().isSuperAdmin(user)) return true;
        
        // ✅ GESTIONES siempre accesible para todos
        if (module === 'gestiones') return true;
        
        // ✅ CALENDAR usa el mismo permiso que seguimientos
        if (module === 'calendar') {
          return get().hasPermission(user, 'seguimientos');
        }
        
        // Verificar permisos específicos
        return get().hasPermission(user, module);
      },

      // Estadísticas
      calculateStats: (users) => {
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.isActive !== false).length;
        
        const usersByRole = {};
        users.forEach(user => {
          const role = user.role || 'sin_rol';
          usersByRole[role] = (usersByRole[role] || 0) + 1;
        });

        return {
          totalUsers,
          activeUsers,
          usersByRole
        };
      },

      // Utilidades
      exportUsers: () => {
        const users = get().users;
        const dataStr = JSON.stringify(users, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `usuarios_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      },

      resetState: () => {
        set({
          users: [],
          selectedUser: null,
          searchTerm: '',
          filterRole: 'all',
          isLoading: false,
          isLoaded: false
        });
      }
    }),
    {
      name: 'user-management-storage',
      partialize: (state) => ({
        // Solo persistir datos esenciales, no estados temporales
        roles: state.roles
      })
    }
  )
);

export default useUserManagementStore;
