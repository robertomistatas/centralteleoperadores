/**
 * exportUtils.js
 * Utilidades para exportación de datos a Excel y CSV
 * 
 * FASE 2 - TAREA 7: Sistema de exportación avanzada
 * 
 * Características:
 * - Exportación a formato Excel (.xlsx) usando SheetJS
 * - Exportación a formato CSV
 * - Formateo automático de datos
 * - Soporte para múltiples hojas (sheets)
 * - Validación de SafeMode
 */

import * as XLSX from 'xlsx';
import logger from './logger';

/**
 * Exporta datos a archivo Excel
 * @param {Array|Object} data - Datos a exportar (array de objetos o objeto con múltiples sheets)
 * @param {string} filename - Nombre del archivo (con extensión .xlsx)
 * @param {Object} options - Opciones adicionales
 */
export const exportToExcel = (data, filename = 'export.xlsx', options = {}) => {
  try {
    logger.info('[ExportUtils] Iniciando exportación a Excel', { filename, dataLength: Array.isArray(data) ? data.length : 'multiple sheets' });

    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new();

    // Si data es un objeto con múltiples hojas
    if (!Array.isArray(data) && typeof data === 'object' && !data.length) {
      Object.entries(data).forEach(([sheetName, sheetData]) => {
        const worksheet = XLSX.utils.json_to_sheet(sheetData);
        
        // Aplicar formato de columnas si se especifica
        if (options.columnWidths) {
          worksheet['!cols'] = options.columnWidths;
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });
    } else {
      // Datos simples en una sola hoja
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // Aplicar formato de columnas
      if (options.columnWidths) {
        worksheet['!cols'] = options.columnWidths;
      }

      const sheetName = options.sheetName || 'Datos';
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    // Generar y descargar archivo
    XLSX.writeFile(workbook, filename);

    logger.audit('Excel file exported', {
      filename,
      recordCount: Array.isArray(data) ? data.length : 'multiple sheets',
      timestamp: new Date().toISOString()
    });

    return { success: true, filename };
  } catch (error) {
    logger.error('[ExportUtils] Error al exportar a Excel', {
      error: error.message,
      filename
    });
    throw error;
  }
};

/**
 * Exporta datos a archivo CSV
 * @param {Array} data - Array de objetos a exportar
 * @param {string} filename - Nombre del archivo (con extensión .csv)
 * @param {Object} options - Opciones adicionales
 */
export const exportToCSV = (data, filename = 'export.csv', options = {}) => {
  try {
    logger.info('[ExportUtils] Iniciando exportación a CSV', { filename, dataLength: data.length });

    // Configuración
    const separator = options.separator || ';';
    const includeHeaders = options.includeHeaders !== false;

    // Obtener headers
    const headers = Object.keys(data[0] || {});

    // Construir CSV
    let csvContent = '';

    // Agregar headers
    if (includeHeaders) {
      csvContent += headers.join(separator) + '\n';
    }

    // Agregar filas
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        
        // Manejar valores nulos/undefined
        if (value === null || value === undefined) return '';
        
        // Escapar comillas y separadores
        const stringValue = String(value);
        if (stringValue.includes(separator) || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      });

      csvContent += values.join(separator) + '\n';
    });

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logger.audit('CSV file exported', {
      filename,
      recordCount: data.length,
      timestamp: new Date().toISOString()
    });

    return { success: true, filename };
  } catch (error) {
    logger.error('[ExportUtils] Error al exportar a CSV', {
      error: error.message,
      filename
    });
    throw error;
  }
};

/**
 * Exporta comparación de dos análisis
 * @param {Object} analysis1 - Primer análisis
 * @param {Object} analysis2 - Segundo análisis
 * @param {string} filename - Nombre del archivo
 * @param {string} format - Formato ('excel' o 'csv')
 */
