import React from 'react';
import { motion } from 'framer-motion';
import { 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Crown, 
  Shield, 
  Users, 
  Clock,
  Mail,
  Calendar
} from 'lucide-react';

/**
 * Tarjeta de usuario para el panel de administración
 */
const UserCard = ({ 
  user, 
  roles, 
  onEdit, 
  onDelete, 
  onToggleStatus, 
  isLoading 
}) => {
  // Obtener información del rol
  const role = roles.find(r => r.id === user.role);
  
  // Configuración de íconos por rol
  const roleIcons = {
    super_admin: Crown,
    admin: Shield,
    auditor: Users,
    teleoperadora: Users
  };

  const RoleIcon = roleIcons[user.role] || Users;

  // Configuración de colores por rol
  const roleColors = {
    super_admin: 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
    admin: 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    auditor: 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    teleoperadora: 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200'
  };

  const roleColorClass = roleColors[user.role] || roleColors.teleoperadora;

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return 'Nunca';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <motion.div
      className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-4 hover:shadow-lg transition-all duration-200 ${
        user.isActive !== false 
          ? 'border-gray-200 dark:border-gray-700' 
          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
      }`}
      whileHover={{ scale: 1.02 }}
      layout
    >
      {/* Header con avatar y estado */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${roleColorClass}`}>
            <RoleIcon className="w-6 h-6" />
          </div>
          
          {/* Info básica */}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {user.displayName || 'Sin nombre'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>
        </div>

        {/* Indicador de estado */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          user.isActive !== false
            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
        }`}>
          {user.isActive !== false ? 'Activo' : 'Inactivo'}
        </div>
      </div>

      {/* Información del rol */}
      <div className={`px-3 py-2 rounded-lg border ${roleColorClass} mb-3`}>
        <div className="flex items-center gap-2">
          <RoleIcon className="w-4 h-4" />
          <span className="text-sm font-medium">
            {role?.name || 'Rol no definido'}
          </span>
        </div>
        {role?.description && (
          <p className="text-xs mt-1 opacity-75">
            {role.description}
          </p>
        )}
      </div>

      {/* Información adicional */}
      <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          <span>Creado: {formatDate(user.createdAt)}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>Último login: {formatDate(user.lastLogin)}</span>
        </div>

        {user.role === 'super_admin' && (
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Crown className="w-3 h-3" />
            <span className="font-medium">Super Usuario</span>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1">
          {/* Editar */}
          <motion.button
            onClick={onEdit}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Editar usuario"
          >
            <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </motion.button>

          {/* Cambiar estado */}
          <motion.button
            onClick={onToggleStatus}
            disabled={isLoading || user.role === 'super_admin'}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={user.isActive !== false ? 'Desactivar' : 'Activar'}
          >
            {user.isActive !== false ? (
              <EyeOff className="w-4 h-4 text-yellow-600" />
            ) : (
              <Eye className="w-4 h-4 text-green-600" />
            )}
          </motion.button>

          {/* Eliminar */}
          {user.role !== 'super_admin' && (
            <motion.button
              onClick={onDelete}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Eliminar usuario"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </motion.button>
          )}
        </div>

        {/* Nivel de acceso */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Nivel {role?.level || 0}
        </div>
      </div>

      {/* Overlay de carga */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      )}
    </motion.div>
  );
};

export default UserCard;
