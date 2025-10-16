/**
 * performanceStressTest.simple.js
 * Versión simplificada del stress test para ejecución en Node.js
 * 
 * FASE 5.3: Validación de Performance RC1
 * 
 * Ejecutar con: node src/tests/performanceStressTest.simple.js
 */

console.log('🚀 INICIANDO PERFORMANCE STRESS TEST - RC1');
console.log('='.repeat(80));

/**
 * Configuración del test
 */
const CONFIG = {
  CONCURRENT_OPERATIONS: 50,
  RECORDS_PER_OPERATION: 1000,
  TEST_ITERATIONS: 3
};

/**
 * Thresholds de performance
 */
const THRESHOLDS = {
  MAX_LATENCY_MS: 1000,      // Target: <1000ms
  MIN_OPS_PER_SECOND: 50,    // Target: ≥50 ops/s
  MAX_MEMORY_MB: 500         // Target: <500MB
};

/**
 * Genera datos de prueba sintéticos
 */
const generateMockRecords = (count) => {
  const operators = ['María González', 'Juan Pérez', 'Ana López', 'Carlos Ruiz', 'Sofía Castro'];
  const beneficiarios = ['Pedro Soto', 'Carmen Silva', 'Luis Vargas', 'Rosa Muñoz', 'Jorge Ortiz'];
  const resultados = ['exitosa', 'fallida', 'sin identificar'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `test-${i}`,
    operatorName: operators[Math.floor(Math.random() * operators.length)],
    beneficiaryName: beneficiarios[Math.floor(Math.random() * beneficiarios.length)],
    phone: `9${Math.floor(Math.random() * 90000000 + 10000000)}`,
    resultado: resultados[Math.floor(Math.random() * resultados.length)],
    fecha: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    duracion: Math.floor(Math.random() * 600),
    observaciones: `Test observation ${i}`
  }));
};

/**
 * Simula procesamiento de datos (normalización + métricas)
 */
const processRecords = (records) => {
  // Simular normalización
  const normalized = records.map(r => ({
    ...r,
    operatorName: r.operatorName.trim().toLowerCase(),
    phone: r.phone.replace(/\D/g, ''),
    resultado: r.resultado.toLowerCase()
  }));
  
  // Simular cálculo de métricas
  const metrics = {
    total: normalized.length,
    exitosas: normalized.filter(r => r.resultado === 'exitosa').length,
    fallidas: normalized.filter(r => r.resultado === 'fallida').length,
    operators: [...new Set(normalized.map(r => r.operatorName))].length
  };
  
  return { normalized, metrics };
};

/**
 * Test 1: Normalización Concurrente
 */
const testConcurrentNormalization = async () => {
  console.log('\n📊 TEST 1: Normalización Concurrente');
  console.log('-'.repeat(80));
  
  const startTime = performance.now();
  const operations = [];
  
  for (let i = 0; i < CONFIG.CONCURRENT_OPERATIONS; i++) {
    const mockData = generateMockRecords(CONFIG.RECORDS_PER_OPERATION);
    operations.push(
      Promise.resolve().then(() => processRecords(mockData))
    );
  }
  
  const results = await Promise.all(operations);
  const endTime = performance.now();
  
  const totalTime = endTime - startTime;
  const avgTime = totalTime / CONFIG.CONCURRENT_OPERATIONS;
  const opsPerSecond = (CONFIG.CONCURRENT_OPERATIONS / totalTime) * 1000;
  
  console.log(`✅ Operaciones completadas: ${CONFIG.CONCURRENT_OPERATIONS}`);
  console.log(`📈 Registros por operación: ${CONFIG.RECORDS_PER_OPERATION}`);
  console.log(`⏱️  Tiempo total: ${totalTime.toFixed(2)}ms`);
  console.log(`⚡ Tiempo promedio: ${avgTime.toFixed(2)}ms`);
  console.log(`🚀 Ops/segundo: ${opsPerSecond.toFixed(2)}`);
  
  const passed = avgTime < THRESHOLDS.MAX_LATENCY_MS && opsPerSecond >= THRESHOLDS.MIN_OPS_PER_SECOND;
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: Latency ${avgTime < THRESHOLDS.MAX_LATENCY_MS ? '<' : '>'} ${THRESHOLDS.MAX_LATENCY_MS}ms`);
  
  return {
    testName: 'Normalización Concurrente',
    passed,
    totalTime,
    avgTime,
    opsPerSecond,
    recordsProcessed: CONFIG.CONCURRENT_OPERATIONS * CONFIG.RECORDS_PER_OPERATION
  };
};

/**
 * Test 2: Cálculo Intensivo de Métricas
 */
const testIntensiveMetrics = async () => {
  console.log('\n📊 TEST 2: Cálculo Intensivo de Métricas');
  console.log('-'.repeat(80));
  
  const startTime = performance.now();
  const iterations = CONFIG.CONCURRENT_OPERATIONS;
  
  for (let i = 0; i < iterations; i++) {
    const mockData = generateMockRecords(CONFIG.RECORDS_PER_OPERATION);
    processRecords(mockData);
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  const opsPerSecond = (iterations / totalTime) * 1000;
  
  console.log(`✅ Cálculos completados: ${iterations}`);
  console.log(`⏱️  Tiempo total: ${totalTime.toFixed(2)}ms`);
  console.log(`⚡ Tiempo promedio: ${avgTime.toFixed(2)}ms`);
  console.log(`🚀 Ops/segundo: ${opsPerSecond.toFixed(2)}`);
  
  const passed = avgTime < THRESHOLDS.MAX_LATENCY_MS;
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: Latency ${avgTime < THRESHOLDS.MAX_LATENCY_MS ? '<' : '>'} ${THRESHOLDS.MAX_LATENCY_MS}ms`);
  
  return {
    testName: 'Cálculo Intensivo',
    passed,
    totalTime,
    avgTime,
    opsPerSecond
  };
};

