/**
 * Herramienta de debugging para verificar coincidencias entre beneficiarios y asignaciones
 * Útil para diagnosticar problemas de mayúsculas/minúsculas y coincidencias
 */

import { normalizeString, normalizePhone, areStringsSimilar } from './stringNormalization';

/**
 * Función de debugging para verificar por qué un beneficiario específico no está siendo encontrado
 * @param {string} beneficiaryName - Nombre del beneficiario a buscar
 * @param {Array} beneficiaries - Lista de beneficiarios
 * @param {Array} assignments - Lista de asignaciones
 */
export const debugBeneficiaryMatch = (beneficiaryName, beneficiaries, assignments) => {
  console.log('🔍 === DEBUGGING BENEFICIARY MATCH ===');
  console.log('🎯 Buscando beneficiario:', beneficiaryName);
  
  // Buscar el beneficiario en la lista
  const beneficiary = beneficiaries.find(b => 
    b.nombre && b.nombre.toLowerCase().includes(beneficiaryName.toLowerCase())
  );
  
  if (!beneficiary) {
    console.log('❌ Beneficiario no encontrado en la lista de beneficiarios');
    return;
  }
  
  console.log('✅ Beneficiario encontrado:', {
    nombre: beneficiary.nombre,
    fono: beneficiary.fono,
    sim: beneficiary.sim,
    appSim: beneficiary.appSim
  });
  
  // Normalizar datos del beneficiario
  const targetName = normalizeString(beneficiary.nombre);
  const targetPhones = [
    normalizePhone(beneficiary.fono),
    normalizePhone(beneficiary.sim),
    normalizePhone(beneficiary.appSim)
  ].filter(Boolean);
  
  console.log('📋 Datos normalizados del beneficiario:', {
    nombre: targetName,
    telefonos: targetPhones
  });
  
  // Buscar en asignaciones
  console.log('🔍 Buscando en', assignments.length, 'asignaciones...');
  
  let foundByName = false;
  let foundByPhone = false;
  
  assignments.forEach((assignment, index) => {
    const assignmentName = normalizeString(assignment.beneficiary || assignment.nombre || assignment.beneficiario || '');
    const assignmentPhones = [
      normalizePhone(assignment.phone || assignment.primaryPhone || assignment.telefono || assignment.fono || ''),
      normalizePhone(assignment.sim || ''),
      normalizePhone(assignment.appSim || '')
    ].filter(Boolean);
    
    // Verificar coincidencia por nombre
    const nameMatch = areStringsSimilar(targetName, assignmentName);
    if (nameMatch) {
      console.log(`✅ COINCIDENCIA POR NOMBRE encontrada en asignación ${index + 1}:`);
      console.log('   - Beneficiario:', beneficiary.nombre, '→', targetName);
      console.log('   - Asignación:', assignment.beneficiary || assignment.nombre, '→', assignmentName);
      foundByName = true;
    }
    
    // Verificar coincidencia por teléfono
    const phoneMatch = targetPhones.some(targetPhone => 
      assignmentPhones.some(assignmentPhone => assignmentPhone === targetPhone)
    );
    
    if (phoneMatch) {
      console.log(`✅ COINCIDENCIA POR TELÉFONO encontrada en asignación ${index + 1}:`);
      console.log('   - Beneficiario teléfonos:', targetPhones);
      console.log('   - Asignación teléfonos:', assignmentPhones);
      foundByPhone = true;
    }
    
    // Log detallado para las primeras 3 asignaciones
    if (index < 3) {
      console.log(`📋 Asignación ${index + 1}:`, {
        original: {
          beneficiary: assignment.beneficiary,
          phone: assignment.phone
        },
        normalizado: {
          nombre: assignmentName,
          telefonos: assignmentPhones
        },
        coincidencia: {
          nombre: nameMatch,
          telefono: phoneMatch
        }
      });
    }
  });
  
  console.log('📊 RESULTADO FINAL:');
  console.log('   - Encontrado por nombre:', foundByName);
  console.log('   - Encontrado por teléfono:', foundByPhone);
  console.log('   - Debería estar asignado:', foundByName || foundByPhone);
  console.log('🔍 === FIN DEBUGGING ===');
  
  return {
    found: foundByName || foundByPhone,
    foundByName,
    foundByPhone,
    beneficiary,
    targetName,
    targetPhones
  };
};

/**
 * Función para verificar todas las discrepancias entre beneficiarios y asignaciones
 * @param {Array} beneficiaries - Lista de beneficiarios
 * @param {Array} assignments - Lista de asignaciones
 */
export const auditBeneficiaryAssignments = (beneficiaries, assignments) => {
  console.log('🔍 === AUDITORÍA COMPLETA DE ASIGNACIONES ===');
  console.log('📊 Total beneficiarios:', beneficiaries.length);
  console.log('📊 Total asignaciones:', assignments.length);
  
  const discrepancies = [];
  
  beneficiaries.forEach((beneficiary, index) => {
    if (!beneficiary.nombre) return;
    
    const targetName = normalizeString(beneficiary.nombre);
    const targetPhones = [
      normalizePhone(beneficiary.fono),
      normalizePhone(beneficiary.sim),
      normalizePhone(beneficiary.appSim)
    ].filter(Boolean);
    
    const hasAssignment = assignments.some(assignment => {
      const assignmentName = normalizeString(assignment.beneficiary || assignment.nombre || assignment.beneficiario || '');
      const assignmentPhones = [
        normalizePhone(assignment.phone || assignment.primaryPhone || assignment.telefono || assignment.fono || ''),
        normalizePhone(assignment.sim || ''),
        normalizePhone(assignment.appSim || '')
      ].filter(Boolean);
      
      const nameMatch = areStringsSimilar(targetName, assignmentName);
      const phoneMatch = targetPhones.some(targetPhone => 
        assignmentPhones.some(assignmentPhone => assignmentPhone === targetPhone)
      );
      
      return nameMatch || phoneMatch;
    });
    
    if (!hasAssignment) {
      discrepancies.push({
        index: index + 1,
        nombre: beneficiary.nombre,
        telefonos: targetPhones,
        normalizado: targetName
      });
    }
  });
  
  console.log('❌ Beneficiarios sin asignación encontrados:', discrepancies.length);
  
  // Mostrar los primeros 10 para debugging
  discrepancies.slice(0, 10).forEach((item, index) => {
    console.log(`${index + 1}. ${item.nombre} (${item.normalizado}) - Tel: ${item.telefonos.join(', ')}`);
  });
  
  console.log('🔍 === FIN AUDITORÍA ===');
  
  return discrepancies;
};

export default {
  debugBeneficiaryMatch,
  auditBeneficiaryAssignments
};
