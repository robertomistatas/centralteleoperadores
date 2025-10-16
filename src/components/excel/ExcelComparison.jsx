/**
 * ExcelComparison.jsx
 * Componente para comparar dos análisis de Excel
 * 
 * FASE 2 - TAREA 7: Comparador de análisis
 * 
 * Características:
 * - Selección de dos análisis desde Firestore
 * - Comparación de métricas clave
 * - Visualización de diferencias
 * - Gráfico comparativo con BarChart dual
 * - Exportación del resultado comparativo
 */

import { useState, useEffect } from 'react';
import { GitCompare, TrendingUp, TrendingDown, Minus, Download, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useMetricsStore from '../../stores/useMetricsStore';
import { chartColors } from '../../utils/chartUtils';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';
import logger from '../../utils/logger';

const ExcelComparison = () => {
  const allAnalyses = useMetricsStore(state => state.allAnalyses);
  const [analysis1, setAnalysis1] = useState(null);
  const [analysis2, setAnalysis2] = useState(null);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    logger.info('[ExcelComparison] Componente montado', {
      analysesCount: allAnalyses?.length || 0
    });
  }, []);

  useEffect(() => {
    if (analysis1 && analysis2) {
      calculateComparison();
    } else {
      setComparison(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis1, analysis2]);

  const calculateComparison = () => {
    logger.info('[ExcelComparison] Calculando comparación', {
      analysis1: analysis1.fileName,
      analysis2: analysis2.fileName
    });

    const comp = {
      // Totales
      total: {
        value1: analysis1.totalRows || 0,
        value2: analysis2.totalRows || 0,
        diff: (analysis2.totalRows || 0) - (analysis1.totalRows || 0),
        percentChange: calculatePercentChange(analysis1.totalRows, analysis2.totalRows)
      },
      // Exitosas
      exitosas: {
        value1: analysis1.exitosas || 0,
        value2: analysis2.exitosas || 0,
        diff: (analysis2.exitosas || 0) - (analysis1.exitosas || 0),
        percentChange: calculatePercentChange(analysis1.exitosas, analysis2.exitosas)
      },
      // Fallidas
      fallidas: {
        value1: analysis1.fallidas || 0,
        value2: analysis2.fallidas || 0,
        diff: (analysis2.fallidas || 0) - (analysis1.fallidas || 0),
        percentChange: calculatePercentChange(analysis1.fallidas, analysis2.fallidas)
      },
      // Tasa de éxito
      tasaExito: {
        value1: analysis1.totalRows > 0 ? ((analysis1.exitosas / analysis1.totalRows) * 100).toFixed(1) : 0,
        value2: analysis2.totalRows > 0 ? ((analysis2.exitosas / analysis2.totalRows) * 100).toFixed(1) : 0
      },
      // Operadoras
      operadoras: compareOperators(analysis1.metricsByOperator, analysis2.metricsByOperator)
    };

    comp.tasaExito.diff = (parseFloat(comp.tasaExito.value2) - parseFloat(comp.tasaExito.value1)).toFixed(1);

    setComparison(comp);
    logger.info('[ExcelComparison] Comparación calculada', comp);
  };

  const calculatePercentChange = (oldValue, newValue) => {
    if (!oldValue || oldValue === 0) return newValue > 0 ? 100 : 0;
    return (((newValue - oldValue) / oldValue) * 100).toFixed(1);
  };

  const compareOperators = (ops1 = {}, ops2 = {}) => {
    const allOperators = new Set([...Object.keys(ops1), ...Object.keys(ops2)]);
    
    return Array.from(allOperators).map(op => {
      const op1 = ops1[op] || { total: 0, exitosas: 0 };
      const op2 = ops2[op] || { total: 0, exitosas: 0 };
      
      const tasa1 = op1.total > 0 ? ((op1.exitosas / op1.total) * 100).toFixed(1) : 0;
      const tasa2 = op2.total > 0 ? ((op2.exitosas / op2.total) * 100).toFixed(1) : 0;

      return {
        nombre: op,
        tasa1: parseFloat(tasa1),
        tasa2: parseFloat(tasa2),
        diff: (parseFloat(tasa2) - parseFloat(tasa1)).toFixed(1)
      };
    }).filter(op => op.tasa1 > 0 || op.tasa2 > 0);
  };

  const handleExportComparison = (format = 'excel') => {
    if (!comparison) return;

    const exportData = [
      {
        Métrica: 'Total Registros',
        [analysis1.fileName]: comparison.total.value1,
        [analysis2.fileName]: comparison.total.value2,
        Diferencia: comparison.total.diff,
        'Cambio %': `${comparison.total.percentChange}%`
      },
      {
        Métrica: 'Exitosas',
        [analysis1.fileName]: comparison.exitosas.value1,
        [analysis2.fileName]: comparison.exitosas.value2,
        Diferencia: comparison.exitosas.diff,
        'Cambio %': `${comparison.exitosas.percentChange}%`
      },
      {
        Métrica: 'Fallidas',
        [analysis1.fileName]: comparison.fallidas.value1,
        [analysis2.fileName]: comparison.fallidas.value2,
        Diferencia: comparison.fallidas.diff,
        'Cambio %': `${comparison.fallidas.percentChange}%`
      },
      {
        Métrica: 'Tasa de Éxito',
        [analysis1.fileName]: `${comparison.tasaExito.value1}%`,
        [analysis2.fileName]: `${comparison.tasaExito.value2}%`,
        Diferencia: `${comparison.tasaExito.diff}%`,
        'Cambio %': '-'
      }
    ];

    const filename = `comparacion_${analysis1.id}_vs_${analysis2.id}`;

    if (format === 'excel') {
      exportToExcel(exportData, `${filename}.xlsx`);
    } else {
      exportToCSV(exportData, `${filename}.csv`);
    }

    logger.audit('Comparison exported', {
      analysis1: analysis1.id,
      analysis2: analysis2.id,
      format,
      filename
    });
  };

  const renderTrendIcon = (value) => {
    if (value > 0) return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (value < 0) return <TrendingDown className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  // Sin análisis disponibles
  if (!allAnalyses || allAnalyses.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-8">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
            No hay análisis disponibles
          </h3>
          <p className="text-gray-600 text-center">
            Necesitas al menos 2 análisis guardados para usar el comparador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <GitCompare className="w-7 h-7 mr-2 text-blue-600" />
          Comparador de Análisis
        </h1>
        <p className="text-gray-600">
          Selecciona dos análisis para comparar sus métricas y resultados
        </p>
      </div>

      {/* Selectores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Análisis 1 (Base)
          </label>
          <select
            value={analysis1?.id || ''}
            onChange={(e) => {
              const selected = allAnalyses.find(a => a.id === e.target.value);
              setAnalysis1(selected);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar análisis...</option>
            {allAnalyses.map(analysis => (
              <option key={analysis.id} value={analysis.id}>
                {analysis.fileName} ({analysis.totalRows} registros) - {new Date(analysis.processedAt).toLocaleDateString('es-CL')}
              </option>
            ))}
          </select>
          {analysis1 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Total:</strong> {analysis1.totalRows}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Tasa Éxito:</strong> {((analysis1.exitosas / analysis1.totalRows) * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Análisis 2 (Comparar)
          </label>
          <select
            value={analysis2?.id || ''}
            onChange={(e) => {
              const selected = allAnalyses.find(a => a.id === e.target.value);
              setAnalysis2(selected);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar análisis...</option>
            {allAnalyses.filter(a => a.id !== analysis1?.id).map(analysis => (
              <option key={analysis.id} value={analysis.id}>
                {analysis.fileName} ({analysis.totalRows} registros) - {new Date(analysis.processedAt).toLocaleDateString('es-CL')}
              </option>
            ))}
          </select>
          {analysis2 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Total:</strong> {analysis2.totalRows}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Tasa Éxito:</strong> {((analysis2.exitosas / analysis2.totalRows) * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Resultados de Comparación */}
      {comparison && (
        <>
          {/* Tabla Comparativa */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600">
              <h3 className="font-bold text-lg text-white">Comparación de Métricas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Métrica</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Análisis 1</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Análisis 2</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Diferencia</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Cambio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Total */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Total Registros</td>
                    <td className="px-6 py-4 text-right text-gray-700">{comparison.total.value1.toLocaleString('es-CL')}</td>
                    <td className="px-6 py-4 text-right text-gray-700">{comparison.total.value2.toLocaleString('es-CL')}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {renderTrendIcon(comparison.total.diff)}
                        <span className={comparison.total.diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {comparison.total.diff > 0 ? '+' : ''}{comparison.total.diff}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold">
                      {comparison.total.percentChange > 0 ? '+' : ''}{comparison.total.percentChange}%
                    </td>
                  </tr>

                  {/* Exitosas */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Exitosas</td>
                    <td className="px-6 py-4 text-right text-gray-700">{comparison.exitosas.value1.toLocaleString('es-CL')}</td>
                    <td className="px-6 py-4 text-right text-gray-700">{comparison.exitosas.value2.toLocaleString('es-CL')}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {renderTrendIcon(comparison.exitosas.diff)}
                        <span className={comparison.exitosas.diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {comparison.exitosas.diff > 0 ? '+' : ''}{comparison.exitosas.diff}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold">
                      {comparison.exitosas.percentChange > 0 ? '+' : ''}{comparison.exitosas.percentChange}%
                    </td>
                  </tr>

                  {/* Fallidas */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Fallidas</td>
                    <td className="px-6 py-4 text-right text-gray-700">{comparison.fallidas.value1.toLocaleString('es-CL')}</td>
                    <td className="px-6 py-4 text-right text-gray-700">{comparison.fallidas.value2.toLocaleString('es-CL')}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {renderTrendIcon(comparison.fallidas.diff)}
                        <span className={comparison.fallidas.diff >= 0 ? 'text-red-600' : 'text-green-600'}>
                          {comparison.fallidas.diff > 0 ? '+' : ''}{comparison.fallidas.diff}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold">
                      {comparison.fallidas.percentChange > 0 ? '+' : ''}{comparison.fallidas.percentChange}%
                    </td>
                  </tr>

                  {/* Tasa de Éxito */}
                  <tr className="hover:bg-gray-50 bg-blue-50">
                    <td className="px-6 py-4 font-bold text-gray-900">Tasa de Éxito</td>
                    <td className="px-6 py-4 text-right font-semibold text-blue-600">{comparison.tasaExito.value1}%</td>
                    <td className="px-6 py-4 text-right font-semibold text-blue-600">{comparison.tasaExito.value2}%</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {renderTrendIcon(parseFloat(comparison.tasaExito.diff))}
                        <span className={parseFloat(comparison.tasaExito.diff) >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                          {parseFloat(comparison.tasaExito.diff) > 0 ? '+' : ''}{comparison.tasaExito.diff}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Gráfico Comparativo de Operadoras */}
          {comparison.operadoras && comparison.operadoras.length > 0 && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
              <h3 className="font-bold text-lg text-gray-900 mb-4 text-center">
                Comparación por Operadora
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={comparison.operadoras.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tasa1" fill={chartColors.primary} name="Análisis 1 (%)" />
                  <Bar dataKey="tasa2" fill={chartColors.success} name="Análisis 2 (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Botones de Exportación */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => handleExportComparison('excel')}
              className="flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md"
            >
              <Download className="w-5 h-5 mr-2" />
              Exportar a Excel
            </button>
            <button
              onClick={() => handleExportComparison('csv')}
              className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md"
            >
              <Download className="w-5 h-5 mr-2" />
              Exportar a CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ExcelComparison;
