import React from 'react';
import { useCallStore, useAppStore } from '../../stores';
import { BarChart3, FileSpreadsheet, TrendingUp, Users, Clock, Phone } from 'lucide-react';

function AuditDemo() {
  const {
    callData,
    callMetrics,
    processedData,
    isLoading,
    lastUpdated,
    dataSource,
    clearData,
    hasData,
    getSuccessRate,
    getOperatorMetrics,
    getHourlyDistribution
  } = useCallStore();

  const {
    operators
  } = useAppStore();

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'N/A';
    }
  };

  const operatorMetrics = getOperatorMetrics ? getOperatorMetrics() : [];
  const hourlyDistribution = getHourlyDistribution ? getHourlyDistribution() : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Auditoría Avanzada de Llamadas
        </h2>
        <p className="text-gray-600">
          Análisis detallado y métricas en tiempo real de todas las llamadas registradas en el sistema.
          Estado de datos: <span className="font-semibold">{hasData && hasData() ? 'Datos cargados' : 'Sin datos'}</span>
          {lastUpdated && ` | Última actualización: ${formatDate(lastUpdated)}`}
        </p>
      </div>

      {hasData && hasData() && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">Total Llamadas</h4>
                <p className="text-2xl font-bold text-blue-600">{callMetrics?.totalCalls || 0}</p>
              </div>
              <Phone className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-blue-600 mt-2">Registros procesados</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-green-800 mb-1">Tasa de Éxito</h4>
                <p className="text-2xl font-bold text-green-600">{getSuccessRate ? getSuccessRate() : 0}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-green-600 mt-2">Llamadas exitosas</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-purple-800 mb-1">Operadores Activos</h4>
                <p className="text-2xl font-bold text-purple-600">{operatorMetrics?.length || 0}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-xs text-purple-600 mt-2">Con actividad registrada</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-orange-800 mb-1">Duración Promedio</h4>
                <p className="text-2xl font-bold text-orange-600">
                  {formatDuration(callMetrics?.averageDuration || 0)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-xs text-orange-600 mt-2">Tiempo por llamada</p>
          </div>
        </div>
      )}

      {(!hasData || !hasData()) && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay datos de auditoría disponibles
          </h3>
          <p className="text-gray-500 mb-4">
            Sube un archivo Excel en la sección "Registro de Llamadas" para comenzar
            el análisis de auditoría avanzada.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800 text-sm">
               <strong>Tip:</strong> Una vez que subas datos, verás métricas detalladas,
              análisis por operador y distribución temporal de llamadas.
            </p>
          </div>
        </div>
      )}

      {hasData && hasData() && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p><strong>Fuente de datos:</strong> {dataSource || 'Desconocida'}</p>
              <p><strong>Última actualización:</strong> {formatDate(lastUpdated)}</p>
            </div>
            {clearData && (
              <button
                onClick={clearData}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                 Limpiar Datos
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditDemo;