export const exportComparison = (analysis1, analysis2, filename, format = 'excel') => {
  try {
    logger.info('[ExportUtils] Exportando comparación', {
      analysis1: analysis1.fileName,
      analysis2: analysis2.fileName,
      format
    });

    // Calcular métricas de comparación
    const comparison = {
      resumen: [
        {
          Métrica: 'Total Registros',
          'Análisis 1': analysis1.totalRows || 0,
          'Análisis 2': analysis2.totalRows || 0,
          Diferencia: (analysis2.totalRows || 0) - (analysis1.totalRows || 0)
        },
        {
          Métrica: 'Exitosas',
          'Análisis 1': analysis1.exitosas || 0,
          'Análisis 2': analysis2.exitosas || 0,
          Diferencia: (analysis2.exitosas || 0) - (analysis1.exitosas || 0)
        },
        {
          Métrica: 'Fallidas',
          'Análisis 1': analysis1.fallidas || 0,
          'Análisis 2': analysis2.fallidas || 0,
          Diferencia: (analysis2.fallidas || 0) - (analysis1.fallidas || 0)
        },
        {
          Métrica: 'Tasa de Éxito (%)',
          'Análisis 1': analysis1.totalRows > 0 ? ((analysis1.exitosas / analysis1.totalRows) * 100).toFixed(2) : 0,
          'Análisis 2': analysis2.totalRows > 0 ? ((analysis2.exitosas / analysis2.totalRows) * 100).toFixed(2) : 0,
          Diferencia: '-'
        }
      ],
      operadoras: compareOperators(analysis1.metricsByOperator, analysis2.metricsByOperator),
      metadata: [
        {
          Campo: 'Archivo 1',
          Valor: analysis1.fileName
        },
        {
          Campo: 'Archivo 2',
          Valor: analysis2.fileName
        },
        {
          Campo: 'Fecha Análisis 1',
          Valor: new Date(analysis1.processedAt).toLocaleString('es-CL')
        },
        {
          Campo: 'Fecha Análisis 2',
          Valor: new Date(analysis2.processedAt).toLocaleString('es-CL')
        },
        {
          Campo: 'Fecha Comparación',
          Valor: new Date().toLocaleString('es-CL')
        }
      ]
    };

    if (format === 'excel') {
      // Exportar con múltiples hojas
      exportToExcel(comparison, filename, {
        columnWidths: [
          { wch: 20 }, // Columna A
          { wch: 15 }, // Columna B
          { wch: 15 }, // Columna C
          { wch: 12 }  // Columna D
        ]
      });
    } else {
      // Para CSV exportar solo el resumen
      exportToCSV(comparison.resumen, filename);
    }

    return { success: true, filename };
  } catch (error) {
    logger.error('[ExportUtils] Error al exportar comparación', {
      error: error.message,
      filename
    });
    throw error;
  }
};

/**
 * Compara operadoras entre dos análisis
 * @private
 */
const compareOperators = (ops1 = {}, ops2 = {}) => {
  const allOperators = new Set([...Object.keys(ops1), ...Object.keys(ops2)]);
  
  return Array.from(allOperators).map(op => {
    const op1 = ops1[op] || { total: 0, exitosas: 0 };
    const op2 = ops2[op] || { total: 0, exitosas: 0 };
    
    const tasa1 = op1.total > 0 ? ((op1.exitosas / op1.total) * 100).toFixed(2) : 0;
    const tasa2 = op2.total > 0 ? ((op2.exitosas / op2.total) * 100).toFixed(2) : 0;

    return {
      Operadora: op,
      'Total 1': op1.total,
      'Exitosas 1': op1.exitosas,
      'Tasa 1 (%)': tasa1,
      'Total 2': op2.total,
      'Exitosas 2': op2.exitosas,
      'Tasa 2 (%)': tasa2,
      'Diferencia Tasa (%)': (parseFloat(tasa2) - parseFloat(tasa1)).toFixed(2)
    };
  });
};

/**
 * Exporta análisis completo de Excel con todas las filas procesadas
 * @param {Object} analysisData - Datos completos del análisis
 * @param {string} filename - Nombre del archivo
 * @param {boolean} includeRaw - Incluir datos crudos
 */
