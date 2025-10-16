/**
 * 🧪 FASE 4 - TAREA 5: Panel de Validación de Consistencia
 * 
 * Componente React que muestra resultados de validación en tiempo real
 * Solo visible para Super Admin
 */

import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw, Zap } from 'lucide-react';
import { runConsistencyTest, monitorRealtimeSync } from '../../tests/consistencyTest';
import { useCallStore } from '../../stores/useCallStore';
import { useSeguimientosStore } from '../../stores/useSeguimientosStore';
import logger from '../../utils/logger';

const ConsistencyValidationPanel = ({ className = '' }) => {
  const [report, setReport] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState(null);
  const [syncMonitor, setSyncMonitor] = useState(null);
  const [autoValidate, setAutoValidate] = useState(true);

  // Ejecutar validación manual
  const runValidation = async () => {
    setIsValidating(true);
    logger.audit('[ValidationPanel] Ejecutando validación manual');

    try {
      const stores = {
        callStore: useCallStore,
        seguimientosStore: useSeguimientosStore
      };

      const validationReport = runConsistencyTest(stores);
      setReport(validationReport);
      setLastValidation(new Date());

      logger.audit('[ValidationPanel] Validación completada', {
        status: validationReport.globalStatus,
        withinTolerance: validationReport.withinTolerance
      });

    } catch (error) {
      logger.error('[ValidationPanel] Error en validación', error);
      setReport({
        globalStatus: 'ERROR ❌',
        error: error.message
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Ejecutar validación automática cada 60s
  useEffect(() => {
    if (!autoValidate) return;

    // Validación inicial después de 3 segundos
    const initialTimer = setTimeout(runValidation, 3000);

    // Validación periódica
    const interval = setInterval(runValidation, 60000); // 60 segundos

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [autoValidate]);

  // Inicializar monitor de sincronización
  useEffect(() => {
    const monitor = monitorRealtimeSync((syncStatus) => {
      logger.info('[ValidationPanel] Actualización realtime detectada', syncStatus);
      
      // Re-validar después de actualización
      if (autoValidate) {
        setTimeout(runValidation, 1000);
      }
    });

    setSyncMonitor(monitor);

    return () => {
      if (monitor) {
        monitor.reset();
      }
    };
  }, []);

  // Determinar icono según estado
  const getStatusIcon = () => {
    if (!report) return <Activity className="w-5 h-5 text-gray-400 animate-pulse" />;
    if (report.globalStatus?.includes('✅')) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (report.globalStatus?.includes('⚠️')) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  // Determinar color de fondo según estado
  const getStatusColor = () => {
    if (!report) return 'bg-gray-50 border-gray-200';
    if (report.globalStatus?.includes('✅')) return 'bg-green-50 border-green-200';
    if (report.globalStatus?.includes('⚠️')) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  if (!report && !isValidating) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 border-2 border-dashed border-gray-300 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400 animate-pulse" />
            <span className="text-sm text-gray-600">Iniciando validación...</span>
          </div>
          <button
            onClick={runValidation}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Validar Ahora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow-lg border-2 ${getStatusColor()} ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Validación de Consistencia
              </h3>
              {lastValidation && (
                <p className="text-xs text-gray-500">
                  Última validación: {lastValidation.toLocaleTimeString('es-CL')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={autoValidate}
                onChange={(e) => setAutoValidate(e.target.checked)}
                className="rounded"
              />
              Auto (60s)
            </label>
            
            <button
              onClick={runValidation}
              disabled={isValidating}
              className={`p-2 rounded-lg transition-colors ${
                isValidating 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
              title="Validar ahora"
            >
              <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {report && (
        <div className="p-4 space-y-3">
          {/* Estado Global */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
            <span className="text-sm font-medium text-gray-700">Estado Global</span>
            <span className="text-lg font-bold">{report.globalStatus}</span>
          </div>

          {/* Diferencia Máxima */}
          {report.maxDifference && (
            <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
              <span className="text-sm font-medium text-gray-700">Diferencia Máxima</span>
              <div className="text-right">
                <span className={`text-lg font-bold ${
                  report.withinTolerance ? 'text-green-600' : 'text-red-600'
                }`}>
                  {report.maxDifference}
                </span>
                <p className="text-xs text-gray-500">Tolerancia: ±0.01%</p>
              </div>
            </div>
          )}

          {/* Métricas Comparativas */}
          {report.metrics && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-600 uppercase">Métricas por Módulo</h4>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-white rounded shadow-sm">
                  <div className="font-medium text-blue-600">Dashboard</div>
                  <div className="text-gray-700">{report.metrics.dashboard?.total || 0} llamadas</div>
                  <div className="text-gray-500">{report.metrics.dashboard?.tasaExito?.toFixed(1) || 0}% éxito</div>
                </div>

                <div className="p-2 bg-white rounded shadow-sm">
                  <div className="font-medium text-purple-600">Auditoría</div>
                  <div className="text-gray-700">{report.metrics.auditoria?.total || 0} llamadas</div>
                  <div className="text-gray-500">{report.metrics.auditoria?.tasaExito?.toFixed(1) || 0}% éxito</div>
                </div>

                <div className="p-2 bg-white rounded shadow-sm">
                  <div className="font-medium text-teal-600">Historial</div>
                  <div className="text-gray-700">{report.metrics.historial?.total || 0} llamadas</div>
                  <div className="text-gray-500">{report.metrics.historial?.tasaExito?.toFixed(1) || 0}% éxito</div>
                </div>
              </div>
            </div>
          )}

          {/* Comparaciones */}
          {report.comparisons && (
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-gray-600 uppercase">Comparaciones</h4>
              {Object.values(report.comparisons).map((comp, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white rounded text-xs">
                  <span className="text-gray-700">{comp.comparison}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{comp.maxDiff?.toFixed(4)}%</span>
                    <span>{comp.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sincronización Realtime */}
          {syncMonitor && (
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-semibold text-gray-700">Sincronización Realtime</span>
              </div>
              <div className="text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Actualizaciones:</span>
                  <span className="font-medium">{syncMonitor.getStats().totalUpdates}</span>
                </div>
                <div className="flex justify-between">
                  <span>Latencia promedio:</span>
                  <span className="font-medium">{syncMonitor.getStats().averageLatency}</span>
                </div>
              </div>
            </div>
          )}

          {/* Duración */}
          {report.duration && (
            <div className="text-xs text-gray-500 text-center">
              Validación completada en {report.duration}
            </div>
          )}

          {/* Error */}
          {report.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">Error en validación:</p>
              <p className="text-xs text-red-600 mt-1">{report.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConsistencyValidationPanel;
