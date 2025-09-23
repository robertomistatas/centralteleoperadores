import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userManagementService } from '../services/userManagementService';

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
          description: 'Acceso completo al sistema',
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
        const stats = get().calculateStats(users);
        set({ users: users || [], stats });
      },

      loadUsers: async () => {
        console.log('🔄 Store: Iniciando carga de usuarios...');
        set({ isLoading: true });
        try {
          console.log('🔄 Store: Llamando al servicio...');
          const users = await userManagementService.getAllUsers();
          console.log('🔄 Store: Usuarios recibidos del servicio:', users.length);
          get().setUsers(users);
          console.log('🔄 Store: Usuarios guardados en el estado');
        } catch (error) {
          console.error('❌ Store: Error cargando usuarios:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      createUser: async (userData) => {
        try {
          const newUser = await userManagementService.createUser(userData);
          set(state => ({
            users: [...state.users, newUser],
            stats: get().calculateStats([...state.users, newUser])
          }));
          return newUser;
        } catch (error) {
          console.error('Error creando usuario:', error);
          throw error;
        }
      },

      updateUser: async (userId, updateData) => {
        try {
          const updatedUser = await userManagementService.updateUser(userId, updateData);
          set(state => {
            const updatedUsers = state.users.map(user => 
              user.id === userId ? { ...user, ...updatedUser } : user
            );
            return {
              users: updatedUsers,
              stats: get().calculateStats(updatedUsers)
            };
          });
          return updatedUser;
        } catch (error) {
          console.error('Error actualizando usuario:', error);
          throw error;
        }
      },

      deleteUser: async (userId) => {
        try {
          await userManagementService.deleteUser(userId);
          set(state => {
            const filteredUsers = state.users.filter(user => user.id !== userId);
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
          isLoading: false
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
