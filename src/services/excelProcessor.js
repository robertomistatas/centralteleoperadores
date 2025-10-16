/**
 * excelProcessor.js
 * Servicio robusto para análisis de archivos Excel
 * 
 * Características:
 * - Lectura y normalización de Excel (XLSX, XLS, CSV)
 * - Detección automática de columnas
 * - Hash SHA-256 para idempotencia
 * - Limpieza y normalización de datos
 * - Sin escritura en Firestore (modo seguro)
 */

import * as XLSX from 'xlsx';
import logger from '../utils/logger';

/**
 * Mapeo de nombres de columnas comunes a nombres normalizados
 */
const COLUMN_MAPPINGS = {
  beneficiario: ['beneficiario', 'nombre', 'paciente', 'usuario', 'cliente', 'persona'],
  telefono: ['telefono', 'teléfono', 'fono', 'tel', 'celular', 'móvil', 'movil', 'phone'],
  fecha: ['fecha', 'date', 'dia', 'día', 'timestamp', 'fecha llamada', 'fecha_llamada'],
  resultado: ['resultado', 'result', 'estado', 'status', 'respuesta', 'outcome'],
  duracion: ['duracion', 'duración', 'tiempo', 'duration', 'segundos', 'minutos'],
  operadora: ['operadora', 'operador', 'teleoperadora', 'agente', 'agent', 'usuario'],
  observaciones: ['observaciones', 'notas', 'comentarios', 'obs', 'notes', 'comments'],
  comuna: ['comuna', 'city', 'ciudad', 'localidad', 'municipio']
};

/**
 * Resultados considerados exitosos
 */
const SUCCESS_KEYWORDS = [
  'exitosa', 'éxito', 'exito', 'contactado', 'atendido', 'completado',
  'respondió', 'respondio', 'success', 'answered', 'si', 'sí'
];

/**
 * Resultados considerados fallidos
 */
const FAILED_KEYWORDS = [
  'no contesta', 'no contestó', 'no contesto', 'no responde',
  'fallida', 'failed', 'ocupado', 'busy', 'fuera de servicio',
  'apagado', 'no disponible', 'rechazado', 'no'
];

/**
 * Genera hash SHA-256 de un archivo para idempotencia
 * @param {File} file - Archivo a hashear
 * @returns {Promise<string>} - Hash en formato hexadecimal
 */
export async function generateFileHash(file) {
  try {
    logger.info('[excelProcessor] Generando hash del archivo', { filename: file.name });
    
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    logger.info('[excelProcessor] Hash generado exitosamente', { hash: hashHex.substring(0, 16) + '...' });
    return hashHex;
  } catch (error) {
    logger.error('[excelProcessor] Error al generar hash', { error: error.message });
    throw new Error(`Error al generar hash: ${error.message}`);
  }
}

/**
 * Detecta el nombre normalizado de una columna
 * @param {string} columnName - Nombre original de la columna
 * @returns {string|null} - Nombre normalizado o null si no se reconoce
 */
function detectColumnType(columnName) {
  const normalized = columnName.toLowerCase().trim();
  
  for (const [type, variants] of Object.entries(COLUMN_MAPPINGS)) {
    if (variants.some(variant => normalized.includes(variant))) {
      return type;
    }
  }
  
  return null;
}

/**
 * Normaliza un número de teléfono chileno
 * @param {string|number} phone - Teléfono a normalizar
 * @returns {string} - Teléfono normalizado
 */
function normalizePhone(phone) {
  if (!phone) return '';
  
  // Convertir a string y limpiar
  let cleaned = String(phone)
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/\+56/g, '');
  
  // Si empieza con 9 y tiene 9 dígitos, es válido
  if (cleaned.match(/^9\d{8}$/)) {
    return cleaned;
  }
  
  // Si tiene 8 dígitos, agregar 9 al inicio (números fijos)
  if (cleaned.match(/^\d{8}$/)) {
    return cleaned;
  }
  
  return cleaned;
}

/**
 * Convierte una fecha de Excel a formato ISO (YYYY-MM-DD)
 * @param {any} dateValue - Valor de fecha (serial, string, Date)
 * @returns {string} - Fecha en formato ISO
 */
