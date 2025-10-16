/**
 * dataNormalizer.js
 * Normalizador global de datos para toda la aplicación
 * 
 * FASE 3 - TAREA 1: Normalización Global de Datos
 * 
 * Objetivo:
 * Homogeneizar nombres de campos, estructuras y tipos de datos
 * para eliminar ambigüedades entre módulos.
 * 
 * Elimina inconsistencias como:
 * - operador / teleoperadora / operatorName
 * - beneficiario / nombre / usuario
 * - resultado / status / estadoLlamada
 * - telefono / fono / phone
 */

import logger from './logger.js';

/**
 * Limpia y normaliza números telefónicos
 * Elimina espacios, guiones, paréntesis y prefijos internacionales
 * 
 * @param {string} phone - Número telefónico sin normalizar
 * @returns {string} Número limpio (solo dígitos)
 */
export const cleanPhone = (phone = '') => {
  if (!phone || typeof phone !== 'string') return '';
  
  // Eliminar espacios, guiones, paréntesis, puntos
  let cleaned = phone.replace(/[\s\-().\[\]]/g, '');
  
  // Eliminar prefijos internacionales comunes (+56, 56, +569)
  cleaned = cleaned.replace(/^\+?56/, '');
  
  // Si tiene 9 dígitos y empieza con 9, es válido
  if (cleaned.length === 9 && cleaned.startsWith('9')) {
    return cleaned;
  }
  
  // Si tiene 8 dígitos, agregar 9 al inicio (formato chileno)
  if (cleaned.length === 8) {
    return '9' + cleaned;
  }
  
  return cleaned;
};

/**
 * Normaliza datos de operador/teleoperadora
 * Unifica: operatorId, operadorId, teleoperadoraId
 * Unifica: operatorName, operador, teleoperadora, name
 * 
 * @param {Object} raw - Objeto con datos de operador sin normalizar
 * @returns {Object} Objeto normalizado con id y name
 */
export const normalizeOperator = (raw = {}) => {
  if (!raw) return { id: '', name: 'Sin asignar' };
  
  const id = raw.operatorId || raw.operadorId || raw.teleoperadoraId || raw.id || '';
  const name = raw.operatorName || raw.operador || raw.teleoperadora || raw.name || 'Sin asignar';
  
  return {
    id: String(id).trim(),
    name: String(name).trim() || 'Sin asignar'
  };
};

/**
 * Normaliza datos de beneficiario
 * Unifica: beneficiaryId, beneficiarioId, userId, id
 * Unifica: beneficiario, nombre, usuario, name
 * Unifica: telefono, fono, phone, celular
 * 
 * @param {Object} raw - Objeto con datos de beneficiario sin normalizar
 * @returns {Object} Objeto normalizado con id, name, phone
 */
export const normalizeBeneficiary = (raw = {}) => {
  if (!raw) return { id: '', name: '', phone: '' };
  
  const id = raw.beneficiaryId || raw.beneficiarioId || raw.userId || raw.id || '';
  const name = raw.beneficiario || raw.nombre || raw.usuario || raw.name || '';
  const rawPhone = raw.telefono || raw.fono || raw.phone || raw.celular || '';
  
  return {
    id: String(id).trim(),
    name: String(name).trim(),
    phone: cleanPhone(rawPhone)
  };
};

/**
 * Normaliza resultado de llamada
 * Convierte variaciones a tres categorías estándar:
 * - 'exitosa': Llamada completada exitosamente
 * - 'fallida': Llamada fallida, no contestó, rechazada
 * - 'sin identificar': No clasificada o desconocida
 * 
 * @param {string} result - Resultado sin normalizar
 * @returns {string} Resultado normalizado
 */
export const normalizeCallResult = (result = '') => {
  if (!result || typeof result !== 'string') return 'sin identificar';
  
  const normalized = result.toLowerCase().trim();
  
  // Patrones de éxito
  const successPatterns = [
    /^exitos?a?s?$/,
    /completad[oa]/,
    /contact[oa]/,
    /^si$/,
    /^ok$/,
    /atendid[oa]/,
    /logr[oa]/
  ];
  
  // Patrones de falla
  const failurePatterns = [
    /fallid[oa]/,
    /no\s*contesta/,
    /no\s*contesto/,
    /rechaza/,
    /ocupa/,
    /apaga/,
    /no\s*disponible/,
    /fuera\s*de\s*servicio/,
    /no\s*responde/,
    /^no$/
  ];
  
  // Verificar éxito
  if (successPatterns.some(pattern => pattern.test(normalized))) {
    return 'exitosa';
  }
  
  // Verificar falla
  if (failurePatterns.some(pattern => pattern.test(normalized))) {
    return 'fallida';
  }
  
  // Sin identificar por defecto
  return 'sin identificar';
};

/**
 * Normaliza fecha a formato ISO string
 * Acepta: Date object, timestamp, string ISO, DD/MM/YYYY, etc.
 * 
 * @param {any} date - Fecha en cualquier formato
 * @returns {string} Fecha en formato ISO (YYYY-MM-DD)
 */
