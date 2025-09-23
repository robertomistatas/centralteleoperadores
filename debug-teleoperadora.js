/**
 * Script de debugging para diagnósticar problema de asignaciones vacías
 * en el dashboard de teleoperadoras
 */

// Funciones auxiliares para debugging
const debugTeleoperadoraAssignments = () => {
  console.log('🔍 DIAGNÓSTICO DE ASIGNACIONES TELEOPERADORA');
  console.log('='.repeat(60));
  
  // 1. Verificar localStorage del store
  const appStorage = localStorage.getItem('app-storage');
  console.log('📦 Datos en localStorage (app-storage):', 
    appStorage ? JSON.parse(appStorage) : 'No encontrado');
  
  // 2. Verificar si Zustand está disponible
  if (window.zustandStore) {
    const storeState = window.zustandStore.getState();
    console.log('🎯 Estado actual del store Zustand:', storeState);
  }
  
  // 3. Verificar datos de usuarios logueados
  const firebaseAuth = localStorage.getItem('firebase:authUser:[DEFAULT]');
  console.log('👤 Usuario Firebase:', 
    firebaseAuth ? JSON.parse(firebaseAuth) : 'No encontrado');
  
  // 4. Simular datos de prueba si están vacíos
  console.log('💡 Sugerencias de corrección:');
  console.log('- Verificar que las asignaciones se guarden con el nombre correcto del operador');
  console.log('- Comprobar que el email del usuario coincida con las asignaciones');
  console.log('- Revisar la función getAllAssignments() en el store');
};

// Función para simular asignaciones de prueba
const createTestAssignments = () => {
  console.log('🧪 Creando asignaciones de prueba...');
  
  const testAssignments = {
    'teleoperadora-1': [
      {
        id: 'test-1',
        beneficiary: 'Juan Pérez López',
        primaryPhone: '912345678',
        commune: 'Comuna Test',
        operatorName: 'reyesalvarodjaviera@gmail.com'
      },
      {
        id: 'test-2', 
        beneficiary: 'María González Silva',
        primaryPhone: '987654321',
        commune: 'Comuna Test 2',
        operatorName: 'reyesalvarodjaviera@gmail.com'
      }
    ]
  };
  
  // Guardar en localStorage temporalmente
  const appStorage = {
    state: {
      operatorAssignments: testAssignments,
      operators: [
        {
          id: 'teleoperadora-1',
          name: 'reyesalvarodjaviera@gmail.com',
          email: 'reyesalvarodjaviera@gmail.com'
        }
      ]
    }
  };
  
  localStorage.setItem('app-storage', JSON.stringify(appStorage));
  console.log('✅ Asignaciones de prueba guardadas en localStorage');
  console.log('🔄 Recarga la página para ver los cambios');
  
  return testAssignments;
};

// Función para limpiar datos de prueba
const clearTestData = () => {
  localStorage.removeItem('app-storage');
  console.log('🧹 Datos de prueba eliminados');
  console.log('🔄 Recarga la página para aplicar cambios');
};

// Ejecutar diagnóstico automáticamente
debugTeleoperadoraAssignments();

// Hacer funciones disponibles globalmente para la consola
window.debugTeleoperadora = {
  diagnose: debugTeleoperadoraAssignments,
  createTestData: createTestAssignments,
  clearTestData: clearTestData,
  
  // Función helper para verificar coincidencias de nombres
  checkNameMatches: (userEmail, assignments) => {
    console.log('🔍 Verificando coincidencias de nombres:');
    const emailName = userEmail.split('@')[0].toLowerCase();
    
    assignments.forEach((assignment, index) => {
      const operatorName = (assignment.operator || '').toLowerCase();
      const operatorAltName = (assignment.operatorName || '').toLowerCase();
      
      const emailMatch = operatorName.includes(emailName) || operatorAltName.includes(emailName);
      const exactMatch = operatorName === userEmail.toLowerCase() || operatorAltName === userEmail.toLowerCase();
      
      console.log(`Asignación ${index + 1}:`, {
        assignment: assignment,
        emailMatch,
        exactMatch,
        wouldMatch: emailMatch || exactMatch
      });
    });
  }
};

console.log('🛠️ Funciones de debugging disponibles en window.debugTeleoperadora');
console.log('- debugTeleoperadora.diagnose()');
console.log('- debugTeleoperadora.createTestData()');
console.log('- debugTeleoperadora.clearTestData()');
console.log('- debugTeleoperadora.checkNameMatches(email, assignments)');