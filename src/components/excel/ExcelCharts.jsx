/**
 * ExcelCharts.jsx
 * Componente de visualizaciones para análisis de Excel
 * 
 * FASE 2 - TAREA 6: Visualizaciones con Recharts
 * 
 * Gráficos implementados:
 * 1. PieChart - Distribución general (exitosas/fallidas/sin identificar)
 * 2. BarChart - Tasa de éxito por operadora
 * 3. LineChart - Evolución temporal de llamadas
 * 
 * Características:
 * - Responsive design
 * - Colores consistentes con paleta de la app
 * - Tooltips informativos
 * - Manejo de estados vacíos
 */

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  Legend,
  CartesianGrid
} from 'recharts';
import useMetricsStore from '../../stores/useMetricsStore';
import { chartColors } from '../../utils/chartUtils';
import { exportChartMetrics, validateExport } from '../../utils/exportUtils';
import useExcelStore from '../../stores/useExcelStore';
import useUIStore from '../../stores/useUIStore';
import { TrendingUp, Users, Calendar, BarChart3, AlertCircle, Download } from 'lucide-react';
import logger from '../../utils/logger';

const ExcelCharts = () => {
  const excelMetrics = useMetricsStore(state => state.excelAnalysisMetrics);
  const lastSync = useMetricsStore(state => state.lastSyncExcel);
  const loading = useMetricsStore(state => state.loading.excelAnalysis);
  const hasData = useMetricsStore(state => state.hasExcelData());
  const isSafeMode = useExcelStore(state => state.isSafeModeEnabled());
  const { showSuccess, showError, showWarning } = useUIStore();

  logger.info('[ExcelCharts] Renderizando componente', {
    hasMetrics: !!excelMetrics,
    hasData,
    loading
  });

  // Handler para exportar métricas
  const handleExportMetrics = () => {
    const validation = validateExport(isSafeMode);
    
    if (!validation.allowed) {
      showWarning(validation.message);
      return;
    }

    if (!excelMetrics || excelMetrics.total === 0) {
      showWarning('No hay métricas para exportar');
      return;
    }

    try {
      const filename = `metricas_excel_${Date.now()}.xlsx`;
      exportChartMetrics(excelMetrics, filename);
      showSuccess(`✅ Métricas exportadas exitosamente: ${filename}`);
    } catch (error) {
      logger.error('[ExcelCharts] Error al exportar métricas', error);
      showError(`Error al exportar: ${error.message}`);
    }
  };

  // Estado de carga
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando métricas de análisis...</p>
        </div>
      </div>
    );
  }

  // Sin datos
  if (!hasData || !excelMetrics || excelMetrics.total === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-8">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
            No hay análisis disponibles
          </h3>
          <p className="text-gray-600 text-center mb-4">
            Carga al menos un archivo Excel en el módulo "Análisis de Excel" para visualizar gráficos.
          </p>
          <div className="text-center">
            <button
              onClick={() => window.location.hash = '#excel'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Ir a Análisis de Excel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Preparar datos para gráficos
  const dataDistribucion = [
    { name: 'Exitosas', value: excelMetrics.exitosas, color: chartColors.success },
    { name: 'Fallidas', value: excelMetrics.fallidas, color: chartColors.error },
    { name: 'Sin identificar', value: excelMetrics.sinIdentificar, color: chartColors.warning }
  ].filter(item => item.value > 0);

  const dataOperadoras = Object.entries(excelMetrics.operadoras || {})
    .map(([key, metrics]) => ({
      name: metrics.nombre || key,
      tasa: parseFloat(metrics.tasaExito || 0),
      total: metrics.total || 0,
      exitosas: metrics.exitosas || 0
    }))
    .sort((a, b) => b.tasa - a.tasa)
    .slice(0, 10); // Top 10 operadoras

  const dataTemporal = Object.entries(excelMetrics.porFecha || {})
    .map(([fecha, metrics]) => ({
      fecha: fecha,
      llamadas: metrics.total || 0,
      exitosas: metrics.exitosas || 0,
      archivos: metrics.archivos || 0
    }))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .slice(-30); // Últimos 30 días

  // Tooltip personalizado
  // eslint-disable-next-line react/prop-types
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-900 mb-1">{label}</p>
          {/* eslint-disable-next-line react/prop-types */}
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            📊 Visualizaciones de Análisis
          </h1>
          <p className="text-gray-600">
            Gráficos interactivos de métricas consolidadas desde Firestore
          </p>
          {lastSync && (
            <p className="text-xs text-gray-500 mt-1">
              Última sincronización: {new Date(lastSync).toLocaleString('es-CL')}
            </p>
          )}
        </div>
        
        <button
          onClick={handleExportMetrics}
          disabled={!hasData || isSafeMode}
          className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          title={isSafeMode ? "Solo disponible en modo producción" : "Exportar métricas a Excel"}
        >
          <Download className="w-5 h-5 mr-2" />
          Exportar Métricas
        </button>
      </div>

      {/* Métricas Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Registros</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {excelMetrics.total.toLocaleString('es-CL')}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Tasa de Éxito</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {excelMetrics.tasaExito}%
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Operadoras</span>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {Object.keys(excelMetrics.operadoras || {}).length}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Análisis</span>
            <Calendar className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {excelMetrics.totalAnalyses || 0}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 1. Distribución General - PieChart */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4 text-center">
            Distribución General
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={dataDistribucion}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {dataDistribucion.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {dataDistribucion.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {item.value.toLocaleString('es-CL')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Tasa de Éxito por Operadora - BarChart */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 lg:col-span-2">
          <h3 className="font-bold text-lg text-gray-900 mb-4 text-center">
            Top 10 Operadoras por Tasa de Éxito
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dataOperadoras} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="name" width={120} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="tasa" fill={chartColors.primary} name="Tasa de Éxito (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Evolución Temporal - LineChart */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="font-bold text-lg text-gray-900 mb-4 text-center">
          Evolución Temporal (últimos 30 días)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dataTemporal}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="fecha"
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="llamadas"
              stroke={chartColors.info}
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Total Llamadas"
            />
            <Line
              type="monotone"
              dataKey="exitosas"
              stroke={chartColors.success}
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Exitosas"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Tip:</strong> Los gráficos se actualizan automáticamente cuando hay nuevos análisis en Firestore.
          Las métricas mostradas son calculadas con el algoritmo unificado de <code>metricsUtils.js</code>.
        </p>
      </div>
    </div>
  );
};

export default ExcelCharts;
