#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE DIAGNÓSTICO COMPLETO - Dashboard Teleoperadora
 * Simula el proceso de autenticación y carga de datos para encontrar el problema
 */

// Simulación del contexto del problema
const simulateUserContext = {
  // Usuario autenticado (teleoperadora de prueba)
  user: {
    email: 'reyesalvaradojaviera@gmail.com',
    displayName: 'Javiera Reyes Alvarado',
    uid: 'javiera-uid-123'
  },
  
  // Datos de operadores en el sistema (ejemplo basado en las imágenes)
  operators: [
    {
      id: 'operator-javiera-reyes-alvarado',
      name: 'Javiera Reyes Alvarado',
      email: 'reyesalvaradojaviera@gmail.com',
      phone: '964892834'
    },
    {
      id: 'operator-maria-gonzalez',
      name: 'María González',
      email: 'maria.gonzalez@example.com',
      phone: '+56912345678'
    }
  ],
  
  // Simulación de asignaciones (basado en 286 beneficiarios mostrados)
  operatorAssignments: {
    'operator-javiera-reyes-alvarado': Array.from({ length: 286 }, (_, index) => ({
      id: `javiera-assignment-${index + 1}`,
      beneficiary: `Beneficiario ${index + 1}`,
      primaryPhone: `+5691234${String(index).padStart(4, '0')}`,
      phone: `+5691234${String(index).padStart(4, '0')}`,
      commune: index % 2 === 0 ? 'Santiago' : 'Las Condes'
    })),
    'operator-maria-gonzalez': []
  }
};

console.log('🔍 DIAGNÓSTICO COMPLETO - Dashboard Teleoperadora');
console.log('=' .repeat(60));

// 1. Verificar datos de usuario
console.log('\n👤 DATOS DEL USUARIO:');
console.log('Email:', simulateUserContext.user.email);
console.log('Display Name:', simulateUserContext.user.displayName);
console.log('UID:', simulateUserContext.user.uid);

// 2. Verificar operadores disponibles
console.log('\n👥 OPERADORES EN SISTEMA:');
simulateUserContext.operators.forEach(op => {
  console.log(`- ${op.name} (${op.email}) [ID: ${op.id}]`);
});

// 3. Simular la lógica de búsqueda actual (problemática)
console.log('\n🔍 SIMULACIÓN DE BÚSQUEDA ACTUAL (PROBLEMÁTICA):');
const userEmail = simulateUserContext.user.email;
const exactMatch = simulateUserContext.operators.find(op => 
  op.email?.toLowerCase() === userEmail?.toLowerCase()
);

if (exactMatch) {
  console.log('✅ ENCONTRADO con búsqueda exacta:', exactMatch.name);
  const assignments = simulateUserContext.operatorAssignments[exactMatch.id] || [];
  console.log(`📊 Asignaciones: ${assignments.length}`);
} else {
  console.log('❌ NO ENCONTRADO con búsqueda exacta');
}

// 4. Simular la lógica de búsqueda mejorada (solución)
console.log('\n🔧 SIMULACIÓN DE BÚSQUEDA MEJORADA (SOLUCIÓN):');

function getAssignmentsByEmail(userEmail, operators, operatorAssignments) {
  const normalizedEmail = userEmail?.toLowerCase().trim();
  
  console.log('🔍 Buscando asignaciones para email:', normalizedEmail);
  
  // Buscar operador con múltiples estrategias
  const matchingOperator = operators.find(op => {
    const opEmail = op.email?.toLowerCase().trim();
    const opName = op.name?.toLowerCase().trim();
    
    // Estrategias de matching
    const exactEmailMatch = opEmail === normalizedEmail;
    const nameInEmail = normalizedEmail.includes(opName?.split(' ')[0]) || normalizedEmail.includes(opName?.split(' ')[1]);
    const emailInName = opName?.includes(normalizedEmail.split('@')[0]);
    
    console.log(`  🔍 Verificando operador ${op.name}:`, {
      opEmail,
      exactEmailMatch,
      nameInEmail,
      emailInName
    });
    
    return exactEmailMatch || nameInEmail || emailInName;
  });
  
  if (matchingOperator) {
    console.log('✅ Operador encontrado:', matchingOperator.name);
    const assignments = operatorAssignments[matchingOperator.id] || [];
    console.log(`✅ Asignaciones encontradas: ${assignments.length}`);
    
    return assignments.map(assignment => ({
      id: assignment.id,
      operator: matchingOperator.name,
      operatorName: matchingOperator.name,
      operatorEmail: matchingOperator.email,
      beneficiary: assignment.beneficiary,
      phone: assignment.primaryPhone || assignment.phone,
      commune: assignment.commune
    }));
  } else {
    console.warn('❌ No se encontró operador para email:', normalizedEmail);
    return [];
  }
}

const foundAssignments = getAssignmentsByEmail(
  simulateUserContext.user.email, 
  simulateUserContext.operators, 
  simulateUserContext.operatorAssignments
);

console.log(`\n📊 RESULTADO FINAL: ${foundAssignments.length} asignaciones encontradas`);

// 5. Recomendaciones
console.log('\n💡 RECOMENDACIONES:');
console.log('1. ✅ Implementar búsqueda de operador con múltiples estrategias');
console.log('2. ✅ Agregar recarga automática de datos si no se encuentran asignaciones');
console.log('3. ✅ Mejorar debugging para identificar problemas de matching');
console.log('4. ✅ Asegurar sincronización entre Firebase y el store local');

// 6. Verificar métrica esperada
console.log('\n📈 VERIFICACIÓN DE MÉTRICAS:');
if (foundAssignments.length === 286) {
  console.log('✅ SUCCESS: Se encontraron las 286 asignaciones esperadas');
} else {
  console.log(`❌ ERROR: Se esperaban 286 asignaciones, pero se encontraron ${foundAssignments.length}`);
}

console.log('\n' + '=' .repeat(60));
console.log('🎯 DIAGNÓSTICO COMPLETADO');