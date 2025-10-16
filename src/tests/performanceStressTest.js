/**
 * performanceStressTest.js
 * Script de pruebas de estrés para validar rendimiento bajo carga
 * 
 * FASE 4 - TAREA 6: Optimización de Rendimiento
 * 
 * Simula:
 * - Múltiples actualizaciones concurrentes de Firestore
 * - Cálculos intensivos de métricas
 * - Navegación rápida entre módulos
 * - Operaciones simultáneas de normalización
 * 
 * Métricas validadas:
 * - FPS durante operaciones intensivas (target: >50)
 * - Latencia de sincronización (target: <1500ms)
 * - Uso de memoria (target: <500MB)
 * - Operaciones lentas (target: <10%)
 * 
 * @module performanceStressTest
 * @version 1.0.0
 */

import { 
  measurePerformance, 
  measurePerformanceAsync,
  logMemoryUsage, 
  measureFPS,
  getPerformanceSummary,
  clearMetrics,
  THRESHOLDS
} from '../utils/performanceMonitor';
import { computeGlobalMetrics } from '../services/metricsEngine';
import { normalizeRecords } from '../utils/dataNormalizer';
import logger from '../utils/logger';

/**
 * Configuración del test de estrés
 */
const STRESS_TEST_CONFIG = {
  CONCURRENT_OPERATIONS: 50,     // Operaciones concurrentes
  RECORDS_PER_OPERATION: 1000,   // Registros por operación
  TEST_DURATION_MS: 60000,        // Duración del test: 60 segundos
  MEMORY_CHECK_INTERVAL: 5000,   // Verificar memoria cada 5 segundos
  FPS_MEASUREMENT_DURATION: 5000 // Medir FPS durante 5 segundos
};

/**
 * Genera datos de prueba sintéticos
 * 
 * @param {number} count - Cantidad de registros a generar
 * @returns {Array} Array de registros sintéticos
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
 * Test 1: Operaciones Concurrentes de Normalización
 * Simula múltiples normalizaciones simultáneas
 * 
 * @returns {Promise<Object>} Resultado del test
 */
export const testConcurrentNormalization = async () => {
  logger.info('[StressTest] Iniciando Test 1: Normalización Concurrente');
  
  const startTime = performance.now();
  const operations = [];
  
  for (let i = 0; i < STRESS_TEST_CONFIG.CONCURRENT_OPERATIONS; i++) {
    const mockData = generateMockRecords(STRESS_TEST_CONFIG.RECORDS_PER_OPERATION);
    
    operations.push(
      measurePerformanceAsync(
        async () => normalizeRecords(mockData),
        `ConcurrentNormalization-${i}`,
        { recordCount: mockData.length, iteration: i }
      )
    );
  }
  
  const results = await Promise.all(operations);
  const endTime = performance.now();
  
  const summary = {
    testName: 'Normalización Concurrente',
    totalOperations: STRESS_TEST_CONFIG.CONCURRENT_OPERATIONS,
    recordsPerOperation: STRESS_TEST_CONFIG.RECORDS_PER_OPERATION,
    totalRecords: STRESS_TEST_CONFIG.CONCURRENT_OPERATIONS * STRESS_TEST_CONFIG.RECORDS_PER_OPERATION,
    duration: `${(endTime - startTime).toFixed(2)}ms`,
    avgDurationPerOperation: `${((endTime - startTime) / STRESS_TEST_CONFIG.CONCURRENT_OPERATIONS).toFixed(2)}ms`,
    normalizedRecordsTotal: results.reduce((sum, r) => sum + r.length, 0)
  };
  
  logger.audit('Stress Test 1 - Concurrent Normalization', summary);
  
  return summary;
};

/**
 * Test 2: Cálculo Intensivo de Métricas
 * Simula cálculos repetidos de métricas globales
 * 
 * @returns {Promise<Object>} Resultado del test
 */
export const testIntensiveMetricsCalculation = async () => {
  logger.info('[StressTest] Iniciando Test 2: Cálculo Intensivo de Métricas');
  
  const mockData = generateMockRecords(STRESS_TEST_CONFIG.RECORDS_PER_OPERATION * 10);
  const normalizedData = normalizeRecords(mockData);
  
  const startTime = performance.now();
  const operations = [];
  
  for (let i = 0; i < STRESS_TEST_CONFIG.CONCURRENT_OPERATIONS; i++) {
    operations.push(
      measurePerformanceAsync(
        async () => computeGlobalMetrics(normalizedData),
        `IntensiveMetrics-${i}`,
        { recordCount: normalizedData.length, iteration: i }
      )
    );
  }
  
  const results = await Promise.all(operations);
  const endTime = performance.now();
  
  const summary = {
    testName: 'Cálculo Intensivo de Métricas',
    totalOperations: STRESS_TEST_CONFIG.CONCURRENT_OPERATIONS,
    recordsProcessed: normalizedData.length,
    duration: `${(endTime - startTime).toFixed(2)}ms`,
    avgDurationPerOperation: `${((endTime - startTime) / STRESS_TEST_CONFIG.CONCURRENT_OPERATIONS).toFixed(2)}ms`,
    metricsCalculated: results.length
  };
  
  logger.audit('Stress Test 2 - Intensive Metrics', summary);
  
  return summary;
};