function normalizeDate(dateValue) {
  if (!dateValue) return '';
  
  try {
    let date;
    
    // Si es formato chileno DD-MM-YYYY o DD/MM/YYYY
    if (typeof dateValue === 'string' && /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(dateValue)) {
      const parts = dateValue.split(/[-/]/);
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
      const year = parseInt(parts[2]);
      date = new Date(year, month, day);
    }
    // Si es número (Excel serial date)
    else if (typeof dateValue === 'number') {
      date = new Date((dateValue - 25569) * 86400 * 1000);
    }
    // Intentar parsear como fecha estándar
    else {
      date = new Date(dateValue);
    }
    
    if (date && !isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return String(dateValue);
  } catch (error) {
    logger.warn('[excelProcessor] Error normalizando fecha', { dateValue, error: error.message });
    return String(dateValue);
  }
}

/**
 * Clasifica un resultado como exitoso, fallido o sin identificar
 * @param {string} resultado - Texto del resultado
 * @returns {string} - 'exitosa', 'fallida', o 'sin_identificar'
 */
function classifyResult(resultado) {
  if (!resultado) return 'sin_identificar';
  
  const normalized = resultado.toLowerCase().trim();
  
  if (SUCCESS_KEYWORDS.some(keyword => normalized.includes(keyword))) {
    return 'exitosa';
  }
  
  if (FAILED_KEYWORDS.some(keyword => normalized.includes(keyword))) {
    return 'fallida';
  }
  
  return 'sin_identificar';
}

/**
 * Lee y normaliza un archivo Excel
 * @param {File} file - Archivo Excel a procesar
 * @returns {Promise<Object>} - { data, resumen, columnMapping, warnings }
 */
export async function parseAndNormalizeExcel(file) {
  logger.info('[excelProcessor] Iniciando análisis de Excel', {
    filename: file.name,
    size: `${(file.size / 1024).toFixed(2)} KB`,
    type: file.type
  });
  
  try {
    // Leer archivo
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { 
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    // Tomar la primera hoja
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    logger.info('[excelProcessor] Hoja leída', { sheetName: firstSheetName });
    
    // Convertir a JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false,
      defval: '',
      blankrows: false
    });
    
    if (!rawData || rawData.length === 0) {
      throw new Error('El archivo está vacío o no tiene datos válidos');
    }
    
    logger.info('[excelProcessor] Filas leídas', { count: rawData.length });
    
    // Detectar columnas
    const firstRow = rawData[0];
    const originalColumns = Object.keys(firstRow);
    const columnMapping = {};
    const unmappedColumns = [];
    
    originalColumns.forEach(col => {
      const detected = detectColumnType(col);
      if (detected) {
        columnMapping[col] = detected;
      } else {
        unmappedColumns.push(col);
      }
    });
    
    logger.info('[excelProcessor] Columnas detectadas', { 
      mapped: Object.keys(columnMapping).length,
      unmapped: unmappedColumns.length,
      columnMapping
    });
    
    // Normalizar datos
    const normalizedData = rawData.map((row, index) => {
      const normalized = {
        _rowIndex: index + 2, // Excel rows start at 1, header is row 1
        _original: { ...row }
      };
      
      // Mapear columnas detectadas
      for (const [originalCol, normalizedCol] of Object.entries(columnMapping)) {
        let value = row[originalCol];
        
        // Aplicar normalización específica
        switch (normalizedCol) {
          case 'telefono':
            normalized[normalizedCol] = normalizePhone(value);
            break;
          case 'fecha':
            normalized[normalizedCol] = normalizeDate(value);
            break;
          case 'duracion':
            normalized[normalizedCol] = value ? parseInt(value) || 0 : 0;
            break;
          default:
            normalized[normalizedCol] = value ? String(value).trim() : '';
        }
      }
      
      // Clasificar resultado si existe
      if (normalized.resultado) {
        normalized._clasificacion = classifyResult(normalized.resultado);
      } else {
        normalized._clasificacion = 'sin_identificar';
      }
      
      return normalized;
    });
    
    // Calcular resumen
    const resumen = {
      total: normalizedData.length,
      exitosas: normalizedData.filter(r => r._clasificacion === 'exitosa').length,
      fallidas: normalizedData.filter(r => r._clasificacion === 'fallida').length,
      sinIdentificar: normalizedData.filter(r => r._clasificacion === 'sin_identificar').length,
      conTelefono: normalizedData.filter(r => r.telefono && r.telefono.length > 0).length,
      conFecha: normalizedData.filter(r => r.fecha && r.fecha.length > 0).length,
      conBeneficiario: normalizedData.filter(r => r.beneficiario && r.beneficiario.length > 0).length
    };
    
    // Generar warnings
    const warnings = [];
    
    if (unmappedColumns.length > 0) {
      warnings.push({
        type: 'unmapped_columns',
        message: `${unmappedColumns.length} columnas no fueron reconocidas`,
        details: unmappedColumns
      });
    }
    
    if (resumen.sinIdentificar > resumen.total * 0.5) {
      warnings.push({
        type: 'high_unidentified',
        message: `${Math.round((resumen.sinIdentificar / resumen.total) * 100)}% de registros sin clasificar`,
        details: 'Revise el formato de la columna "resultado"'
      });
    }
    
    if (resumen.conTelefono < resumen.total * 0.8) {
      warnings.push({
        type: 'missing_phones',
        message: `${resumen.total - resumen.conTelefono} registros sin teléfono`,
        details: 'Algunos registros no tienen número de teléfono válido'
      });
    }
    
    logger.info('[excelProcessor] Análisis completado', { resumen, warnings: warnings.length });
    
    return {
      data: normalizedData,
      resumen,
      columnMapping,
      warnings,
      metadata: {
        filename: file.name,
        filesize: file.size,
        processedAt: new Date().toISOString(),
        sheetName: firstSheetName,
        originalColumns
      }
    };
    
  } catch (error) {
    logger.error('[excelProcessor] Error al procesar Excel', { 
      filename: file.name,
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Error al procesar archivo: ${error.message}`);
  }
}

/**
 * Valida que un archivo sea un formato soportado
 * @param {File} file - Archivo a validar
 * @returns {Object} - { valid, error }
 */
export function validateExcelFile(file) {
  const validExtensions = ['.xlsx', '.xls', '.csv'];
  
  const filename = file.name.toLowerCase();
  const hasValidExtension = validExtensions.some(ext => filename.endsWith(ext));
  
  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'Formato de archivo no válido. Use .xlsx, .xls o .csv'
    };
  }
  
  if (file.size === 0) {
    return {
      valid: false,
      error: 'El archivo está vacío'
    };
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10 MB
    return {
      valid: false,
      error: 'El archivo es demasiado grande (máximo 10 MB)'
    };
  }
  
  return { valid: true };
}

export default {
  parseAndNormalizeExcel,
  generateFileHash,
  validateExcelFile
};
