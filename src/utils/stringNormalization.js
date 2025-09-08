/**
 * Utilidades para normalización de strings
 * Permite coincidencias rápidas entre nombres y teléfonos
 */

/**
 * Normaliza un string removiendo tildes, espacios extra y convirtiendo a minúsculas
 * @param {string} str - String a normalizar
 * @returns {string} - String normalizado
 */
export const normalizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover tildes
    .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
    .replace(/[^\w\s]/g, ''); // Remover caracteres especiales excepto espacios
};

/**
 * Normaliza un número de teléfono removiendo espacios, guiones y paréntesis
 * @param {string|number} phone - Teléfono a normalizar
 * @returns {string} - Teléfono normalizado
 */
export const normalizePhone = (phone) => {
  if (!phone) return '';
  
  const phoneStr = phone.toString();
  
  // Si es 000000000 o similar, considerarlo inválido
  if (/^0+$/.test(phoneStr.replace(/\D/g, ''))) {
    return '';
  }
  
  // Remover todo excepto números
  const cleanPhone = phoneStr.replace(/\D/g, '');
  
  // Validar longitud mínima (8 dígitos para Chile)
  if (cleanPhone.length < 8) {
    return '';
  }
  
  return cleanPhone;
};

/**
 * Compara dos strings normalizados para verificar similitud
 * @param {string} str1 - Primer string
 * @param {string} str2 - Segundo string
 * @param {number} threshold - Umbral de similitud (0-1)
 * @returns {boolean} - Si son similares
 */
export const areStringsSimilar = (str1, str2, threshold = 0.8) => {
  if (!str1 || !str2) return false;
  
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  
  // Coincidencia exacta
  if (norm1 === norm2) return true;
  
  // Verificar si uno contiene al otro (para casos como "Juan" vs "Juan Pérez")
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return true;
  }
  
  // Algoritmo simple de similitud (Jaccard)
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  
  const similarity = intersection.length / union.length;
  
  return similarity >= threshold;
};

/**
 * Busca coincidencias de un beneficiario en una lista por nombre o teléfono
 * @param {Object} beneficiary - Beneficiario a buscar
 * @param {Array} list - Lista donde buscar
 * @returns {Object|null} - Beneficiario encontrado o null
 */
export const findBeneficiaryMatch = (beneficiary, list) => {
  if (!beneficiary || !list || !Array.isArray(list)) return null;
  
  const targetName = normalizeString(beneficiary.nombre);
  const targetPhones = [
    normalizePhone(beneficiary.fono),
    normalizePhone(beneficiary.sim),
    normalizePhone(beneficiary.appSim)
  ].filter(Boolean);
  
  return list.find(item => {
    // Comparar por nombre
    const itemName = normalizeString(item.nombre || item.name);
    if (areStringsSimilar(targetName, itemName)) {
      return true;
    }
    
    // Comparar por teléfonos
    const itemPhones = [
      normalizePhone(item.fono || item.telefono || item.phone),
      normalizePhone(item.sim),
      normalizePhone(item.appSim)
    ].filter(Boolean);
    
    return targetPhones.some(targetPhone => 
      itemPhones.some(itemPhone => itemPhone === targetPhone)
    );
  });
};

/**
 * Valida y extrae números de teléfono válidos de un beneficiario
 * @param {Object} beneficiary - Datos del beneficiario
 * @returns {Array} - Array de teléfonos válidos
 */
export const extractValidPhones = (beneficiary) => {
  const phones = [
    normalizePhone(beneficiary.fono),
    normalizePhone(beneficiary.sim),
    normalizePhone(beneficiary.appSim)
  ].filter(Boolean);
  
  // Remover duplicados
  return [...new Set(phones)];
};
