// Script de verificación de imports para debugging
console.log('🔍 Verificando imports del módulo Beneficiarios...');

try {
  // Verificar que los componentes se pueden importar
  import('./src/components/BeneficiariosBase.jsx')
    .then(() => console.log('✅ BeneficiariosBase.jsx importado correctamente'))
    .catch(err => console.error('❌ Error importando BeneficiariosBase:', err));

  import('./src/services/beneficiaryService.js')
    .then(() => console.log('✅ beneficiaryService.js importado correctamente'))
    .catch(err => console.error('❌ Error importando beneficiaryService:', err));

  import('./src/stores/useBeneficiaryStore.js')
    .then(() => console.log('✅ useBeneficiaryStore.js importado correctamente'))
    .catch(err => console.error('❌ Error importando useBeneficiaryStore:', err));

  import('./src/utils/stringNormalization.js')
    .then(() => console.log('✅ stringNormalization.js importado correctamente'))
    .catch(err => console.error('❌ Error importando stringNormalization:', err));

} catch (error) {
  console.error('❌ Error general en verificación:', error);
}

console.log('✨ Verificación de imports completada');
