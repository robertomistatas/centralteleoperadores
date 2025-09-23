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
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';

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
  const [isCreatingTestUsers, setIsCreatingTestUsers] = useState(false);
  const [isCleaningTestUsers, setIsCleaningTestUsers] = useState(false);

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
Conexión exitosa: ${diagnosis.success}
Autenticado: ${diagnosis.authenticated}
Email: ${diagnosis.userEmail}
Super Admin: ${diagnosis.isSuperAdmin}
Documentos encontrados: ${diagnosis.documentsCount || 0}

${diagnosis.documents?.length > 0 ? 
  'USUARIOS ENCONTRADOS:\n' + 
  diagnosis.documents.map(doc => `• ${doc.email} (${doc.role})`).join('\n')
  : 'No se encontraron usuarios en la colección'
}

${diagnosis.error ? `ERROR: ${diagnosis.error}` : ''}`;
      
      alert(message);
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      alert('Error ejecutando diagnóstico: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Función para crear usuarios de prueba
  const handleCreateTestUsers = async () => {
    console.log('🧪 Iniciando creación de usuarios de prueba...');
    setIsCreatingTestUsers(true);
    try {
      const createdUsers = await userManagementService.createTestUsers();
      
      // Refrescar la lista de usuarios
      await loadUsers();
      
      console.log('✅ Usuarios de prueba creados exitosamente:', createdUsers);
      alert(`✅ Se crearon ${createdUsers.length} usuarios de prueba correctamente`);
      
    } catch (error) {
      console.error('❌ Error creando usuarios de prueba:', error);
      alert('❌ Error creando usuarios de prueba: ' + error.message);
    } finally {
      setIsCreatingTestUsers(false);
    }
  };

  // Función para limpiar usuarios de prueba
  const handleCleanTestUsers = async () => {
    if (!window.confirm('¿Estás seguro de eliminar todos los usuarios de prueba?')) return;
    
    console.log('🧹 Iniciando limpieza de usuarios de prueba...');
    setIsCleaningTestUsers(true);
    try {
      const deletedCount = await userManagementService.cleanTestUsers();
      
      // Refrescar la lista de usuarios
      await loadUsers();
      
      console.log('✅ Usuarios de prueba eliminados:', deletedCount);
      alert(`✅ Se eliminaron ${deletedCount} usuarios de prueba`);
      
    } catch (error) {
      console.error('❌ Error limpiando usuarios de prueba:', error);
      alert('❌ Error limpiando usuarios de prueba: ' + error.message);
    } finally {
      setIsCleaningTestUsers(false);
    }
  };

  // Si no tiene acceso, mostrar mensaje
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">Este módulo es solo para super administradores.</p>
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
            Configuración del Sistema
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
            disabled={actionLoading}
          >
            <AlertTriangle className="w-4 h-4" />
            Diagnóstico
          </motion.button>

          <motion.button
            onClick={handleCreateTestUsers}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Crear usuarios de prueba para resolver la colección vacía"
            disabled={isCreatingTestUsers || actionLoading}
          >
            <UserPlus className="w-4 h-4" />
            {isCreatingTestUsers ? 'Creando...' : 'Crear Prueba'}
          </motion.button>

          <motion.button
            onClick={handleCleanTestUsers}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Eliminar todos los usuarios de prueba"
            disabled={isCleaningTestUsers || actionLoading}
          >
            <Trash2 className="w-4 h-4" />
            {isCleaningTestUsers ? 'Limpiando...' : 'Limpiar Prueba'}
          </motion.button>

          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </motion.button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Usuarios Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Administradores</p>
              <p className="text-2xl font-bold text-purple-600">{stats.usersByRole?.admin || 0}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Teleoperadoras</p>
              <p className="text-2xl font-bold text-orange-600">{stats.usersByRole?.teleoperadora || 0}</p>
            </div>
            <UserPlus className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Administrador</option>
              <option value="auditor">Auditor</option>
              <option value="teleoperadora">Teleoperadora</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Usuarios ({filteredUsers.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Cargando usuarios...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios</h3>
            <p className="text-gray-600 text-center mb-4">
              No se encontraron usuarios o no tienes permisos para verlos.
            </p>
            <button
              onClick={handleDiagnosis}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              Ejecutar Diagnóstico
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.map((userItem) => (
              <div key={userItem.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {userItem.displayName || userItem.email}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{userItem.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          userItem.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                          userItem.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                          userItem.role === 'auditor' ? 'bg-green-100 text-green-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {userItem.role}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          userItem.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {userItem.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(userItem);
                        setShowEditModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleToggleStatus(userItem.id)}
                      className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      disabled={actionLoading}
                    >
                      {userItem.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteUser(userItem.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      disabled={actionLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para crear usuario */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <CreateUserModal 
                roles={roles}
                onSave={handleCreateUser}
                onClose={() => setShowCreateModal(false)}
                isLoading={actionLoading}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal para editar usuario */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <EditUserModal 
                user={selectedUser}
                onSubmit={handleEditUser}
                onCancel={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                isLoading={actionLoading}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SuperAdminDashboard;