export const exportFullAnalysis = (analysisData, filename, includeRaw = false) => {
  try {
    logger.info('[ExportUtils] Exportando análisis completo', {
      filename,
      totalRows: analysisData.totalRows
    });

    const sheets = {
      'Resumen': [
        { Campo: 'Nombre de Archivo', Valor: analysisData.fileName },
        { Campo: 'Total Registros', Valor: analysisData.totalRows },
        { Campo: 'Exitosas', Valor: analysisData.exitosas },
        { Campo: 'Fallidas', Valor: analysisData.fallidas },
        { Campo: 'Sin Identificar', Valor: analysisData.sinIdentificar },
        { Campo: 'Tasa de Éxito (%)', Valor: ((analysisData.exitosas / analysisData.totalRows) * 100).toFixed(2) },
        { Campo: 'Fecha de Procesamiento', Valor: new Date(analysisData.processedAt).toLocaleString('es-CL') },
        { Campo: 'Hash del Archivo', Valor: analysisData.fileHash }
      ],
      'Operadoras': formatOperatorsForExport(analysisData.metricsByOperator),
      'Datos Procesados': analysisData.fullData || []
    };

    // Incluir datos crudos si se solicita
    if (includeRaw && analysisData.rawData) {
      sheets['Datos Crudos'] = analysisData.rawData;
    }

    exportToExcel(sheets, filename, {
      columnWidths: [
        { wch: 25 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 }
      ]
    });

    logger.audit('Full analysis exported', {
      filename,
      totalRows: analysisData.totalRows,
      includeRaw,
      timestamp: new Date().toISOString()
    });

    return { success: true, filename };
  } catch (error) {
    logger.error('[ExportUtils] Error al exportar análisis completo', {
      error: error.message,
      filename
    });
    throw error;
  }
};

/**
 * Formatea métricas de operadoras para exportación
 * @private
 */
const formatOperatorsForExport = (metricsByOperator = {}) => {
  return Object.entries(metricsByOperator).map(([operadora, metrics]) => ({
    Operadora: operadora,
    'Total Llamadas': metrics.total || 0,
    'Llamadas Exitosas': metrics.exitosas || 0,
    'Llamadas Fallidas': metrics.fallidas || 0,
    'Tasa de Éxito (%)': metrics.total > 0 ? ((metrics.exitosas / metrics.total) * 100).toFixed(2) : 0
  })).sort((a, b) => b['Total Llamadas'] - a['Total Llamadas']);
};

/**
 * Valida si la exportación está permitida (SafeMode)
 * @param {boolean} isSafeMode - Estado del modo seguro
 * @returns {Object} - { allowed: boolean, message: string }
 */
export const validateExport = (isSafeMode) => {
  if (isSafeMode) {
    return {
      allowed: false,
      message: 'La exportación está deshabilitada en Modo Seguro. Cambia a Modo Producción para exportar datos.'
    };
  }

  return {
    allowed: true,
    message: 'Exportación permitida'
  };
};

/**
 * Exporta métricas de gráficos
 * @param {Object} metricsData - Datos de métricas desde useMetricsStore
 * @param {string} filename - Nombre del archivo
 */
export const exportChartMetrics = (metricsData, filename = 'metricas_excel.xlsx') => {
  try {
    logger.info('[ExportUtils] Exportando métricas de gráficos', { filename });

    const sheets = {
      'Métricas Generales': [
        { Métrica: 'Total Registros', Valor: metricsData.total || 0 },
        { Métrica: 'Llamadas Exitosas', Valor: metricsData.exitosas || 0 },
        { Métrica: 'Llamadas Fallidas', Valor: metricsData.fallidas || 0 },
        { Métrica: 'Sin Identificar', Valor: metricsData.sinIdentificar || 0 },
        { Métrica: 'Tasa de Éxito (%)', Valor: metricsData.tasaExito || 0 }
      ],
      'Por Operadora': formatOperatorsForExport(metricsData.operadoras),
      'Evolución Temporal': formatTemporalData(metricsData.porFecha)
    };

    exportToExcel(sheets, filename);

    logger.audit('Chart metrics exported', {
      filename,
      timestamp: new Date().toISOString()
    });

    return { success: true, filename };
  } catch (error) {
    logger.error('[ExportUtils] Error al exportar métricas', {
      error: error.message,
      filename
    });
    throw error;
  }
};

/**
 * Formatea datos temporales para exportación
 * @private
 */
const formatTemporalData = (porFecha = {}) => {
  return Object.entries(porFecha).map(([fecha, data]) => ({
    Fecha: fecha,
    'Total Llamadas': data.total || 0,
    'Llamadas Exitosas': data.exitosas || 0,
    'Llamadas Fallidas': data.fallidas || 0,
    'Tasa de Éxito (%)': data.total > 0 ? ((data.exitosas / data.total) * 100).toFixed(2) : 0
  })).sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));
};

export default {
  exportToExcel,
  exportToCSV,
  exportComparison,
  exportFullAnalysis,
  exportChartMetrics,
  validateExport
};
