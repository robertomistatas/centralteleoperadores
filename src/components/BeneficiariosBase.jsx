import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshCw,
  Bug,
  Download,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../AuthContext';
import useBeneficiaryStore from '../stores/useBeneficiaryStore';
import { useAppStore } from '../stores';
import { isAdminUser } from '../utils/adminConfig';
import { initializeBeneficiaryStore } from '../utils/beneficiaryStoreInit';
import { debugBeneficiaryMatch, auditBeneficiaryAssignments } from '../utils/debugBeneficiaryMatch';
import logger from '../utils/logger';
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
  const [unassignedBeneficiaries, setUnassignedBeneficiaries] = useState([]);

  const showDebugActions = useMemo(
    () => import.meta.env.DEV || isAdminUser(user),
    [user]
  );
  
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

  // Inicializar store y cargar datos
  useEffect(() => {
    const initializeStore = async () => {
      if (user?.uid) {
        try {
          await initializeBeneficiaryStore(user.uid);
        } catch (error) {
          logger.error('[BeneficiariosBase] Error inicializando store', error);
          showNotification('❌ Error cargando beneficiarios', 'error');
        }
      }
    };
    
    initializeStore();
  }, [user]);

  // Mostrar estadísticas iniciales (solo en dev)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (beneficiaries.length > 0 && !isLoading) {
      logger.debug('[BeneficiariosBase] Beneficiarios Base cargados', {
        total: beneficiaries.length,
        stats: stats
      });
    }
  }, [beneficiaries, stats, isLoading]);

  // Debug: Verificar permisos de usuario (solo en dev)
  useEffect(() => {
    if (import.meta.env.DEV) {
      logger.debug('[BeneficiariosBase] Usuario actual', {
        email: user?.email,
        isAdmin: isAdminUser(user),
        user: user
      });
    }
  }, [user]);

  // Fuente única: calcular sin asignar solo a través del store y cachear en estado local
  useEffect(() => {
    if (beneficiaries.length === 0) {
      setUnassignedBeneficiaries([]);
      return;
    }

    const allAssignments = getAllAssignments();
    const unassigned = findUnassignedBeneficiaries(allAssignments);
    setUnassignedBeneficiaries(unassigned);
    if (import.meta.env.DEV) {
      logger.debug('[BeneficiariosBase] Unassigned actualizados', { count: unassigned.length });
    }
  }, [operatorAssignments, beneficiaries, findUnassignedBeneficiaries, getAllAssignments]);

  // Mostrar notificaciones
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // CORRECCIÓN: Sincronización manual usando getAllAssignments()
  const handleSyncWithAssignments = async () => {
    try {
      if (import.meta.env.DEV) logger.debug('[BeneficiariosBase] Sincronizando con módulo de asignaciones');
      
      const allAssignments = getAllAssignments();
      if (import.meta.env.DEV) logger.debug('[BeneficiariosBase] Asignaciones obtenidas', { count: allAssignments.length });
      
      if (allAssignments.length === 0) {
        showNotification('⚠️ No se encontraron asignaciones para sincronizar', 'warning');
        return;
      }
      
      // Forzar recálculo de beneficiarios sin asignar usando el store
      const unassigned = findUnassignedBeneficiaries(allAssignments);
      setUnassignedBeneficiaries(unassigned);
      
      showNotification(
        `✅ Sincronización completada. ${allAssignments.length} asignaciones procesadas, ${unassigned.length} beneficiarios sin asignar`,
        'success'
      );
      
    } catch (error) {
      logger.error('[BeneficiariosBase] Error en sincronización', error);
      showNotification('❌ Error al sincronizar con asignaciones', 'error');
    }
  };

  // Función de debugging para casos específicos
  const handleDebugSpecific = () => {
    if (!showDebugActions) return;
    const beneficiaryName = prompt('Ingresa el nombre del beneficiario a debuggear (ej: "Juan Pérez"):');
    if (!beneficiaryName) return;
    
    const allAssignments = getAllAssignments();
    logger.debug('[BeneficiariosBase] DEBUG ESPECÍFICO', {
      beneficiaryName,
      assignmentsTotal: allAssignments.length,
      assignmentsSample: allAssignments.slice(0, 5),
    });
    
    // Buscar en beneficiarios
    const beneficiaryMatch = beneficiaries.find(b => 
      b.nombre?.toLowerCase().includes(beneficiaryName.toLowerCase())
    );
    logger.debug('[BeneficiariosBase] Beneficiario encontrado en base', { found: Boolean(beneficiaryMatch), beneficiaryMatch });
    
    // Buscar en asignaciones
    const assignmentMatch = allAssignments.find(a => 
      a.beneficiary?.toLowerCase().includes(beneficiaryName.toLowerCase())
    );
    logger.debug('[BeneficiariosBase] Asignación encontrada', { found: Boolean(assignmentMatch), assignmentMatch });
    
    // Usar función de debugging existente
    const result = debugBeneficiaryMatch(beneficiaryName, beneficiaries, allAssignments);
    
    showNotification(
      result.found 
        ? `✅ ${beneficiaryName} está asignado a ${result.operator}` 
        : `❌ ${beneficiaryName} NO está asignado`,
      result.found ? 'success' : 'error'
    );
  };

  // Nueva función de debugging completo del módulo
  const handleDebugModule = () => {
    if (!showDebugActions) return;
    logger.group('🔍 DIAGNÓSTICO COMPLETO - MÓDULO BENEFICIARIOS BASE');
    
    const allAssignments = getAllAssignments();
    const unassigned = findUnassignedBeneficiaries(allAssignments);
    setUnassignedBeneficiaries(unassigned);
    
    logger.info('[BeneficiariosBase] RESUMEN GENERAL', {
      totalBeneficiarios: beneficiaries.length,
      totalAsignaciones: allAssignments.length,
      beneficiariosSinAsignar: unassigned.length,
      diferenciaEsperada: beneficiaries.length - allAssignments.length,
    });
    
    logger.debug('[BeneficiariosBase] FORMATO DE ASIGNACIONES (primeras 3)');
    allAssignments.slice(0, 3).forEach((assignment, i) => {
      logger.debug(`[BeneficiariosBase] Asignación ${i + 1}`, {
        beneficiary: assignment.beneficiary,
        operator: assignment.operator,
        operatorName: assignment.operatorName,
        phone: assignment.phone
      });
    });
    
    logger.debug('[BeneficiariosBase] FORMATO DE BENEFICIARIOS (primeros 3)');
    beneficiaries.slice(0, 3).forEach((beneficiary, i) => {
      logger.debug(`[BeneficiariosBase] Beneficiario ${i + 1}`, {
        nombre: beneficiary.nombre,
        fono: beneficiary.fono,
        sim: beneficiary.sim
      });
    });

    logger.groupEnd();
    
    showNotification(
      `🔍 Diagnóstico completado. Ver consola para detalles. ${allAssignments.length} asignaciones, ${unassigned.length} sin asignar`,
      'info'
    );
  };

  // Manejar upload de Excel
  const handleUploadComplete = async (data, metadata) => {
    try {
      logger.info('[BeneficiariosBase] UPLOAD EXCEL - Iniciando', { records: data.length });
      
      const result = await uploadBeneficiaries(data, user.uid, {
        replaceAll: true,
        onProgress: (progress) => {
          if (import.meta.env.DEV) logger.debug('[BeneficiariosBase] Upload progreso', progress);
          if (metadata?.onProgress) {
            metadata.onProgress(progress.processed || 0);
          }
        }
      });

      if (!result.success) {
        throw new Error(result.message || 'Error durante la carga');
      }

      const message = result.replacedPrevious 
        ? `✅ Base de datos REEMPLAZADA: ${result.successful} beneficiarios cargados` 
        : `✅ Se cargaron ${result.successful} beneficiarios correctamente`;
      const errorPart = result.errors > 0 ? ` (${result.errors} errores encontrados)` : '';

      showNotification(message + errorPart, 'success');
      logger.info('[BeneficiariosBase] UPLOAD COMPLETADO', result);
      setShowUploadModal(false);
      
    } catch (error) {
      logger.error('[BeneficiariosBase] Error en upload', error);
      showNotification(`❌ Error: ${error.message}`, 'error');
    }
  };

  // Manejar edición de beneficiario
  const handleEditBeneficiary = (beneficiary) => {
    // TODO: Implementar modal de edición
    if (import.meta.env.DEV) logger.debug('[BeneficiariosBase] Editar beneficiario', beneficiary);
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
    // CORRECCIÓN: Integrar con módulo de asignaciones usando datos reales
    if (import.meta.env.DEV) logger.debug('[BeneficiariosBase] Asignar teleoperadora a', beneficiary);
    showNotification(`TODO: Implementar asignación para ${beneficiary.nombre}`, 'info');
  };

  // Filtrar beneficiarios según búsqueda
  const filteredBeneficiaries = getFilteredBeneficiaries();

  return (
    <div className="space-y-6">
      {/* Notificaciones */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-xl max-w-md ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            notification.type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {notification.type === 'error' && <AlertTriangle className="h-5 w-5" />}
            {notification.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
            <span className="font-medium">{notification.message}</span>
          </div>
        </motion.div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Database className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Beneficiarios Base</h2>
              <p className="text-sm text-gray-600 mt-1">
                Gestión centralizada de beneficiarios y validación con asignaciones
              </p>
            </div>
          </div>

          {/* Botones de acción principales */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSyncWithAssignments}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              title="Sincronizar con módulo de Asignaciones"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Sincronizar con Asignaciones</span>
            </button>

            {showDebugActions && (
              <>
                <button
                  onClick={handleDebugModule}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                  title="Ejecutar diagnóstico completo"
                >
                  <Bug className="h-4 w-4" />
                  <span className="hidden sm:inline">Diagnóstico</span>
                </button>

                <button
                  onClick={handleDebugSpecific}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                  title="Buscar beneficiario específico"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Debug Específico</span>
                </button>
              </>
            )}

            {isAdminUser(user) && (
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={isUploading}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Cargar Excel con beneficiarios actualizados"
              >
                <Upload className="h-4 w-4" />
                <span>{isUploading ? 'Cargando...' : 'Cargar Excel'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Beneficiarios</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
              </div>
              <Users className="h-10 w-10 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Con Asignación</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{stats.total - stats.unassigned}</p>
              </div>
              <UserCheck className="h-10 w-10 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide">Sin Asignar</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.unassigned}</p>
              </div>
              <UserX className="h-10 w-10 text-yellow-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Cobertura</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {stats.total > 0 ? Math.round(((stats.total - stats.unassigned) / stats.total) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-600 opacity-50" />
            </div>
          </div>
        </div>

        {/* Navegación por tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: Database },
              { id: 'list', name: 'Lista completa', icon: Users },
              { id: 'validation', name: 'Validación', icon: CheckCircle }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Contenido por tabs */}
      {activeTab === 'dashboard' && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Componente de beneficiarios sin asignar */}
          <UnassignedBeneficiaries
            unassignedBeneficiaries={unassignedBeneficiaries}
            onAssignOperator={handleAssignOperator}
          />

          {/* Gráficos y estadísticas adicionales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <span>Distribución por Estado</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Con Asignación</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {stats.total - stats.unassigned}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-2">
                    <UserX className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-700">Sin Asignar</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">
                    {stats.unassigned}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <span>Progreso de Cobertura</span>
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Cobertura Actual</span>
                    <span className="text-sm font-bold text-purple-600">
                      {stats.total > 0 ? Math.round(((stats.total - stats.unassigned) / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${stats.total > 0 ? ((stats.total - stats.unassigned) / stats.total) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">Total Base</p>
                    <p className="text-xl font-bold text-blue-900">{stats.total}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-medium">Asignados</p>
                    <p className="text-xl font-bold text-green-900">{stats.total - stats.unassigned}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'list' && (
        <motion.div
          key="list"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <BeneficiaryList
            beneficiaries={filteredBeneficiaries}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onEdit={handleEditBeneficiary}
            onDelete={handleDeleteBeneficiary}
            onAssignOperator={handleAssignOperator}
            isLoading={isLoading}
          />
        </motion.div>
      )}

      {activeTab === 'validation' && (
        <motion.div
          key="validation"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Validación y Consistencia
              </h3>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Funcionalidad en desarrollo:</strong> Esta sección incluirá herramientas de validación, 
                auditoría y detección de inconsistencias entre la base de beneficiarios y las asignaciones.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Modal de upload */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Cargar Base de Beneficiarios</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <ExcelUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={(error) => showNotification(error, 'error')}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeneficiariosBase;
