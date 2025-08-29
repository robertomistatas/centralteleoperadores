/**
 * 🔧 CONFIGURACIÓN DE MAPEO BENEFICIARIO → TELEOPERADORA
 * Sistema de normalización y mapeo inteligente para vinculación correcta
 */

export const OPERATOR_MAPPING_CONFIG = {
  // Reglas de normalización de nombres
  normalizationRules: {
    // Remover caracteres especiales y espacios extra
    cleanSpecialChars: true,
    // Convertir a minúsculas para comparación
    toLowerCase: true,
    // Remover acentos y tildes
    removeAccents: true,
    // Espacios múltiples a uno solo
    normalizeSpaces: true
  },

  // Mapeos manuales para casos especiales
  manualMappings: {
    // Formato: "nombre_en_datos": "nombre_real_operador"
    "ocupado": null, // Excluir estados como operadores
    "sin_respuesta": null,
    "llamado_exitoso": null,
    "no_identificado": null,
    "busy": null,
    "no_answer": null
  },

  // Patrones a excluir (no son nombres de operadores)
  excludePatterns: [
    /^ocupado$/i,
    /^sin\s+respuesta$/i,
    /^no\s+identificado$/i,
    /^llamado\s+exitoso$/i,
    /^busy$/i,
    /^no\s+answer$/i,
    /^\d+$/, // Solo números
    /^[A-Z]{2,}$/ // Solo mayúsculas (códigos)
  ],

  // Configuración de matching flexible
  matchingConfig: {
    // Tolerancia para nombres similares
    fuzzyMatchTolerance: 0.8,
    // Intentar matching por partes del nombre
    partialMatching: true,
    // Matching por apellidos
    surnameMatching: true
  }
};

/**
 * Normaliza un nombre para comparación
 */
export function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  
  let normalized = name;
  
  // Aplicar reglas de normalización
  if (OPERATOR_MAPPING_CONFIG.normalizationRules.toLowerCase) {
    normalized = normalized.toLowerCase();
  }
  
  if (OPERATOR_MAPPING_CONFIG.normalizationRules.removeAccents) {
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  
  if (OPERATOR_MAPPING_CONFIG.normalizationRules.cleanSpecialChars) {
    normalized = normalized.replace(/[^\w\s]/g, '');
  }
  
  if (OPERATOR_MAPPING_CONFIG.normalizationRules.normalizeSpaces) {
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }
  
  return normalized;
}

/**
 * Verifica si un nombre debe ser excluido como operador
 */
export function shouldExcludeAsOperator(name) {
  if (!name) return true;
  
  // Verificar mapeos manuales
  const normalizedName = normalizeName(name);
  if (OPERATOR_MAPPING_CONFIG.manualMappings[normalizedName] === null) {
    return true;
  }
  
  // Verificar patrones de exclusión
  return OPERATOR_MAPPING_CONFIG.excludePatterns.some(pattern => 
    pattern.test(name)
  );
}

/**
 * Encuentra el mejor match de operador para un beneficiario
 */
export function findOperatorForBeneficiary(beneficiaryName, operatorAssignments, operators) {
  if (!beneficiaryName || !operatorAssignments || !operators) return null;
  
  const normalizedBeneficiary = normalizeName(beneficiaryName);
  
  // Buscar en asignaciones exactas primero
  for (const [operatorId, assignedBeneficiaries] of Object.entries(operatorAssignments)) {
    const exactMatch = assignedBeneficiaries.find(beneficiary => 
      normalizeName(beneficiary) === normalizedBeneficiary
    );
    
    if (exactMatch) {
      const operator = operators.find(op => op.id === operatorId);
      if (operator) {
        return {
          operatorId,
          operatorName: operator.name,
          operatorInfo: operator,
          matchType: 'exact'
        };
      }
    }
  }
  
  // Si no hay match exacto, intentar matching parcial si está habilitado
  if (OPERATOR_MAPPING_CONFIG.matchingConfig.partialMatching) {
    for (const [operatorId, assignedBeneficiaries] of Object.entries(operatorAssignments)) {
      const partialMatch = assignedBeneficiaries.find(beneficiary => {
        const normalizedAssigned = normalizeName(beneficiary);
        return normalizedAssigned.includes(normalizedBeneficiary) || 
               normalizedBeneficiary.includes(normalizedAssigned);
      });
      
      if (partialMatch) {
        const operator = operators.find(op => op.id === operatorId);
        if (operator) {
          return {
            operatorId,
            operatorName: operator.name,
            operatorInfo: operator,
            matchType: 'partial'
          };
        }
      }
    }
  }
  
  return null;
}

export default {
  OPERATOR_MAPPING_CONFIG,
  normalizeName,
  shouldExcludeAsOperator,
  findOperatorForBeneficiary
};