/**
 * Test 3: Memoria Bajo Carga
 */
const testMemoryUnderLoad = async () => {
  console.log('\n📊 TEST 3: Memoria Bajo Carga');
  console.log('-'.repeat(80));
  
  const startMemory = process.memoryUsage();
  const memorySnapshots = [startMemory];
  
  // Ejecutar operaciones intensivas
  for (let i = 0; i < CONFIG.CONCURRENT_OPERATIONS; i++) {
    const mockData = generateMockRecords(CONFIG.RECORDS_PER_OPERATION * 2);
    processRecords(mockData);
    
    if (i % 10 === 0) {
      memorySnapshots.push(process.memoryUsage());
    }
  }
  
  // Forzar garbage collection si está disponible
  if (global.gc) {
    global.gc();
  }
  
  const endMemory = process.memoryUsage();
  
  const avgHeapUsed = memorySnapshots.reduce((sum, s) => sum + s.heapUsed, 0) / memorySnapshots.length;
  const maxHeapUsed = Math.max(...memorySnapshots.map(s => s.heapUsed));
  const avgHeapMB = avgHeapUsed / 1024 / 1024;
  const maxHeapMB = maxHeapUsed / 1024 / 1024;
  
  console.log(`📊 Memoria inicial: ${(startMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📊 Memoria final: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📊 Memoria promedio: ${avgHeapMB.toFixed(2)} MB`);
  console.log(`📊 Memoria máxima: ${maxHeapMB.toFixed(2)} MB`);
  
  const passed = maxHeapMB < THRESHOLDS.MAX_MEMORY_MB;
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: Memory ${maxHeapMB < THRESHOLDS.MAX_MEMORY_MB ? '<' : '>'} ${THRESHOLDS.MAX_MEMORY_MB}MB`);
  
  return {
    testName: 'Memoria Bajo Carga',
    passed,
    avgMemoryMB: avgHeapMB,
    maxMemoryMB: maxHeapMB,
    snapshots: memorySnapshots.length
  };
};

/**
 * Ejecutar todos los tests
 */
const runAllTests = async () => {
  console.log('\n🔥 EJECUTANDO SUITE DE STRESS TESTS');
  console.log('='.repeat(80));
  
  const results = [];
  
  try {
    // Test 1: Normalización Concurrente
    results.push(await testConcurrentNormalization());
    
    // Test 2: Cálculo Intensivo
    results.push(await testIntensiveMetrics());
    
    // Test 3: Memoria Bajo Carga
    results.push(await testMemoryUnderLoad());
    
    // Resumen final
    console.log('\n📊 RESUMEN FINAL');
    console.log('='.repeat(80));
    
    const allPassed = results.every(r => r.passed);
    
    results.forEach(result => {
      console.log(`\n${result.passed ? '✅' : '❌'} ${result.testName}`);
      if (result.totalTime) console.log(`   ⏱️  Tiempo: ${result.totalTime.toFixed(2)}ms`);
      if (result.avgTime) console.log(`   ⚡ Latencia promedio: ${result.avgTime.toFixed(2)}ms`);
      if (result.opsPerSecond) console.log(`   🚀 Throughput: ${result.opsPerSecond.toFixed(2)} ops/s`);
      if (result.maxMemoryMB) console.log(`   💾 Memoria máxima: ${result.maxMemoryMB.toFixed(2)} MB`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n${allPassed ? '🎉 TODOS LOS TESTS PASARON' : '⚠️  ALGUNOS TESTS FALLARON'}`);
    console.log(`Total tests: ${results.length} | Passed: ${results.filter(r => r.passed).length} | Failed: ${results.filter(r => !r.passed).length}`);
    
    // Validación contra targets
    console.log('\n📈 VALIDACIÓN CONTRA TARGETS RC1:');
    console.log(`   FPS target: ≥50 (no medible en Node.js, validar en navegador)`);
    console.log(`   Latency target: ≤1000ms ${results.some(r => r.avgTime && r.avgTime < 1000) ? '✅' : '❌'}`);
    console.log(`   Memory target: ≤500MB ${results.find(r => r.maxMemoryMB)?.maxMemoryMB < 500 ? '✅' : '❌'}`);
    
    console.log('\n' + '='.repeat(80));
    
    return {
      passed: allPassed,
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length
      }
    };
    
  } catch (error) {
    console.error('\n❌ ERROR EN STRESS TEST:', error);
    throw error;
  }
};

// Ejecutar tests
runAllTests()
  .then(result => {
    console.log('\n✅ Stress test completado');
    process.exit(result.passed ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Stress test falló:', error);
    process.exit(1);
  });
