import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Shield, 
  Settings, 
  Plus, 
  Search, 
  Filter,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Crown,
  UserPlus,
  Database,
  Activity,
  Zap,
  BarChart3,
  RefreshCw,
  Globe,
  Lock,
  Palette
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import useUserManagementStore from '../../stores/useUserManagementStore';
import { userManagementService } from '../../services/userManagementService';
import { userSyncService } from '../../services/userSyncService'; // ✅ Servicio de sincronización global
import { useUIStore } from '../../stores';
import logger from '../../utils/logger';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';

/**
 * Panel de Configuración del Sistema - Rediseñado
 * Interfaz moderna, elegante y sofisticada para administración
 */
const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const {
    users,
    roles,
    isLoading,
    stats,
    searchTerm,
    filterRole,
    selectedUser,
    setSearchTerm,
    setFilterRole,
    setSelectedUser,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    getFilteredUsers,
    isSuperAdmin,
    exportUsers
  } = useUserManagementStore();

  // UI Store hooks for toasts
  const showSuccess = useUIStore(state => state.showSuccess);
  const showError = useUIStore(state => state.showError);
  const showInfo = useUIStore(state => state.showInfo);
  const showWarning = useUIStore(state => state.showWarning);

  // Estados locales
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, system, security
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCreatingTestUsers, setIsCreatingTestUsers] = useState(false);
  const [isCleaningTestUsers, setIsCleaningTestUsers] = useState(false);

  // Verificar permisos
  const hasAccess = isSuperAdmin(user);

  // Cargar datos al montar
  useEffect(() => {
    if (hasAccess) {
      loadUsers();
    }
  }, [hasAccess, loadUsers]);

  // Usuarios filtrados
  const filteredUsers = getFilteredUsers();

  // Control de acceso
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Acceso Restringido</h3>
            <p className="text-gray-600">No tienes permisos para acceder a la configuración del sistema.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Pestañas de navegación
  const tabs = [
    { id: 'overview', label: 'Resumen', icon: BarChart3 },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'system', label: 'Sistema', icon: Settings },
    { id: 'security', label: 'Seguridad', icon: Shield }
  ];

  // Manejar creación de usuario con sistema inteligente
  const handleCreateUser = async (userData) => {
    setActionLoading(true);
    try {
      logger.auth('Iniciando creación inteligente de usuario:', userData.email);
      
      // Importar servicio inteligente
      const { smartUserCreationService } = await import('../../services/smartUserCreationService');
      
      // Usar creación inteligente que maneja automáticamente la sincronización
      const result = await smartUserCreationService.createUserIntelligent(userData);
      
      logger.auth('Usuario creado con sistema inteligente:', result);
      
      // También usar el método tradicional como respaldo
      await createUser(userData);
      
      setShowCreateModal(false);
      
      // Mostrar mensaje de éxito con instrucciones
      showSuccess(
        `Usuario creado exitosamente\n\n` +
        `📧 Email: ${userData.email}\n` +
        `👤 Rol: ${userData.role}\n\n` +
        `Instrucciones:\n` +
        `1. El usuario debe registrarse en Firebase Auth con el email: ${userData.email}\n` +
        `2. Una vez registrado, será reconocido automáticamente con el rol asignado\n` +
        `3. No necesita pasos adicionales - la sincronización es automática`
      );
      
    } catch (error) {
      logger.error('Error creando usuario:', error);
      showError('Error al crear usuario: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Manejar edición de usuario
  const handleEditUser = async (userData) => {
    setActionLoading(true);
    try {
      console.log('🔄 Actualizando usuario:', {
        uid: selectedUser.uid,
        email: selectedUser.email,
        userData
      });
      
      // Verificar si el usuario tiene UID
      if (!selectedUser.uid) {
        console.warn('⚠️ Usuario sin UID, buscando por email:', selectedUser.email);
        
        // Buscar el perfil por email para obtener el UID
        const profile = await userSyncService.getUserProfileByEmail(selectedUser.email);
        
        if (profile && profile.uid) {
          console.log('✅ UID encontrado por email:', profile.uid);
          selectedUser.uid = profile.uid;
        } else {
          throw new Error('No se pudo encontrar el UID del usuario. Debe estar registrado en Firebase Auth primero.');
        }
      }
      
      // ✅ Actualizar usando el servicio de sincronización global
      // Esto notificará automáticamente a TODOS los módulos de la app
      await userSyncService.updateUserProfile(selectedUser.uid, userData);
      
      // También actualizar en el store local
      await updateUser(selectedUser.uid, userData);
      
      setShowEditModal(false);
      setSelectedUser(null);
      showSuccess('✅ Usuario editado y sincronizado en toda la aplicación');
      
      console.log('✅ Usuario actualizado y notificación global enviada');
    } catch (error) {
      logger.error('Error editando usuario:', error);
      showError('Error al editar usuario: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Manejar eliminación de usuario
  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Está seguro de que desea eliminar este usuario?')) return;

    setActionLoading(true);
    try {
      await deleteUser(userId);
      showSuccess('Usuario eliminado correctamente');
    } catch (error) {
      logger.error('Error eliminando usuario:', error);
      showError('Error al eliminar usuario: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Manejar cambio de estado de usuario
  const handleToggleUserStatus = async (userId) => {
    setActionLoading(true);
    try {
      await toggleUserStatus(userId);
      showSuccess('Estado del usuario actualizado correctamente');
    } catch (error) {
      logger.error('Error cambiando estado de usuario:', error);
      showError('Error al cambiar estado de usuario: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Crear usuarios de prueba
  const handleCreateTestUsers = async () => {
    setIsCreatingTestUsers(true);
    try {
      await userManagementService.createTestUsers();
      await loadUsers();
      showSuccess('Usuarios de prueba creados correctamente');
    } catch (error) {
      logger.error('Error creando usuarios de prueba:', error);
      showError('Error al crear usuarios de prueba: ' + error.message);
    } finally {
      setIsCreatingTestUsers(false);
    }
  };

  // Limpiar usuarios de prueba
  const handleCleanTestUsers = async () => {
    if (!confirm('¿Está seguro de que desea eliminar todos los usuarios de prueba?')) return;

    setIsCleaningTestUsers(true);
    try {
      await userManagementService.cleanTestUsers();
      await loadUsers();
      showSuccess('Usuarios de prueba eliminados correctamente');
    } catch (error) {
      logger.error('Error limpiando usuarios de prueba:', error);
      showError('Error al limpiar usuarios de prueba: ' + error.message);
    } finally {
      setIsCleaningTestUsers(false);
    }
  };

  // Componente de carga
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando configuración del sistema...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Principal */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
                <p className="text-gray-600">Panel de administración avanzada</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => loadUsers()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-8">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <IconComponent className="h-5 w-5 mr-2" />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Contenido principal */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <OverviewTab 
              stats={stats} 
              users={users} 
              onCreateTestUsers={handleCreateTestUsers}
              onCleanTestUsers={handleCleanTestUsers}
              isCreatingTestUsers={isCreatingTestUsers}
              isCleaningTestUsers={isCleaningTestUsers}
            />
          )}
          
          {activeTab === 'users' && (
            <UsersTab 
              users={filteredUsers}
              searchTerm={searchTerm}
              filterRole={filterRole}
              onSearchChange={setSearchTerm}
              onFilterChange={setFilterRole}
              onCreateUser={() => setShowCreateModal(true)}
              onEditUser={(user) => {
                setSelectedUser(user);
                setShowEditModal(true);
              }}
              onDeleteUser={handleDeleteUser}
              onToggleStatus={handleToggleUserStatus}
              actionLoading={actionLoading}
              roles={roles}
            />
          )}
          
          {activeTab === 'system' && <SystemTab />}
          {activeTab === 'security' && <SecurityTab />}
        </AnimatePresence>
      </div>

      {/* Modales */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateUser}
        isLoading={actionLoading}
        roles={roles}
      />

      <EditUserModal
        isOpen={showEditModal}
        user={selectedUser}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        onSave={handleEditUser}
        isLoading={actionLoading}
        roles={roles}
      />
    </div>
  );
};

// Componente Tab de Resumen
const OverviewTab = ({ 
  stats, 
  users, 
  onCreateTestUsers, 
  onCleanTestUsers, 
  isCreatingTestUsers, 
  isCleaningTestUsers 
}) => {
  const statsCards = [
    {
      title: 'Total Usuarios',
      value: stats.totalUsers || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Usuarios Activos',
      value: stats.activeUsers || 0,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'Administradores',
      value: stats.adminUsers || 0,
      icon: Crown,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'Teleoperadoras',
      value: stats.teleoperadoraUsers || 0,
      icon: Shield,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    }
  ];

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                  <IconComponent className={`h-6 w-6 ${stat.textColor}`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Zap className="h-6 w-6 mr-2 text-yellow-500" />
          Acciones Rápidas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreateTestUsers}
            disabled={isCreatingTestUsers}
            className="flex items-center justify-center p-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg shadow-green-500/25"
          >
            {isCreatingTestUsers ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
            ) : (
              <UserPlus className="h-5 w-5 mr-3" />
            )}
            {isCreatingTestUsers ? 'Creando...' : 'Crear Usuarios de Prueba'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCleanTestUsers}
            disabled={isCleaningTestUsers}
            className="flex items-center justify-center p-6 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-red-500/25"
          >
            {isCleaningTestUsers ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
            ) : (
              <Trash2 className="h-5 w-5 mr-3" />
            )}
            {isCleaningTestUsers ? 'Limpiando...' : 'Limpiar Usuarios de Prueba'}
          </motion.button>
        </div>
      </div>

      {/* Información del sistema */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Activity className="h-6 w-6 mr-2 text-blue-500" />
          Estado del Sistema
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-700">Sistema Operativo</p>
            <p className="text-xs text-green-600">Todos los servicios funcionando</p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <Database className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-700">Base de Datos</p>
            <p className="text-xs text-blue-600">Conexión estable</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <Globe className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-700">Conectividad</p>
            <p className="text-xs text-purple-600">Óptima</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const UsersTab = ({ 
  users, 
  searchTerm, 
  filterRole, 
  onSearchChange, 
  onFilterChange, 
  onCreateUser, 
  onEditUser, 
  onDeleteUser, 
  onToggleStatus, 
  actionLoading, 
  roles 
}) => {
  return (
    <motion.div
      key="users"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header con búsqueda y filtros */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => onFilterChange(e.target.value)}
                className="pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">Todos los roles</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreateUser}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-600/25"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Usuario
          </motion.button>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="divide-y divide-gray-100">
          {users.map((user, index) => (
            <motion.div
              key={user.uid}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {user.displayName?.charAt(0) || user.email?.charAt(0)}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.displayName || 'Sin nombre'}</h3>
                    <p className="text-gray-600 text-sm">{user.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {user.role === 'super_admin' ? 'Super Admin' :
                         user.role === 'admin' ? 'Administrador' :
                         'Teleoperadora'}
                      </span>
                      
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onToggleStatus(user.uid)}
                    disabled={actionLoading}
                    className={`p-2 rounded-lg transition-colors ${
                      user.active 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    {user.active ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onEditUser(user)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onDeleteUser(user.uid)}
                    disabled={actionLoading}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
          
          {users.length === 0 && (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios</h3>
              <p className="text-gray-600">Crea el primer usuario para comenzar.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const SystemTab = () => {
  return (
    <motion.div
      key="system"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-lg p-8"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Configuración del Sistema</h3>
      <p className="text-gray-600">Panel de configuración del sistema próximamente disponible.</p>
    </motion.div>
  );
};

const SecurityTab = () => {
  return (
    <motion.div
      key="security"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-lg p-8"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Configuración de Seguridad</h3>
      <p className="text-gray-600">Panel de seguridad próximamente disponible.</p>
    </motion.div>
  );
};

export default SuperAdminDashboard;