export const normalizeDate = (date) => {
  if (!date) return '';
  
  try {
    // Si ya es un Date válido
    if (date instanceof Date && !isNaN(date)) {
      return date.toISOString().split('T')[0];
    }
    
    // Si es un timestamp de Firestore
    if (date.seconds) {
      return new Date(date.seconds * 1000).toISOString().split('T')[0];
    }
    
    // Si es un string
    if (typeof date === 'string') {
      // Formato DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
        const [day, month, year] = date.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Formato ISO o parseable
      const parsed = new Date(date);
      if (!isNaN(parsed)) {
        return parsed.toISOString().split('T')[0];
      }
    }
    
    // Si es un número (timestamp)
    if (typeof date === 'number') {
      return new Date(date).toISOString().split('T')[0];
    }
    
    return '';
  } catch (error) {
    logger.error('[DataNormalizer] Error normalizando fecha', { date, error: error.message });
    return '';
  }
};

/**
 * Normaliza un registro completo de seguimiento/llamada
 * Aplica todas las normalizaciones a un objeto completo
 * 
 * @param {Object} record - Registro sin normalizar
 * @returns {Object} Registro completamente normalizado
 */
export const normalizeRecord = (record = {}) => {
  if (!record || typeof record !== 'object') return null;
  
  const operator = normalizeOperator({
    operatorId: record.operatorId || record.operadorId || record.teleoperadoraId,
    operatorName: record.operatorName || record.operador || record.teleoperadora
  });
  
  const beneficiary = normalizeBeneficiary({
    beneficiaryId: record.beneficiaryId || record.beneficiarioId || record.id,
    beneficiario: record.beneficiario || record.nombre || record.usuario,
    telefono: record.telefono || record.fono || record.phone
  });
  
  return {
    // IDs
    id: record.id || record._id || '',
    
    // Operadora normalizada
    operatorId: operator.id,
    operatorName: operator.name,
    
    // Beneficiario normalizado
    beneficiaryId: beneficiary.id,
    beneficiaryName: beneficiary.name,
    phone: beneficiary.phone,
    
    // Resultado normalizado
    resultado: normalizeCallResult(record.resultado || record.status || record.estadoLlamada),
    
    // Fechas normalizadas
    fecha: normalizeDate(record.fecha || record.date || record.fechaLlamada),
    createdAt: normalizeDate(record.createdAt || record.fecha_creacion),
    updatedAt: normalizeDate(record.updatedAt || record.fecha_actualizacion),
    
    // Campos adicionales (preservar si existen)
    observaciones: record.observaciones || record.comentarios || record.notas || '',
    duracion: record.duracion || record.duration || 0,
    tipo: record.tipo || record.type || 'llamada',
    
    // Metadata original (por si necesitamos referencia)
    _original: record
  };
};

/**
 * Normaliza un array completo de registros
 * Aplica normalizeRecord a cada elemento y filtra nulos
 * 
 * @param {Array} records - Array de registros sin normalizar
 * @returns {Array} Array de registros normalizados
 */
export const normalizeRecords = (records = []) => {
  if (!Array.isArray(records)) return [];
  
  const normalized = records
    .map(record => normalizeRecord(record))
    .filter(record => record !== null);
  
  logger.info('[DataNormalizer] Registros normalizados', {
    original: records.length,
    normalized: normalized.length
  });
  
  return normalized;
};

/**
 * Valida si un registro está correctamente normalizado
 * Verifica que tenga los campos mínimos requeridos
 * 
 * @param {Object} record - Registro a validar
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateNormalizedRecord = (record) => {
  const errors = [];
  
  if (!record) {
    return { valid: false, errors: ['Registro nulo o indefinido'] };
  }
  
  // Validar campos requeridos
  if (!record.operatorName || record.operatorName === 'Sin asignar') {
    errors.push('Operadora no definida');
  }
  
  if (!record.beneficiaryName) {
    errors.push('Beneficiario no definido');
  }
  
  if (!record.phone) {
    errors.push('Teléfono no definido');
  }
  
  if (!['exitosa', 'fallida', 'sin identificar'].includes(record.resultado)) {
    errors.push(`Resultado inválido: ${record.resultado}`);
  }
  
  if (!record.fecha) {
    errors.push('Fecha no definida');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Agrupa registros por operadora
 * Útil para métricas por teleoperadora
 * 
 * @param {Array} records - Array de registros normalizados
 * @returns {Object} Objeto con operadoras como keys
 */
export const groupByOperator = (records = []) => {
  const grouped = {};
  
  records.forEach(record => {
    const operator = record.operatorName || 'Sin asignar';
    if (!grouped[operator]) {
      grouped[operator] = [];
    }
    grouped[operator].push(record);
  });
  
  return grouped;
};

/**
 * Agrupa registros por resultado
 * Útil para clasificación de llamadas
 * 
 * @param {Array} records - Array de registros normalizados
 * @returns {Object} { exitosas: [], fallidas: [], sinIdentificar: [] }
 */
export const groupByResult = (records = []) => {
  return {
    exitosas: records.filter(r => r.resultado === 'exitosa'),
    fallidas: records.filter(r => r.resultado === 'fallida'),
    sinIdentificar: records.filter(r => r.resultado === 'sin identificar')
  };
};

/**
 * Agrupa registros por fecha
 * Útil para análisis temporal
 * 
 * @param {Array} records - Array de registros normalizados
 * @returns {Object} Objeto con fechas como keys (YYYY-MM-DD)
 */
export const groupByDate = (records = []) => {
  const grouped = {};
  
  records.forEach(record => {
    const date = record.fecha || 'Sin fecha';
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(record);
  });
  
  return grouped;
};

// Exportación por defecto
export default {
  cleanPhone,
  normalizeOperator,
  normalizeBeneficiary,
  normalizeCallResult,
  normalizeDate,
  normalizeRecord,
  normalizeRecords,
  validateNormalizedRecord,
  groupByOperator,
  groupByResult,
  groupByDate
};
