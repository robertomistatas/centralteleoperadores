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
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import useUserManagementStore from '../../stores/useUserManagementStore';
import { userManagementService } from '../../services/userManagementService';
import UserCard from './UserCard';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import RoleCard from './RoleCard';
import StatsCard from './StatsCard';

/**
 * Panel de configuración de usuarios y roles
 * Solo accesible por el super usuario (roberto@mistatas.com)
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

  // Estados locales
  const [activeTab, setActiveTab] = useState('users'); // users, roles, settings
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Verificar permisos
  const hasAccess = isSuperAdmin(user);

  // Cargar datos al montar
  useEffect(() => {
    console.log('🎯 SuperAdminDashboard: Efecto de carga ejecutándose');
    console.log('🎯 HasAccess:', hasAccess);
    console.log('🎯 User:', user?.email);
    
    if (hasAccess) {
      console.log('🎯 Iniciando carga de usuarios...');
      loadUsers();
    } else {
      console.log('❌ Sin acceso para cargar usuarios');
    }
  }, [hasAccess, loadUsers]);

  // Debug: Log usuarios en el estado
  useEffect(() => {
    console.log('👥 Usuarios en el estado:', users);
    console.log('📊 Stats:', stats);
    console.log('🔄 Loading:', isLoading);
  }, [users, stats, isLoading]);

  // Usuarios filtrados
  const filteredUsers = getFilteredUsers();

  // Manejar creación de usuario
  const handleCreateUser = async (userData) => {
    setActionLoading(true);
    try {
      await createUser(userData);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creando usuario:', error);
      alert('Error al crear usuario: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Manejar edición de usuario
  const handleEditUser = async (userData) => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      await updateUser(selectedUser.id, userData);
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error editando usuario:', error);
      alert('Error al editar usuario: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Manejar eliminación de usuario
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    setActionLoading(true);
    try {
      await deleteUser(userId);
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      alert('Error al eliminar usuario: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Manejar cambio de estado
  const handleToggleStatus = async (userId) => {
    setActionLoading(true);
    try {
      await toggleUserStatus(userId);
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('Error al cambiar estado: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Función para forzar recarga
  const handleForceReload = async () => {
    console.log('🔄 Forzando recarga de usuarios...');
    setActionLoading(true);
    try {
      await loadUsers();
      console.log('✅ Recarga completada');
    } catch (error) {
      console.error('❌ Error en recarga:', error);
      alert('Error al recargar usuarios: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Función de diagnóstico
  const handleDiagnosis = async () => {
    console.log('🩺 Ejecutando diagnóstico...');
    setActionLoading(true);
    try {
      const diagnosis = await userManagementService.diagnoseUserCollection();
      console.log('🩺 Resultado del diagnóstico:', diagnosis);
      
      // Mostrar resultado en un alert
      const message = `DIAGNÓSTICO DE USUARIOS
======================
✅ Conexión exitosa: ${diagnosis.success}
👤 Autenticado: ${diagnosis.authenticated}
📧 Email: ${diagnosis.userEmail}
👑 Super Admin: ${diagnosis.isSuperAdmin}
📄 Documentos encontrados: ${diagnosis.documentsCount || 0}

${diagnosis.documents?.length > 0 ? 
  'USUARIOS ENCONTRADOS:\n' + 
  diagnosis.documents.map(doc => `• ${doc.email} (${doc.role})`).join('\n')
  : 'No se encontraron usuarios en la colección'
}

${diagnosis.error ? `❌ ERROR: ${diagnosis.error}` : ''}`;
      
      alert(message);
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      alert('Error ejecutando diagnóstico: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };
📧 Email: ${result.userEmail || 'N/A'}
👑 Super Admin: ${result.isSuperAdmin ? 'Sí' : 'No'}
📄 Documentos encontrados: ${result.documentsCount || 0}

${result.error ? `❌ Error: ${result.error}` : '✅ Sin errores'}

Ver consola para más detalles.`);
    } catch (error) {
      console.error('Error en diagnóstico:', error);
      alert('Error ejecutando diagnóstico: ' + error.message);
    }
  };

  // Si no tiene acceso, mostrar mensaje
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
            Acceso Denegado
          </h3>
          <p className="text-red-600 dark:text-red-300">
            Solo el super usuario puede acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Crown className="w-8 h-8 text-purple-600" />
            Panel de Super Administrador
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Gestión de usuarios, roles y configuración del sistema
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleForceReload}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isLoading || actionLoading}
            title="Recargar usuarios desde Firebase"
          >
            <Upload className="w-4 h-4" />
            {isLoading ? 'Cargando...' : 'Recargar'}
          </motion.button>

          <motion.button
            onClick={handleDiagnosis}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Ejecutar diagnóstico de la base de datos"
          >
            <AlertTriangle className="w-4 h-4" />
            Diagnóstico
          </motion.button>

          <motion.button
            onClick={exportUsers}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="w-4 h-4" />
            Exportar
          </motion.button>

          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Usuario
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'users', label: 'Usuarios', icon: Users },
            { id: 'roles', label: 'Roles', icon: Shield },
            { id: 'settings', label: 'Configuración', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
                whileHover={{ y: -1 }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Contenido de Users */}
      {activeTab === 'users' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard
              title="Total Usuarios"
              value={stats.totalUsers}
              icon={Users}
              color="purple"
            />
            <StatsCard
              title="Usuarios Activos"
              value={stats.activeUsers}
              icon={CheckCircle}
              color="green"
            />
            <StatsCard
              title="Administradores"
              value={stats.usersByRole.admin || 0}
              icon={Shield}
              color="blue"
            />
            <StatsCard
              title="Teleoperadoras"
              value={stats.usersByRole.teleoperadora || 0}
              icon={Users}
              color="orange"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Búsqueda */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            {/* Filtro por rol */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Todos los roles</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de usuarios */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                <span className="text-gray-600">Cargando usuarios...</span>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No se encontraron usuarios
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || filterRole !== 'all' 
                  ? 'Intenta cambiar los filtros de búsqueda'
                  : 'Comienza creando el primer usuario'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredUsers.map((userData, index) => (
                  <motion.div
                    key={userData.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <UserCard
                      user={userData}
                      roles={roles}
                      onEdit={() => {
                        setSelectedUser(userData);
                        setShowEditModal(true);
                      }}
                      onDelete={() => handleDeleteUser(userData.id)}
                      onToggleStatus={() => handleToggleStatus(userData.id)}
                      isLoading={actionLoading}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* Contenido de Roles */}
      {activeTab === 'roles' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((role, index) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <RoleCard
                  role={role}
                  userCount={stats.usersByRole[role.id] || 0}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Contenido de Configuración */}
      {activeTab === 'settings' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Configuración del Sistema
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Funcionalidades de configuración próximamente...
            </p>
          </div>
        </motion.div>
      )}

      {/* Modales */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateUserModal
            roles={roles}
            onSave={handleCreateUser}
            onClose={() => setShowCreateModal(false)}
            isLoading={actionLoading}
          />
        )}

        {showEditModal && selectedUser && (
          <EditUserModal
            user={selectedUser}
            roles={roles}
            onSave={handleEditUser}
            onClose={() => {
              setShowEditModal(false);
              setSelectedUser(null);
            }}
            isLoading={actionLoading}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SuperAdminDashboard;
