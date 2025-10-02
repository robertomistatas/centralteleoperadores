import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Eye,
  UserCheck
} from 'lucide-react';

/**
 * Panel de monitoreo para usuarios pendientes de registro
 */
const PendingUsersPanel = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Cargar usuarios pendientes
  const loadPendingUsers = async () => {
    setLoading(true);
    try {
      const { smartUserCreationService } = await import('../../services/smartUserCreationService');
      const users = await smartUserCreationService.getPendingUsers();
      
      // Filtrar solo los que están esperando registro
      const waitingUsers = users.filter(user => 
        user.status === 'waiting_auth_registration' || 
        user.status === 'pending'
      );
      
      setPendingUsers(waitingUsers);
      setLastUpdate(new Date());
      console.log('📋 Usuarios pendientes cargados:', waitingUsers.length);
      
    } catch (error) {
      console.error('Error cargando usuarios pendientes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar al montar y configurar refresco automático
  useEffect(() => {
    loadPendingUsers();
    
    // Recargar cada 30 segundos
    const interval = setInterval(loadPendingUsers, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusInfo = (user) => {
    const createdAt = user.createdAt?.toDate?.() || new Date(user.createdAt);
    const hoursAgo = Math.floor((new Date() - createdAt) / (1000 * 60 * 60));
    
    return {
      timeAgo: hoursAgo < 1 ? 'Hace menos de 1 hora' : `Hace ${hoursAgo} horas`,
      isRecent: hoursAgo < 24,
      isOld: hoursAgo > 72
    };
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-blue-500';
      case 'auditor': return 'bg-green-500';
      case 'teleoperadora': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-600">Cargando usuarios pendientes...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Usuarios Pendientes de Registro
              </h3>
              <p className="text-sm text-gray-600">
                Usuarios creados esperando registro en Firebase Auth
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {lastUpdate && `Actualizado: ${lastUpdate.toLocaleTimeString()}`}
            </span>
            <button
              onClick={loadPendingUsers}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8">
            <UserCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              ¡Todos los usuarios están registrados!
            </h4>
            <p className="text-gray-600">
              No hay usuarios pendientes de registro en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span className="font-medium text-orange-900">Total</span>
                </div>
                <div className="text-2xl font-bold text-orange-600 mt-1">
                  {pendingUsers.length}
                </div>
                <div className="text-sm text-orange-700">usuarios pendientes</div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Recientes</span>
                </div>
                <div className="text-2xl font-bold text-yellow-600 mt-1">
                  {pendingUsers.filter(user => getStatusInfo(user).isRecent).length}
                </div>
                <div className="text-sm text-yellow-700">últimas 24h</div>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-900">Antiguos</span>
                </div>
                <div className="text-2xl font-bold text-red-600 mt-1">
                  {pendingUsers.filter(user => getStatusInfo(user).isOld).length}
                </div>
                <div className="text-sm text-red-700">+72 horas</div>
              </div>
            </div>

            {/* Lista de usuarios */}
            <div className="space-y-3">
              {pendingUsers.map((user) => {
                const statusInfo = getStatusInfo(user);
                
                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`border rounded-lg p-4 ${
                      statusInfo.isOld ? 'border-red-200 bg-red-50' :
                      statusInfo.isRecent ? 'border-green-200 bg-green-50' :
                      'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${getRoleColor(user.role)}`}>
                            {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {user.displayName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {user.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)} text-white`}>
                              {user.role}
                            </span>
                            <span className="text-xs text-gray-500">
                              {statusInfo.timeAgo}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-full ${
                          statusInfo.isOld ? 'bg-red-100' :
                          statusInfo.isRecent ? 'bg-green-100' :
                          'bg-yellow-100'
                        }`}>
                          <Clock className={`w-4 h-4 ${
                            statusInfo.isOld ? 'text-red-600' :
                            statusInfo.isRecent ? 'text-green-600' :
                            'text-yellow-600'
                          }`} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Instrucciones */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                📋 Instrucciones para los usuarios:
              </h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Ir a la página de login de la aplicación</li>
                <li>2. Hacer clic en "Registrarse" o "Crear cuenta"</li>
                <li>3. Usar exactamente el mismo email mostrado arriba</li>
                <li>4. Completar el registro en Firebase Auth</li>
                <li>5. Una vez registrado, será reconocido automáticamente con su rol</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PendingUsersPanel;