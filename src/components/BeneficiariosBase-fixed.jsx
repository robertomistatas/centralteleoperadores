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
  RefreshCw,
  Bug,
  Download
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
    setBeneficiaries,
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
          console.error('Error inicializando store:', error);
          showNotification('❌ Error cargando beneficiarios', 'error');
        }
      }
    };
    
    initializeStore();
  }, [user]);

  // Mostrar estadísticas iniciales
  useEffect(() => {
    if (beneficiaries.length > 0 && !isLoading) {
      console.log('📊 Beneficiarios Base cargados:', {
        total: beneficiaries.length,
        stats: stats
      });
    }
  }, [beneficiaries, stats, isLoading]);

  // CORRECCIÓN: Actualizar estadísticas cuando cambien las asignaciones usando getAllAssignments()
  useEffect(() => {
    if (beneficiaries.length > 0) {
      const allAssignments = getAllAssignments();
      console.log('🔄 Actualizando estadísticas con asignaciones:', allAssignments.length);
      
      // Buscar beneficiarios no asignados usando el formato correcto
      const unassigned = findUnassignedBeneficiaries(allAssignments);
      console.log('👥 Beneficiarios sin asignar encontrados:', unassigned.length);
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
      console.log('🔄 Sincronizando con módulo de asignaciones...');
      
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
    const beneficiaryName = prompt('Ingresa el nombre del beneficiario a debuggear (ej: "Mariana Apolonia Gonzalez Gonzalez"):');
    if (!beneficiaryName) return;
    
    const allAssignments = getAllAssignments();
    console.log('🔍 DEBUG ESPECÍFICO:', beneficiaryName);
    console.log('📋 Total asignaciones disponibles:', allAssignments.length);
    console.log('📋 Muestra de asignaciones:', allAssignments.slice(0, 5));
    
    // Buscar en beneficiarios
    const beneficiaryMatch = beneficiaries.find(b => 
      b.nombre?.toLowerCase().includes(beneficiaryName.toLowerCase())
    );
    console.log('👤 Beneficiario encontrado en base:', beneficiaryMatch);
    
    // Buscar en asignaciones
    const assignmentMatch = allAssignments.find(a => 
      a.beneficiary?.toLowerCase().includes(beneficiaryName.toLowerCase())
    );
    console.log('📝 Asignación encontrada:', assignmentMatch);
    
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
    console.group('🔍 DIAGNÓSTICO COMPLETO - MÓDULO BENEFICIARIOS BASE');
    
    const allAssignments = getAllAssignments();
    const unassigned = findUnassignedBeneficiaries(allAssignments);
    
    console.log('📊 RESUMEN GENERAL:');
    console.log('- Total beneficiarios:', beneficiaries.length);
    console.log('- Total asignaciones:', allAssignments.length);
    console.log('- Beneficiarios sin asignar:', unassigned.length);
    console.log('- Diferencia esperada:', beneficiaries.length - allAssignments.length);
    
    console.log('📋 FORMATO DE ASIGNACIONES (primeras 3):');
    allAssignments.slice(0, 3).forEach((assignment, i) => {
      console.log(`${i + 1}.`, {
        beneficiary: assignment.beneficiary,
        operator: assignment.operator,
        operatorName: assignment.operatorName,
        phone: assignment.phone
      });
    });
    
    console.log('👥 FORMATO DE BENEFICIARIOS (primeros 3):');
    beneficiaries.slice(0, 3).forEach((beneficiary, i) => {
      console.log(`${i + 1}.`, {
        nombre: beneficiary.nombre,
        fono: beneficiary.fono,
        sim: beneficiary.sim
      });
    });
    
    // Caso específico: Mariana Apolonia
    const marianaInBeneficiaries = beneficiaries.find(b => 
      b.nombre?.toLowerCase().includes('mariana apolonia')
    );
    const marianaInAssignments = allAssignments.find(a => 
      a.beneficiary?.toLowerCase().includes('mariana apolonia')
    );
    
    console.log('🎯 CASO ESPECÍFICO - Mariana Apolonia:');
    console.log('- En beneficiarios:', marianaInBeneficiaries ? 'SÍ' : 'NO');
    console.log('- En asignaciones:', marianaInAssignments ? 'SÍ' : 'NO');
    
    if (marianaInBeneficiaries) {
      console.log('👤 Datos de Mariana en beneficiarios:', marianaInBeneficiaries);
    }
    
    if (marianaInAssignments) {
      console.log('📝 Datos de Mariana en asignaciones:', marianaInAssignments);
    }
    
    console.groupEnd();
    
    showNotification(
      `🔍 Diagnóstico completado. Ver consola para detalles. ${allAssignments.length} asignaciones, ${unassigned.length} sin asignar`,
      'info'
    );
  };

  // Manejar upload de Excel
  const handleUploadComplete = async (data, metadata) => {
    try {
      console.log('📤 UPLOAD EXCEL - Iniciando...');
      console.log(`📊 Registros en Excel: ${data.length}`);
      
      // Importar el servicio directamente para usar la nueva funcionalidad
      const { beneficiaryService } = await import('../services/beneficiaryService');
      
      // NUEVO: Usar uploadBeneficiaries con reemplazo automático
      const result = await beneficiaryService.uploadBeneficiaries(
        data, 
        user.uid, 
        (progress) => {
          // Callback de progreso
          console.log('📊 Progreso:', progress);
          if (metadata?.onProgress) {
            metadata.onProgress(progress.processed || 0);
          }
        },
        true // replaceAll = true (eliminar datos existentes)
      );
      
      if (result.success) {
        // Actualizar el store local inmediatamente
        setBeneficiaries(result.data);
        
        // Mostrar mensaje informativo sobre el reemplazo
        const message = result.replacedPrevious 
          ? `✅ Base de datos REEMPLAZADA: ${result.successful} beneficiarios cargados` 
          : `✅ Se cargaron ${result.successful} beneficiarios correctamente`;
        
        const errorPart = result.errors > 0 ? ` (${result.errors} errores encontrados)` : '';
        
        showNotification(message + errorPart, 'success');
        console.log('✅ UPLOAD COMPLETADO:', result);
        setShowUploadModal(false);
      } else {
        throw new Error(result.message || 'Error durante la carga');
      }
      
    } catch (error) {
      console.error('❌ Error en upload:', error);
      showNotification(`❌ Error: ${error.message}`, 'error');
    }
  };

  // Manejar edición de beneficiario
  const handleEditBeneficiary = (beneficiary) => {
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
    // CORRECCIÓN: Integrar con módulo de asignaciones usando datos reales
    console.log('Asignar teleoperadora a:', beneficiary);
    showNotification(`TODO: Implementar asignación para ${beneficiary.nombre}`, 'info');
  };

  // Filtrar beneficiarios según búsqueda
  const filteredBeneficiaries = getFilteredBeneficiaries();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Notificaciones */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            notification.type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
          }`}
        >
          {notification.message}
        </motion.div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Beneficiarios Base
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gestión centralizada de beneficiarios y validación con asignaciones
                </p>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center space-x-3">
              {/* CORRECCIÓN: Botón de sincronización manual */}
              <button
                onClick={handleSyncWithAssignments}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Sincronizar con Asignaciones</span>
              </button>

              {/* Botón de debugging */}
              <button
                onClick={handleDebugModule}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Bug className="h-4 w-4" />
                <span>Diagnóstico</span>
              </button>

              {/* Botón de debugging específico */}
              <button
                onClick={handleDebugSpecific}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Debug Específico</span>
              </button>

              {isAdminUser(user?.email) && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>Cargar Excel</span>
                </button>
              )}
            </div>
          </div>

          {/* Navegación por tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'dashboard', name: 'Dashboard', icon: Database },
                { id: 'list', name: 'Lista completa', icon: Users },
                { id: 'validation', name: 'Validación', icon: CheckCircle }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Dashboard de Beneficiarios
            </h3>
            
            {/* CORRECCIÓN: Usar getAllAssignments() para el componente UnassignedBeneficiaries */}
            <UnassignedBeneficiaries
              beneficiaries={beneficiaries}
              assignments={getAllAssignments()}
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
                    <span className="text-sm text-gray-600 dark:text-gray-400">Con Asignación</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {stats.total - stats.unassigned}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Sin Asignar</span>
                    <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      {stats.unassigned}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Validación y Consistencia
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Herramientas de validación y auditoría en desarrollo...
              </p>
            </div>
          </motion.div>
        )}
      </main>

      {/* Modal de upload */}
      {showUploadModal && (
        <ExcelUpload
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUploadModal(false)}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      )}
    </div>
  );
};

export default BeneficiariosBase;
