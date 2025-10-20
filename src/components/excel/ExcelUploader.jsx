/**
 * ExcelUploader.jsx
 * Componente para carga, análisis y previsualización de archivos Excel
 * 
 * Características:
 * - Drag & drop y selección de archivos
 * - Validación de formato y tamaño
 * - Barra de progreso durante procesamiento
 * - Resumen de métricas con visualización
 * - Tabla paginada de preview
 * - Detección de archivos duplicados (hash)
 * - Warnings y alertas
 * - Modo seguro (sin escritura en Firestore)
 * 
 * FASE 2: Persistencia en Firestore
 * - Botón "Guardar en Firestore"
 * - Validación de modo seguro
 * - Detección de duplicados por hash
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Eye, Download, RefreshCw, Save } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import useExcelStore from '../../stores/useExcelStore';
import useCallStore from '../../stores/useCallStore';
import useUIStore from '../../stores/useUIStore';
import { parseAndNormalizeExcel, generateFileHash, validateExcelFile } from '../../services/excelProcessor';
import { exportFullAnalysis, validateExport } from '../../utils/exportUtils';
import logger from '../../utils/logger';

const ExcelUploader = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterClasificacion, setFilterClasificacion] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  
  // Stores
  const {
    file,
    fullData,
    resumen,
    columnMapping,
    warnings,
    loading,
    loadingStage,
    error,
    setFile,
    setLoading,
    setError,
    processAnalysisResult,
    isFileProcessed,
    getFilteredData,
    clear,
    getSuccessRate,
    getFailureRate,
    isSafeModeEnabled,
    persistToFirestore
  } = useExcelStore();
  
  // ⭐ CRÍTICO: Store para sincronización con Historial de Seguimientos
  const setCallData = useCallStore((state) => state.setCallData);
  
  // UI Store
  const { showSuccess, showError, showWarning, showInfo } = useUIStore();
  
  // Verificar modo seguro
  const safeMode = isSafeModeEnabled();
  
  // Manejador de selección de archivo
  const handleFileSelect = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    
    try {
      // Limpiar estado anterior
      clear();
      setShowPreview(false);
      setCurrentPage(1);
      
      // Validar archivo
      const validation = validateExcelFile(selectedFile);
      if (!validation.valid) {
        showError(validation.error);
        return;
      }
      
      logger.info('[ExcelUploader] Archivo seleccionado', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      });
      
      // Generar hash
      setLoading(true, 'reading');
      const hash = await generateFileHash(selectedFile);
      
      // Verificar si ya fue procesado
      const alreadyProcessed = isFileProcessed(hash);
      if (alreadyProcessed) {
        logger.info('[ExcelUploader] Archivo ya procesado', { hash });
        showInfo('✅ Archivo ya analizado anteriormente. Mostrando vista previa guardada.');
        
        // Cargar datos del historial (si implementamos caché persistente)
        // Por ahora, reprocesar
      }
      
      setFile(selectedFile, hash);
      
      // Procesar archivo
      setLoading(true, 'processing');
      const result = await parseAndNormalizeExcel(selectedFile);
      
      setLoading(true, 'analyzing');
      processAnalysisResult(result);
      
      // ⭐ CORRECCIÓN CRÍTICA RC1: Sincronizar con CallStore para Historial de Seguimientos
      logger.info('[ExcelUploader] 🔄 Sincronizando datos con CallStore', {
        registros: result.data.length,
        exitosas: result.resumen.exitosas,
        fallidas: result.resumen.fallidas
      });
      
      setCallData(result.data, 'excel');
      
      logger.audit('[ExcelUploader] ✅ Sincronización completada - Historial de Seguimientos actualizado');
      
      // ⭐ RC1 CRÍTICO: Validar fechas futuras
      const now = new Date();
      const futureDates = result.data.filter(record => {
        if (!record.fecha) return false;
        try {
          const [year, month, day] = record.fecha.split('-').map(Number);
          const recordDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
          return recordDate > now;
        } catch {
          return false;
        }
      });
      
      if (futureDates.length > 0) {
        logger.warn('[ExcelUploader] ⚠️ Fechas futuras detectadas', {
          cantidad: futureDates.length,
          ejemplos: futureDates.slice(0, 3).map(r => ({
            beneficiario: r.beneficiario,
            fecha: r.fecha
          }))
        });
        showWarning(`⚠️ Detectadas ${futureDates.length} fechas futuras en el Excel. Esto causará días negativos en el historial. Verifique los datos.`);
      }
      
      // Mostrar resultados
      if (result.warnings.length > 0) {
        const warningMessage = result.warnings[0].message;
        showWarning(`⚠️ ${warningMessage}. Revise la pestaña de warnings.`);
      } else {
        showSuccess('✅ Archivo procesado exitosamente');
      }
      
      // Mostrar info de modo seguro
      if (safeMode) {
        setTimeout(() => {
          showInfo('🔒 Modo seguro activo – No se guardarán datos en Firestore');
        }, 1000);
      }
      
      setShowPreview(true);
      
    } catch (err) {
      logger.error('[ExcelUploader] Error procesando archivo', { error: err.message });
      setError(err.message);
      showError(`❌ Error: ${err.message}`);
    }
  }, [clear, setFile, setLoading, setError, processAnalysisResult, isFileProcessed, setCallData, showSuccess, showError, showWarning, showInfo, safeMode]);
  
  // Manejador de input
  const handleInputChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };
  
  // Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };
  
  // Abrir selector de archivos
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };
  
  // Reiniciar
  const handleReset = () => {
    clear();
    setShowPreview(false);
    setCurrentPage(1);
    setFilterClasificacion('all');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showInfo('Listo para cargar nuevo archivo');
  };
  
  // Handler para guardar en Firestore (FASE 2)
  const handleSaveToFirestore = async () => {
    if (!user) {
      showError('Usuario no autenticado');
      return;
    }

    if (!fullData || fullData.length === 0) {
      showWarning('No hay datos para guardar');
      return;
    }

    if (safeMode) {
      showWarning('🔒 Modo seguro activo. Cambie la variable VITE_EXCEL_SAFE_MODE a false para permitir escrituras en Firestore.');
      return;
    }

    setIsSaving(true);

    try {
      logger.info('[ExcelUploader] Iniciando persistencia en Firestore');
      
      const result = await persistToFirestore(user.uid);

      if (result.success) {
        showSuccess(`✅ Análisis guardado exitosamente en Firestore (ID: ${result.id})`);
        logger.info('[ExcelUploader] Persistencia completada', { docId: result.id });
      } else {
        if (result.existingId) {
          showWarning(`⚠️ ${result.error}`);
        } else {
          showError(`❌ ${result.error}`);
        }
      }
    } catch (error) {
      logger.error('[ExcelUploader] Error inesperado al guardar', error);
      showError(`Error al guardar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler para exportar análisis completo (FASE 2 - TAREA 7)
  const handleExportAnalysis = () => {
    const validation = validateExport(safeMode);
    
    if (!validation.allowed) {
      showWarning(validation.message);
      return;
    }

    if (!fullData || fullData.length === 0) {
      showWarning('No hay datos para exportar');
      return;
    }

    try {
      const analysisData = {
        fileName: file.name,
        totalRows: resumen.total,
        exitosas: resumen.exitosas,
        fallidas: resumen.fallidas,
        sinIdentificar: resumen.sinIdentificar,
        metricsByOperator: resumen.metricsByOperator || {},
        fullData,
        processedAt: new Date().toISOString(),
        fileHash: resumen.fileHash
      };

      const filename = `analisis_${file.name.replace(/\.[^/.]+$/, '')}_${Date.now()}.xlsx`;
      exportFullAnalysis(analysisData, filename, false);
      
      showSuccess(`✅ Análisis exportado exitosamente: ${filename}`);
    } catch (error) {
      logger.error('[ExcelUploader] Error al exportar análisis', error);
      showError(`Error al exportar: ${error.message}`);
    }
  };
  
  // Obtener datos filtrados y paginados
  const filteredData = filterClasificacion === 'all' ? fullData : getFilteredData(filterClasificacion);
  const pageSize = 20;
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  
  // Renderizar barra de progreso
  const renderProgressBar = () => {
    if (!loading) return null;
    
    const stages = {
      reading: { label: 'Leyendo archivo...', progress: 33 },
      processing: { label: 'Procesando datos...', progress: 66 },
      analyzing: { label: 'Analizando resultados...', progress: 90 }
    };
    
    const stage = stages[loadingStage] || { label: 'Cargando...', progress: 0 };
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
        <div 
          className="bg-blue-600 h-3 rounded-full transition-all duration-500 flex items-center justify-center text-xs text-white font-semibold"
          style={{ width: `${stage.progress}%` }}
        >
          {stage.progress > 30 && `${stage.progress}%`}
        </div>
      </div>
    );
  };
  
  // Renderizar resumen
  const renderResumen = () => {
    if (!file || loading || error) return null;
    
    const successRate = getSuccessRate();
    const failureRate = getFailureRate();
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Total Registros</div>
          <div className="text-2xl font-bold text-blue-600">{resumen.total}</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Exitosas</div>
          <div className="text-2xl font-bold text-green-600">{resumen.exitosas}</div>
          <div className="text-xs text-gray-500">{successRate}%</div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Fallidas</div>
          <div className="text-2xl font-bold text-red-600">{resumen.fallidas}</div>
          <div className="text-xs text-gray-500">{failureRate}%</div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Sin Identificar</div>
          <div className="text-2xl font-bold text-yellow-600">{resumen.sinIdentificar}</div>
          <div className="text-xs text-gray-500">
            {resumen.total > 0 ? Math.round((resumen.sinIdentificar / resumen.total) * 100) : 0}%
          </div>
        </div>
      </div>
    );
  };
  
  // Renderizar warnings
  const renderWarnings = () => {
    if (!warnings || warnings.length === 0) return null;
    
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
          Advertencias ({warnings.length})
        </h3>
        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <div key={index} className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">{warning.message}</p>
                  {warning.details && (
                    <p className="text-xs text-yellow-600 mt-1">
                      {Array.isArray(warning.details) ? warning.details.join(', ') : warning.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Renderizar tabla de preview
  const renderPreviewTable = () => {
    if (!showPreview || !fullData.length) return null;
    
    // Obtener columnas (excluyendo las que empiezan con _)
    const columns = Object.keys(fullData[0]).filter(key => !key.startsWith('_'));
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            Vista Previa de Datos ({filteredData.length} registros)
          </h3>
          
          <div className="flex items-center space-x-2">
            <select
              value={filterClasificacion}
              onChange={(e) => {
                setFilterClasificacion(e.target.value);
                setCurrentPage(1);
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">Todos</option>
              <option value="exitosa">✅ Exitosas</option>
              <option value="fallida">❌ Fallidas</option>
              <option value="sin_identificar">⚠️ Sin identificar</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                {columns.map(col => (
                  <th key={col} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {col}
                  </th>
                ))}
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((row, index) => {
                const globalIndex = (currentPage - 1) * pageSize + index + 1;
                const clasificacion = row._clasificacion;
                
                let badgeClass = 'bg-gray-100 text-gray-700';
                let badgeIcon = '⚪';
                
                if (clasificacion === 'exitosa') {
                  badgeClass = 'bg-green-100 text-green-700';
                  badgeIcon = '✅';
                } else if (clasificacion === 'fallida') {
                  badgeClass = 'bg-red-100 text-red-700';
                  badgeIcon = '❌';
                } else {
                  badgeClass = 'bg-yellow-100 text-yellow-700';
                  badgeIcon = '⚠️';
                }
                
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-500">{globalIndex}</td>
                    {columns.map(col => (
                      <td key={col} className="px-4 py-2 text-sm text-gray-900">
                        {row[col] || '-'}
                      </td>
                    ))}
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                        {badgeIcon} {clasificacion.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Página {currentPage} de {totalPages} ({filteredData.length} registros)
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Análisis de Excel {safeMode ? '(Modo Seguro)' : '(Modo Producción)'}
        </h1>
        <p className="text-gray-600">
          {safeMode 
            ? 'Cargue y analice archivos Excel sin guardar datos en Firestore. Vista previa y métricas en tiempo real.'
            : 'Cargue, analice y persista archivos Excel en Firestore con análisis completo de métricas.'
          }
        </p>
        <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium">
          {safeMode ? (
            <span className="bg-blue-100 text-blue-700">
              🔒 Modo Seguro Activo - Sin persistencia
            </span>
          ) : (
            <span className="bg-green-100 text-green-700">
              ✅ Modo Producción - Persistencia habilitada
            </span>
          )}
        </div>
      </div>
      
      {/* Zona de carga */}
      {!file && !loading && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileSelector}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleInputChange}
            className="hidden"
          />
          
          <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isDragging ? 'Suelte el archivo aquí' : 'Arrastra un archivo Excel o haz clic para seleccionar'}
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            Formatos soportados: .xlsx, .xls, .csv (máximo 10 MB)
          </p>
          
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Detección automática de columnas</span>
            <span>•</span>
            <CheckCircle className="w-4 h-4" />
            <span>Análisis en tiempo real</span>
          </div>
        </div>
      )}
      
      {/* Estado de carga */}
      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-center mb-4">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mr-3" />
            <span className="text-lg font-medium text-gray-900">
              {loadingStage === 'reading' && 'Leyendo archivo...'}
              {loadingStage === 'processing' && 'Procesando datos...'}
              {loadingStage === 'analyzing' && 'Analizando resultados...'}
            </span>
          </div>
          {renderProgressBar()}
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-3" />
            <div>
              <h3 className="text-sm font-semibold text-red-800">Error al procesar archivo</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="mt-3 text-sm text-red-700 hover:text-red-900 font-medium"
          >
            Intentar con otro archivo
          </button>
        </div>
      )}
      
      {/* Información del archivo */}
      {file && !loading && !error && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileSpreadsheet className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{file.name}</h3>
                <p className="text-xs text-gray-600">
                  {(file.size / 1024).toFixed(2)} KB • Procesado exitosamente
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Cargar otro archivo
            </button>
          </div>
        </div>
      )}
      
      {/* Resumen de métricas */}
      {renderResumen()}
      
      {/* Warnings */}
      {renderWarnings()}
      
      {/* Información de columnas detectadas */}
      {columnMapping && Object.keys(columnMapping).length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Columnas Detectadas ({Object.keys(columnMapping).length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(columnMapping).map(([original, normalized]) => (
              <span key={original} className="inline-flex items-center px-3 py-1 bg-white text-blue-700 rounded-full text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                {original} → {normalized}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Preview de datos */}
      {renderPreviewTable()}
      
      {/* Botones de acción */}
      {showPreview && (
        <div className="mt-6 flex flex-col gap-4">
          {/* Información sobre persistencia */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full animate-pulse ${safeMode ? 'bg-blue-500' : 'bg-green-500'}`}></div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {safeMode ? '🔒 Modo Seguro Activo' : '✅ Modo Producción'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {safeMode 
                    ? 'Los datos NO se guardarán en Firestore hasta que active el modo producción' 
                    : 'Los datos pueden guardarse en Firestore'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              {!safeMode && (
                <button
                  onClick={handleSaveToFirestore}
                  disabled={isSaving || loading}
                  className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar en Firestore
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={handleExportAnalysis}
                disabled={!fullData || fullData.length === 0 || safeMode}
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                title={safeMode ? "Solo disponible en modo producción" : "Exportar análisis completo a Excel"}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Análisis
              </button>
            </div>
          </div>
          
          {/* Información sobre el análisis actual */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Total Registros</p>
              <p className="text-2xl font-bold text-gray-900">{fullData.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Tasa de Éxito</p>
              <p className="text-2xl font-bold text-green-600">{getSuccessRate()}%</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Estado</p>
              <p className="text-sm font-semibold text-gray-900">
                {safeMode ? '🔒 Modo Seguro' : '✅ Listo para guardar'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelUploader;
