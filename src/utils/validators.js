/**
 * validators.js
 * Utilidades centralizadas para validación y normalización de datos
 * 
 * Refactorización: Unifica looksLikeOperatorName, isValidOperatorName y funciones similares
 * dispersas en el código base.
 */

/**
 * Normaliza un string: quita tildes, trim, lowercase
 * @param {string} str - String a normalizar
 * @returns {string} String normalizado
 */
export const normalizeName = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Elimina diacríticos (tildes)
};

/**
 * Valida si un string parece un nombre de operador válido
 * @param {string} name - Nombre a validar
 * @returns {boolean} true si es válido
 */
export const isValidOperatorName = (name) => {
  if (!name || typeof name !== 'string') return false;
  
  const normalized = normalizeName(name);
  
  // Debe tener al menos 2 caracteres
  if (normalized.length < 2) return false;
  
  // No debe ser un valor genérico común en Excel
  const invalidValues = [
    'sin asignar',
    'no asignado',
    'pendiente',
    'n/a',
    'na',
    'null',
    'undefined',
    'none',
    'vacio',
    'sin operador',
    'desconocido',
    'teleoperadora', // término genérico
    'operador', // término genérico
  ];
  
  if (invalidValues.includes(normalized)) return false;
  
  // Debe contener al menos una letra
  if (!/[a-z]/.test(normalized)) return false;
  
  return true;
};

/**
 * Valida un número de teléfono (formato chileno flexible)
 * @param {string} phone - Teléfono a validar
 * @returns {boolean} true si es válido
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  
  const cleaned = phone.toString().replace(/\D/g, '');
  
  // Chile: 9 dígitos (móvil) o 8 dígitos (fijo) o 11 con código país (+56)
  return cleaned.length >= 8 && cleaned.length <= 11;
};

/**
 * Normaliza un teléfono a formato estándar
 * @param {string} phone - Teléfono a normalizar
 * @returns {string} Teléfono normalizado
 */
export const normalizePhone = (phone) => {
  if (!phone) return '';
  
  let cleaned = phone.toString().replace(/\D/g, '');
  
  // Si tiene código país +56, quitarlo
  if (cleaned.startsWith('56') && cleaned.length === 11) {
    cleaned = cleaned.substring(2);
  }
  
  return cleaned;
};

/**
 * Valida un RUT chileno (sin dígito verificador por simplicidad)
 * @param {string} rut - RUT a validar
 * @returns {boolean} true si es válido
 */
export const isValidRut = (rut) => {
  if (!rut) return false;
  
  const cleaned = rut.toString().replace(/\D/g, '');
  
  // RUT debe tener entre 7 y 8 dígitos (sin contar DV)
  return cleaned.length >= 7 && cleaned.length <= 9;
};

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} true si es válido
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida una fecha en formato DD-MM-YYYY o DD/MM/YYYY
 * @param {string} dateStr - Fecha a validar
 * @returns {boolean} true si es válido
 */
export const isValidChileanDate = (dateStr) => {
  if (!dateStr) return false;
  
  const dateRegex = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/;
  const match = dateStr.match(dateRegex);
  
  if (!match) return false;
  
  const day = parseInt(match[1]);
  const month = parseInt(match[2]);
  const year = parseInt(match[3]);
  
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;
  if (year < 1900 || year > 2100) return false;
  
  return true;
};

/**
 * Valida que un objeto tenga las propiedades mínimas de un beneficiario
 * @param {object} beneficiary - Objeto beneficiario
 * @returns {boolean} true si es válido
 */
export const isValidBeneficiary = (beneficiary) => {
  if (!beneficiary || typeof beneficiary !== 'object') return false;
  
  // Campos obligatorios mínimos
  return Boolean(
    beneficiary.nombre || 
    beneficiary.telefono ||
    beneficiary.rut
  );
};

/**
 * Valida que un objeto tenga las propiedades mínimas de un seguimiento
 * @param {object} seguimiento - Objeto seguimiento
 * @returns {boolean} true si es válido
 */
export const isValidSeguimiento = (seguimiento) => {
  if (!seguimiento || typeof seguimiento !== 'object') return false;
  
  return Boolean(
    seguimiento.beneficiarioId &&
    seguimiento.operatorId &&
    seguimiento.fechaContacto
  );
};

/**
 * Sanitiza un string para prevenir XSS (básico)
 * @param {string} str - String a sanitizar
 * @returns {string} String sanitizado
 */
export const sanitizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};
