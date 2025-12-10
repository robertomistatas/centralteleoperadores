/**
 * operatorHelpers.js
 * 
 * Utilidades para manejo robusto de nombres de teleoperadoras
 * Evita confusiones entre resultados de llamadas y nombres de operadoras
 * 
 * BUGFIX: Corrige el problema crítico donde "Llamado exitoso" aparecía
 * en el campo "Teleoperadora" del Historial de Seguimientos
 */

import { isValidOperatorName } from './validators';
import logger from './logger';

/**
 * Patrones que indican que un texto es un RESULTADO, no un nombre de operadora
 * Estos valores NUNCA deben aparecer como nombre de teleoperadora
 */
const RESULT_PATTERNS = [
  // Resultados exitosos
  /llamad[oa]\s+exitoso/i,
  /contactad[oa]/i,
  /atendid[oa]/i,
  /[eé]xito/i,
  /respond.*[oe]/i,
  /completad[oa]/i,
  
  // Resultados fallidos
  /no\s+contesta/i,
  /no\s+respond/i,
  /ocupado/i,
  /busy/i,
  /fuera\s+de\s+servicio/i,
  /apagado/i,
  /rechazado/i,
  /fallid[oa]/i,
  /failed/i,
  
  // Estados genéricos
  /sin\s+respuesta/i,
  /no\s+disponible/i,
  /buzón/i,
  /voicemail/i
];

/**
 * Verifica si un texto es un resultado de llamada, NO un nombre de operadora
 * @param {string} text - Texto a verificar
 * @returns {boolean} true si es un resultado, false si es un nombre válido
 */
export function isCallResult(text) {
  if (!text || typeof text !== 'string') return false;
  
  const trimmed = text.trim();
  
  // Verificar patrones de resultado
  return RESULT_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Extrae el nombre de operadora de un registro, con validaciones robustas
 * 
 * REGLA DE NEGOCIO:
 * 1. Buscar en campos específicos de operadora (operatorName, operador, teleoperadora)
 * 2. Validar que NO sea un resultado de llamada (usando isCallResult)
 * 3. Validar que sea un nombre válido (usando isValidOperatorName)
 * 4. Si no se encuentra, retornar 'No asignado'
 * 
 * @param {Object} record - Registro con datos potenciales de operadora
 * @param {Object} options - Opciones de extracción
 * @param {boolean} options.strictValidation - Si true, aplica todas las validaciones
 * @param {string} options.fallback - Valor por defecto si no se encuentra
 * @returns {string} Nombre de operadora validado o fallback
 */
export function getOperatorNameFromRecord(record = {}, options = {}) {
  const {
    strictValidation = true,
    fallback = 'No asignado'
  } = options;
  
  // Orden de prioridad de campos donde buscar el nombre de operadora
  const candidateFields = [
    'operatorName',
    'operador',
    'teleoperadora',
    'agente',
    'usuario',
    'operator',
    'agent'
  ];
  
  for (const field of candidateFields) {
    const value = record[field];
    
    if (!value || typeof value !== 'string') continue;
    
    const trimmed = value.trim();
    
    // ⚠️ CRÍTICO: Verificar que NO sea un resultado de llamada
    if (isCallResult(trimmed)) {
      logger.warn('[operatorHelpers] Campo contiene resultado de llamada, no nombre de operadora', {
        field,
        value: trimmed,
        recordId: record.id || record._rowIndex || 'unknown'
      });
      continue; // Saltar este campo
    }
    
    // Validación estricta con isValidOperatorName
    if (strictValidation) {
      if (!isValidOperatorName(trimmed)) {
        logger.debug('[operatorHelpers] Campo no pasa validación de nombre', {
          field,
          value: trimmed
        });
        continue;
      }
    }
    
    // ✅ Campo válido encontrado
    logger.debug('[operatorHelpers] Nombre de operadora válido encontrado', {
      field,
      value: trimmed
    });
    return trimmed;
  }
  
  // No se encontró nombre válido
  logger.debug('[operatorHelpers] No se encontró nombre de operadora válido, usando fallback', {
    fallback,
    recordId: record.id || record._rowIndex || 'unknown'
  });
  return fallback;
}

/**
 * Obtiene el nombre de teleoperadora para mostrar en tarjetas del Historial
 * 
 * PRIORIDAD:
 * 1. beneficiary.assignedOperatorName (desde Asignaciones en Firestore)
 * 2. record.operatorName validado (desde Excel, solo si es válido)
 * 3. assignment lookup por nombre de beneficiario
 * 4. "No asignado" (fallback final)
 * 
 * @param {Object} beneficiary - Datos del beneficiario
 * @param {Object} record - Registro de llamada/seguimiento
 * @param {Object} assignment - Datos de asignación desde Firestore
 * @returns {string} Nombre para mostrar en UI
 */
export function getDisplayOperatorName(beneficiary = {}, record = {}, assignment = null) {
  // 1️⃣ Prioridad MÁXIMA: assignedOperatorName desde beneficiary (Firestore)
  if (beneficiary.assignedOperatorName && 
      typeof beneficiary.assignedOperatorName === 'string' &&
      beneficiary.assignedOperatorName.trim().length > 0) {
    return beneficiary.assignedOperatorName.trim();
  }
  
  // 2️⃣ Desde assignment (Asignaciones / Beneficiarios Base)
  if (assignment) {
    const fromAssignment = assignment.operator || 
                          assignment.operatorName || 
                          assignment.name;
    
    if (fromAssignment && 
        typeof fromAssignment === 'string' && 
        !isCallResult(fromAssignment)) {
      return fromAssignment.trim();
    }
  }
  
  // 3️⃣ Desde el record (Excel), con validación ESTRICTA
  const fromRecord = getOperatorNameFromRecord(record, {
    strictValidation: true,
    fallback: null
  });
  
  if (fromRecord && fromRecord !== 'No asignado') {
    return fromRecord;
  }
  
  // 4️⃣ Fallback final
  return 'No asignado';
}

/**
 * Normaliza campos de operadora en un registro, EVITANDO confusión con resultados
 * 
 * Esta función REEMPLAZA la normalización simple que hacía:
 * `operatorName: record.operatorName || record.operador || record.teleoperadora`
 * 
 * por una validación robusta que detecta y descarta resultados de llamadas
 * 
 * @param {Object} record - Registro a normalizar
 * @returns {Object} Campos normalizados { operatorId, operatorName }
 */
export function normalizeOperatorFields(record = {}) {
  // Extraer operatorId (sin validaciones especiales, solo limpieza)
  const operatorId = record.operatorId || 
                     record.operadorId || 
                     record.teleoperadoraId || 
                     '';
  
  // Extraer operatorName con validación ROBUSTA
  const operatorName = getOperatorNameFromRecord(record, {
    strictValidation: true,
    fallback: 'Sin asignar'
  });
  
  return {
    operatorId: operatorId ? String(operatorId).trim() : '',
    operatorName
  };
}

export default {
  isCallResult,
  getOperatorNameFromRecord,
  getDisplayOperatorName,
  normalizeOperatorFields
};
