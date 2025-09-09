/**
 * Script de testing para verificar la persistencia del módulo Beneficiarios Base
 * Ejecutar en la consola del navegador
 */

// Función para testear la persistencia
window.testBeneficiaryPersistence = {
  // Verificar estado actual
  checkCurrentState: () => {
    const store = JSON.parse(localStorage.getItem('beneficiary-store') || '{}');
    console.log('📊 ESTADO ACTUAL DEL LOCALSTORAGE:', store);
    
    if (store.state) {
      console.log('✅ Beneficiarios en localStorage:', store.state.beneficiaries?.length || 0);
      console.log('✅ Estadísticas:', store.state.stats);
      console.log('✅ shouldReload:', store.state.shouldReload);
    } else {
      console.log('❌ No hay datos en localStorage');
    }
    
    return store;
  },
  
  // Simular datos de prueba
  addTestData: () => {
    console.log('🧪 Agregando datos de prueba...');
    
    const testBeneficiaries = [
      {
        id: 'test-1',
        nombre: 'Juan Pérez Test',
        direccion: 'Calle Test 123',
        fono: '987654321',
        sim: '',
        appSim: '',
        telefonosValidos: ['987654321'],
        creadoEn: new Date()
      },
      {
        id: 'test-2',
        nombre: 'María González Test',
        direccion: 'Avenida Test 456',
        fono: '987654322',
        sim: '987654323',
        appSim: '',
        telefonosValidos: ['987654322', '987654323'],
        creadoEn: new Date()
      }
    ];
    
    // Obtener el store actual
    const currentStore = JSON.parse(localStorage.getItem('beneficiary-store') || '{}');
    
    // Actualizar con datos de prueba
    const updatedStore = {
      ...currentStore,
      state: {
        ...currentStore.state,
        beneficiaries: testBeneficiaries,
        stats: {
          total: testBeneficiaries.length,
          withPhones: testBeneficiaries.length,
          withoutPhones: 0,
          incomplete: 0,
          unassigned: testBeneficiaries.length
        },
        shouldReload: false
      }
    };
    
    localStorage.setItem('beneficiary-store', JSON.stringify(updatedStore));
    console.log('✅ Datos de prueba agregados. Recarga la página para ver los cambios.');
    
    return testBeneficiaries;
  },
  
  // Limpiar datos
  clearData: () => {
    localStorage.removeItem('beneficiary-store');
    console.log('🗑️ Datos limpiados. Recarga la página.');
  },
  
  // Verificar después de recarga
  testAfterReload: () => {
    setTimeout(() => {
      const store = window.testBeneficiaryPersistence.checkCurrentState();
      
      if (store.state?.beneficiaries?.length > 0) {
        console.log('✅ PERSISTENCIA FUNCIONANDO: Los datos se mantuvieron después de la recarga');
      } else {
        console.log('❌ PROBLEMA DE PERSISTENCIA: Los datos se perdieron');
        
        // Verificar posibles causas
        console.log('🔍 Verificando posibles causas:');
        console.log('   - shouldReload:', store.state?.shouldReload);
        console.log('   - Estructura del store:', Object.keys(store.state || {}));
      }
    }, 2000);
  },
  
  // Test completo
  runFullTest: () => {
    console.log('🧪 INICIANDO TEST COMPLETO DE PERSISTENCIA');
    console.log('==========================================');
    
    // Paso 1: Verificar estado inicial
    console.log('1️⃣ Verificando estado inicial...');
    window.testBeneficiaryPersistence.checkCurrentState();
    
    // Paso 2: Agregar datos de prueba
    console.log('2️⃣ Agregando datos de prueba...');
    window.testBeneficiaryPersistence.addTestData();
    
    // Paso 3: Instrucciones para el usuario
    console.log('3️⃣ INSTRUCCIONES:');
    console.log('   - Recarga la página (F5)');
    console.log('   - Ejecuta: testBeneficiaryPersistence.testAfterReload()');
    console.log('   - Verifica que los datos se mantienen');
  }
};

// Ejecutar verificación inicial
console.log('🔧 HERRAMIENTAS DE TESTING CARGADAS');
console.log('Ejecuta: testBeneficiaryPersistence.runFullTest()');

export default window.testBeneficiaryPersistence;