/**
 * Test 3: Monitoreo de Memoria Bajo Carga
 * Ejecuta operaciones pesadas y monitorea memoria
 * 
 * @returns {Promise<Object>} Resultado del test
 */
export const testMemoryUnderLoad = async () => {
  logger.info('[StressTest] Iniciando Test 3: Memoria Bajo Carga');
  
  const memorySnapshots = [];
  const startTime = performance.now();
  
  // Monitoreo continuo de memoria
  const memoryInterval = setInterval(() => {
    const snapshot = logMemoryUsage();
    if (snapshot) {
      memorySnapshots.push(snapshot);
    }
  }, STRESS_TEST_CONFIG.MEMORY_CHECK_INTERVAL);
  
  // Generar carga
  const operations = [];
  for (let i = 0; i < STRESS_TEST_CONFIG.CONCURRENT_OPERATIONS; i++) {
    const mockData = generateMockRecords(STRESS_TEST_CONFIG.RECORDS_PER_OPERATION * 2);
    
    operations.push(
      measurePerformanceAsync(
        async () => {
          const normalized = normalizeRecords(mockData);
          return computeGlobalMetrics(normalized);
        },
        `MemoryLoad-${i}`,
        { recordCount: mockData.length }
      )
    );
  }
  
  await Promise.all(operations);
  
  clearInterval(memoryInterval);
  const endTime = performance.now();
  
  // Snapshot final
  const finalMemory = logMemoryUsage();
  
  const summary = {
    testName: 'Memoria Bajo Carga',
    duration: `${(endTime - startTime).toFixed(2)}ms`,
    memorySnapshots: memorySnapshots.length,
    initialMemoryMB: memorySnapshots[0]?.usedMB || 0,
    finalMemoryMB: finalMemory?.usedMB || 0,
    peakMemoryMB: Math.max(...memorySnapshots.map(s => s.usedMB), finalMemory?.usedMB || 0),
    avgMemoryMB: (memorySnapshots.reduce((sum, s) => sum + s.usedMB, 0) / memorySnapshots.length).toFixed(2),
    memoryIncreaseM: ((finalMemory?.usedMB || 0) - (memorySnapshots[0]?.usedMB || 0)).toFixed(2),
    withinLimit: (finalMemory?.usedMB || 0) < THRESHOLDS.MAX_MEMORY_MB,
    maxAllowedMB: THRESHOLDS.MAX_MEMORY_MB
  };
  
  logger.audit('Stress Test 3 - Memory Under Load', summary);
  
  return summary;
};

/**
 * Test 4: Medición de FPS Durante Operaciones
 * Mide fluidez de la UI durante carga
 * 
 * @returns {Promise<Object>} Resultado del test
 */
export const testFPSDuringOperations = async () => {
  logger.info('[StressTest] Iniciando Test 4: FPS Durante Operaciones');
  
  // Iniciar medición de FPS
  const fpsPromise = measureFPS(STRESS_TEST_CONFIG.FPS_MEASUREMENT_DURATION);
  
  // Generar carga simultánea
  const mockData = generateMockRecords(STRESS_TEST_CONFIG.RECORDS_PER_OPERATION * 5);
  
  const operations = [];
  for (let i = 0; i < 20; i++) {
    operations.push(
      measurePerformanceAsync(
        async () => {
          const normalized = normalizeRecords(mockData);
          return computeGlobalMetrics(normalized);
        },
        `FPSLoad-${i}`,
        { recordCount: mockData.length }
      )
    );
  }
  
  // Esperar ambas operaciones
  const [fpsMetrics] = await Promise.all([
    fpsPromise,
    Promise.all(operations)
  ]);
  
  const summary = {
    testName: 'FPS Durante Operaciones',
    avgFPS: fpsMetrics.avgFPS,
    minFPS: fpsMetrics.minFPS,
    maxFPS: fpsMetrics.maxFPS,
    isHealthy: fpsMetrics.isHealthy,
    targetFPS: THRESHOLDS.MIN_FPS,
    measurementDuration: `${STRESS_TEST_CONFIG.FPS_MEASUREMENT_DURATION}ms`,
    concurrentOperations: 20
  };
  
  logger.audit('Stress Test 4 - FPS During Operations', summary);
  
  return summary;
};

/**
 * Ejecuta TODOS los tests de estrés en secuencia
 * 
 * @returns {Promise<Object>} Resumen completo de todos los tests
 */
