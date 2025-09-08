import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Upload, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  UserCheck, 
  UserX, 
  Search,
  Settings,
  FileSpreadsheet,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../AuthContext';
import useBeneficiaryStore from '../stores/useBeneficiaryStore';
import { useAppStore } from '../stores';
import { isAdminUser } from '../utils/adminConfig';
import { initializeBeneficiaryStore } from '../utils/beneficiaryStoreInit';
import { debugBeneficiaryMatch, auditBeneficiaryAssignments } from '../utils/debugBeneficiaryMatch';
import ExcelUpload from '../components/beneficiaries/ExcelUpload';
import BeneficiaryList from '../components/beneficiaries/BeneficiaryList';
import UnassignedBeneficiaries from '../components/beneficiaries/UnassignedBeneficiaries';

/**
 * Componente principal del módulo Beneficiarios Base
 * Centraliza la gestión de todos los beneficiarios y su validación con asignaciones
 */
const BeneficiariosBase = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Store de beneficiarios
  const {
    beneficiaries,
    stats,
    isLoading,
    isUploading,
    uploadProgress,
    searchTerm,
    setSearchTerm,
    loadBeneficiaries,
    forceReload,
    uploadBeneficiaries,
    updateBeneficiaryData,
    deleteBeneficiaryData,
    findUnassignedBeneficiaries,
    validateAssignmentConsistency,
    getFilteredBeneficiaries
  } = useBeneficiaryStore();
  
  // Store de la app (para obtener asignaciones)
  const { operatorAssignments, getAllAssignments } = useAppStore();

  // Cargar datos al montar el componente
  useEffect(() => {
    if (user?.uid) {
      initializeBeneficiaryStore(user.uid);
    }
  }, [user?.uid]);

  // Actualizar estadísticas cuando cambien las asignaciones
  useEffect(() => {
    if (beneficiaries.length > 0) {
      const allAssignments = getAllAssignments();
      console.log('🔄 Actualizando estadísticas con asignaciones:', allAssignments.length);
      
      // Buscar beneficiarios no asignados
      const unassigned = findUnassignedBeneficiaries(allAssignments);
      console.log('👥 Beneficiarios sin asignar encontrados:', unassigned.length);
    }
  }, [operatorAssignments, beneficiaries, findUnassignedBeneficiaries, getAllAssignments]);

  // Mostrar notificaciones
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Manejar upload de Excel
  const handleUploadComplete = async (data, metadata) => {
    try {
      const result = await uploadBeneficiaries(data, user.uid);
      
      if (result.success) {
        showNotification(
          `✅ Se cargaron ${result.successful} beneficiarios correctamente. ${result.errors > 0 ? `${result.errors} errores encontrados.` : ''}`,
          'success'
        );
        setShowUploadModal(false);
      } else {
        showNotification('❌ Error al cargar beneficiarios', 'error');
      }
    } catch (error) {
      console.error('Error en upload:', error);
      showNotification(`❌ Error: ${error.message}`, 'error');
    }
  };

  const handleUploadError = (error) => {
    showNotification(`❌ ${error}`, 'error');
  };

  // Manejar recarga manual
  const handleRefresh = async () => {
    if (!user) return;
    
    try {
      showNotification('🔄 Recargando datos...', 'info');
      await forceReload(user.uid);
      showNotification('✅ Datos actualizados correctamente', 'success');
    } catch (error) {
      console.error('Error al recargar:', error);
      showNotification('❌ Error al recargar datos', 'error');
    }
  };

  // Manejar sincronización con asignaciones
  const handleSyncWithAssignments = () => {
    try {
      showNotification('🔄 Sincronizando con asignaciones...', 'info');
      
      const allAssignments = getAllAssignments();
      console.log('🔍 Asignaciones obtenidas:', allAssignments);
      
      if (allAssignments.length === 0) {
        showNotification('⚠️ No se encontraron asignaciones para sincronizar', 'warning');
        return;
      }
      
      // Forzar recálculo de beneficiarios sin asignar
      const unassigned = findUnassignedBeneficiaries(allAssignments);
      
      showNotification(
        `✅ Sincronización completada. ${allAssignments.length} asignaciones procesadas, ${unassigned.length} beneficiarios sin asignar`,
        'success'
      );
      
    } catch (error) {
      console.error('Error en sincronización:', error);
      showNotification('❌ Error al sincronizar con asignaciones', 'error');
    }
  };

  // Función de debugging para casos específicos
  const handleDebugSpecific = () => {
    const beneficiaryName = prompt('Ingresa el nombre del beneficiario a debuggear (ej: "GILDA FRIANT"):');
    if (!beneficiaryName) return;
    
    const allAssignments = getAllAssignments();
    const result = debugBeneficiaryMatch(beneficiaryName, beneficiaries, allAssignments);
    
    showNotification(
      result.found 
        ? `✅ ${beneficiaryName} SÍ tiene asignación` 
        : `❌ ${beneficiaryName} NO tiene asignación`,
      result.found ? 'success' : 'error'
    );
  };

  // Función para auditoría completa
  const handleFullAudit = () => {
    const allAssignments = getAllAssignments();
    const discrepancies = auditBeneficiaryAssignments(beneficiaries, allAssignments);
    
    showNotification(
      `🔍 Auditoría completa: ${discrepancies.length} beneficiarios sin asignación detectados. Ver consola para detalles.`,
      'info'
    );
  };

  // Manejar edición de beneficiario
  const handleEditBeneficiary = async (beneficiary) => {
    // TODO: Implementar modal de edición
    console.log('Editar beneficiario:', beneficiary);
  };

  // Manejar eliminación de beneficiario
  const handleDeleteBeneficiary = async (beneficiary) => {
    if (window.confirm(`¿Estás seguro de eliminar a ${beneficiary.nombre}?`)) {
      try {
        const success = await deleteBeneficiaryData(beneficiary.id);
        if (success) {
          showNotification(`✅ ${beneficiary.nombre} eliminado correctamente`, 'success');
        } else {
          showNotification('❌ Error al eliminar beneficiario', 'error');
        }
      } catch (error) {
        showNotification(`❌ Error: ${error.message}`, 'error');
      }
    }
  };

  // Manejar asignación de teleoperadora
  const handleAssignOperator = (beneficiary) => {
    // TODO: Integrar con módulo de asignaciones
    console.log('Asignar teleoperadora a:', beneficiary);
    showNotification(`TODO: Implementar asignación para ${beneficiary.nombre}`, 'info');
  };

  // Tabs disponibles
  const tabs = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: Database,
      description: 'Resumen general y estadísticas'
    },
    {
      id: 'upload',
      name: 'Cargar Excel',
      icon: Upload,
      description: 'Subir nuevos beneficiarios desde Excel'
    },
    {
      id: 'list',
      name: 'Lista completa',
      icon: Users,
      description: 'Ver todos los beneficiarios'
    },
    {
      id: 'validation',
      name: 'Validación',
      icon: CheckCircle,
      description: 'Verificar consistencia con asignaciones'
    }
  ];

  // Verificar permisos de administrador
  const isAdmin = isAdminUser(user);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <UserX className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Acceso restringido
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Este módulo es solo para administradores
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Beneficiarios Base
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestión centralizada de beneficiarios y validación con asignaciones
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Refrescar datos"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Notificaciones */}
      {notification && (
        <motion.div
          className={`p-4 rounded-lg border ${
            notification.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
              : notification.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
              : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
          }`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          {notification.message}
        </motion.div>
      )}

      {/* Estadísticas rápidas */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-600 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-300">Total Beneficiarios</p>
              <p className="text-xl font-semibold text-white">
                {stats.total.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-600 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-300">Con Teléfono</p>
              <p className="text-xl font-semibold text-white">
                {stats.withPhones.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-600 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-300">Sin Teléfono</p>
              <p className="text-xl font-semibold text-white">
                {stats.withoutPhones.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-600 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserX className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-300">Sin Asignar</p>
              <p className="text-xl font-semibold text-white">
                {stats.unassigned.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Navegación por tabs */}
      <motion.div 
        className="bg-slate-800 rounded-lg shadow-sm border border-slate-600"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="border-b border-slate-600">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-400 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenido de tabs */}
        <div className="p-6">
          {activeTab === 'dashboard' && (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Dashboard de Beneficiarios
              </h3>
              
              {/* Beneficiarios sin asignar */}
              <UnassignedBeneficiaries
                beneficiaries={beneficiaries}
                assignments={Object.values(operatorAssignments).flat()}
                onAssignOperator={handleAssignOperator}
              />
              
              {/* Gráficos y estadísticas adicionales */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Distribución por Estado
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Completos</span>
                      <span className="text-sm font-medium">{stats.total - stats.incomplete}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Incompletos</span>
                      <span className="text-sm font-medium">{stats.incomplete}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Sin asignar</span>
                      <span className="text-sm font-medium">{stats.unassigned}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Acciones Rápidas
                  </h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      📁 Cargar nuevo Excel
                    </button>
                    
                    <button
                      onClick={handleSyncWithAssignments}
                      className="w-full text-left px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    >
                      🔄 Sincronizar con Asignaciones
                    </button>
                    
                    <button
                      onClick={handleDebugSpecific}
                      className="w-full text-left px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                    >
                      🔍 Debug Beneficiario Específico
                    </button>
                    
                    <button
                      onClick={handleFullAudit}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      📋 Auditoría Completa
                    </button>
                    <button
                      onClick={() => setActiveTab('validation')}
                      className="w-full text-left px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    >
                      🔍 Validar consistencia
                    </button>
                    <button
                      onClick={() => setActiveTab('list')}
                      className="w-full text-left px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    >
                      📋 Ver lista completa
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'upload' && (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Cargar Beneficiarios desde Excel
              </h3>
              
              <ExcelUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                isUploading={isUploading}
              />
              
              {isUploading && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-blue-800 dark:text-blue-200">
                      Procesando... {uploadProgress}%
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'list' && (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Lista de Beneficiarios
                </h3>
                
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar beneficiarios..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>
              
              <BeneficiaryList
                beneficiaries={getFilteredBeneficiaries()}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onEdit={handleEditBeneficiary}
                onDelete={handleDeleteBeneficiary}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {activeTab === 'validation' && (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Validación de Consistencia
              </h3>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Validación de Datos
                    </h4>
                    <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                      Esta sección permite verificar la consistencia entre la base de beneficiarios 
                      y las asignaciones del módulo de teleoperadoras.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Aquí irían los resultados de validación */}
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                🔨 Funcionalidad de validación en desarrollo
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Hacer funciones de debugging disponibles globalmente para testing
if (typeof window !== 'undefined') {
  window.debugBeneficiarySystem = {
    debugSpecific: (name) => {
      const store = useBeneficiaryStore.getState();
      const appStore = useAppStore.getState();
      const assignments = appStore.getAllAssignments();
      return debugBeneficiaryMatch(name, store.beneficiaries, assignments);
    },
    auditAll: () => {
      const store = useBeneficiaryStore.getState();
      const appStore = useAppStore.getState();
      const assignments = appStore.getAllAssignments();
      return auditBeneficiaryAssignments(store.beneficiaries, assignments);
    },
    getStats: () => {
      const store = useBeneficiaryStore.getState();
      const appStore = useAppStore.getState();
      return {
        beneficiaries: store.beneficiaries.length,
        assignments: appStore.getAllAssignments().length,
        stats: store.stats
      };
    }
  };
}

export default BeneficiariosBase;
