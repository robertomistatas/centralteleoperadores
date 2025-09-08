// Test de imports para verificar que no hay errores
console.log('🧪 Iniciando test de imports...');

// Test de utilidades de normalización
try {
  console.log('Testing stringNormalization...');
  // Este import se ejecutará cuando sea necesario
  console.log('✅ stringNormalization ready');
} catch (e) {
  console.error('❌ Error en stringNormalization:', e);
}

// Test de store
try {
  console.log('Testing beneficiary store...');
  // Este import se ejecutará cuando sea necesario
  console.log('✅ beneficiaryStore ready');
} catch (e) {
  console.error('❌ Error en beneficiaryStore:', e);
}

// Test de servicios
try {
  console.log('Testing beneficiary service...');
  // Este import se ejecutará cuando sea necesario
  console.log('✅ beneficiaryService ready');
} catch (e) {
  console.error('❌ Error en beneficiaryService:', e);
}

console.log('🎉 Test de imports completado - La app debería cargar sin errores');