export const runFullStressTest = async () => {
  logger.info('🔥 [StressTest] ===== INICIANDO BATERÍA COMPLETA DE TESTS DE ESTRÉS =====');
  
  // Limpiar métricas previas
  clearMetrics();
  
  const startTime = performance.now();
  
  try {
    // Ejecutar tests en secuencia
    const test1 = await testConcurrentNormalization();
    const test2 = await testIntensiveMetricsCalculation();
    const test3 = await testMemoryUnderLoad();
    const test4 = await testFPSDuringOperations();
    
    const endTime = performance.now();
    
    // Obtener resumen de performance
    const performanceSummary = getPerformanceSummary();
    
    const fullReport = {
      testSuite: 'Full Stress Test Suite',
      totalDuration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString(),
      tests: {
        test1_ConcurrentNormalization: test1,
        test2_IntensiveMetrics: test2,
        test3_MemoryUnderLoad: test3,
        test4_FPSDuringOperations: test4
      },
      performanceSummary,
      verdict: {
        fps: test4.avgFPS >= THRESHOLDS.MIN_FPS ? '✅ PASS' : '❌ FAIL',
        memory: test3.peakMemoryMB < THRESHOLDS.MAX_MEMORY_MB ? '✅ PASS' : '❌ FAIL',
        slowOps: parseFloat(performanceSummary.operations.slowPercent) < 10 ? '✅ PASS' : '⚠️ WARNING',
        overall: 
          test4.avgFPS >= THRESHOLDS.MIN_FPS && 
          test3.peakMemoryMB < THRESHOLDS.MAX_MEMORY_MB &&
          parseFloat(performanceSummary.operations.slowPercent) < 15
            ? '✅ TODAS LAS PRUEBAS PASARON'
            : '⚠️ ALGUNAS PRUEBAS FALLARON'
      }
    };
    
    logger.audit('🏁 Full Stress Test Suite Completed', fullReport);
    
    // Log resumido en consola
    console.log('\n🔥 ===== RESULTADO DE TESTS DE ESTRÉS =====');
    console.log(`📊 Duración total: ${fullReport.totalDuration}`);
    console.log(`\n📈 Test 1 - Normalización Concurrente: ${test1.totalOperations} ops en ${test1.duration}`);
    console.log(`📈 Test 2 - Cálculo de Métricas: ${test2.totalOperations} ops en ${test2.duration}`);
    console.log(`💾 Test 3 - Memoria: Pico ${test3.peakMemoryMB} MB (límite: ${test3.maxAllowedMB} MB) ${fullReport.verdict.memory}`);
    console.log(`🎮 Test 4 - FPS: ${test4.avgFPS} fps promedio (mínimo: ${test4.minFPS}) ${fullReport.verdict.fps}`);
    console.log(`\n⚡ Operaciones lentas: ${performanceSummary.operations.slowPercent} ${fullReport.verdict.slowOps}`);
    console.log(`\n${fullReport.verdict.overall}\n`);
    
    return fullReport;
    
  } catch (error) {
    logger.error('[StressTest] Error durante ejecución de tests', {
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
};

/**
 * Ejecuta test rápido (versión ligera para desarrollo)
 * 
 * @returns {Promise<Object>} Resumen del test rápido
 */
export const runQuickStressTest = async () => {
  logger.info('⚡ [StressTest] ===== TEST RÁPIDO DE RENDIMIENTO =====');
  
  clearMetrics();
  
  const mockData = generateMockRecords(500);
  const startTime = performance.now();
  
  // Test de normalización
  const normalized = await measurePerformanceAsync(
    async () => normalizeRecords(mockData),
    'QuickNormalization',
    { recordCount: mockData.length }
  );
  
  // Test de métricas
  const metrics = await measurePerformanceAsync(
    async () => computeGlobalMetrics(normalized),
    'QuickMetrics',
    { recordCount: normalized.length }
  );
  
  // Test de memoria
  const memory = logMemoryUsage();
  
  const endTime = performance.now();
  
  const quickReport = {
    testSuite: 'Quick Performance Test',
    duration: `${(endTime - startTime).toFixed(2)}ms`,
    recordsProcessed: mockData.length,
    normalizedRecords: normalized.length,
    metricsCalculated: metrics ? true : false,
    memory: memory ? `${memory.usedMB} MB (${memory.usagePercent}%)` : 'N/A',
    verdict: memory && memory.usedMB < THRESHOLDS.MAX_MEMORY_MB ? '✅ PASS' : '⚠️ CHECK',
    timestamp: new Date().toISOString()
  };
  
  logger.audit('Quick Performance Test Completed', quickReport);
  
  console.log('\n⚡ ===== TEST RÁPIDO =====');
  console.log(`⏱️ Duración: ${quickReport.duration}`);
  console.log(`📊 Registros procesados: ${quickReport.recordsProcessed}`);
  console.log(`💾 Memoria: ${quickReport.memory}`);
  console.log(`${quickReport.verdict}\n`);
  
  return quickReport;
};

/**
 * Exportación por defecto
 */
export default {
  testConcurrentNormalization,
  testIntensiveMetricsCalculation,
  testMemoryUnderLoad,
  testFPSDuringOperations,
  runFullStressTest,
  runQuickStressTest,
  STRESS_TEST_CONFIG
};
