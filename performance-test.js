/**
 * Script de Verificación de Rendimiento
 * Mide los tiempos de carga y procesamiento de la aplicación optimizada
 */

// Herramientas de medición de rendimiento
const PerformanceMonitor = {
  timers: new Map(),
  
  // Iniciar medición
  start(label) {
    this.timers.set(label, performance.now());
    console.log(`⏱️ Iniciando medición: ${label}`);
  },
  
  // Finalizar medición
  end(label) {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      const seconds = (duration / 1000).toFixed(2);
      console.log(`✅ ${label}: ${seconds}s (${duration.toFixed(2)}ms)`);
      this.timers.delete(label);
      return duration;
    }
    return 0;
  },
  
  // Medir función
  measure(label, fn) {
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  },
  
  // Medir función async
  async measureAsync(label, fn) {
    this.start(label);
    const result = await fn();
    this.end(label);
    return result;
  }
};

// Verificaciones de rendimiento
const PerformanceTests = {
  
  // Test 1: Tiempo de carga inicial
  testInitialLoad() {
    PerformanceMonitor.start('Carga inicial de la aplicación');
    
    // Simular verificación cuando la app esté lista
    window.addEventListener('load', () => {
      setTimeout(() => {
        PerformanceMonitor.end('Carga inicial de la aplicación');
      }, 100);
    });
  },
  
  // Test 2: Procesamiento de datos grandes
  testDataProcessing(dataSize = 1000) {
    const testData = Array.from({ length: dataSize }, (_, i) => ({
      id: i,
      beneficiary: `Beneficiario ${i}`,
      phone: `9876543${String(i).padStart(2, '0')}`,
      operator: `Operadora ${i % 5}`,
      result: i % 3 === 0 ? 'Llamado exitoso' : 'Sin respuesta'
    }));
    
    return PerformanceMonitor.measure(
      `Procesamiento de ${dataSize} registros`,
      () => {
        // Simular procesamiento optimizado
        const phoneMap = new Map();
        const results = testData.map(item => {
          phoneMap.set(item.phone, item.operator);
          return {
            ...item,
            processed: true
          };
        });
        return results;
      }
    );
  },
  
  // Test 3: Búsquedas optimizadas
  testOptimizedSearch(dataSize = 10000) {
    // Crear dataset de prueba
    const testData = new Map();
    for (let i = 0; i < dataSize; i++) {
      testData.set(`phone${i}`, `operator${i % 100}`);
    }
    
    return PerformanceMonitor.measure(
      `Búsqueda optimizada en ${dataSize} registros`,
      () => {
        // 1000 búsquedas aleatorias
        let found = 0;
        for (let i = 0; i < 1000; i++) {
          const randomKey = `phone${Math.floor(Math.random() * dataSize)}`;
          if (testData.get(randomKey)) {
            found++;
          }
        }
        return found;
      }
    );
  },
  
  // Test 4: Memoria utilizada
  testMemoryUsage() {
    if (performance.memory) {
      const beforeSize = performance.memory.usedJSHeapSize;
      console.log(`📊 Memoria inicial: ${(beforeSize / 1024 / 1024).toFixed(2)} MB`);
      
      // Simular carga de datos
      const testData = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        data: `Test data ${i}`.repeat(10)
      }));
      
      setTimeout(() => {
        const afterSize = performance.memory.usedJSHeapSize;
        const difference = afterSize - beforeSize;
        console.log(`📊 Memoria después: ${(afterSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📊 Incremento: ${(difference / 1024 / 1024).toFixed(2)} MB`);
        
        // Cleanup
        testData.length = 0;
      }, 100);
    } else {
      console.log('⚠️ API de memoria no disponible');
    }
  },
  
  // Test 5: Comparar métodos de búsqueda
  compareSearchMethods(dataSize = 1000) {
    const testArray = Array.from({ length: dataSize }, (_, i) => ({
      id: i,
      name: `Item ${i}`
    }));
    
    const testMap = new Map(testArray.map(item => [item.id, item]));
    
    // Test búsqueda en Array (O(n))
    const arrayTime = PerformanceMonitor.measure(
      'Búsqueda en Array (método anterior)',
      () => {
        let found = 0;
        for (let i = 0; i < 100; i++) {
          const randomId = Math.floor(Math.random() * dataSize);
          if (testArray.find(item => item.id === randomId)) {
            found++;
          }
        }
        return found;
      }
    );
    
    // Test búsqueda en Map (O(1))
    const mapTime = PerformanceMonitor.measure(
      'Búsqueda en Map (método optimizado)',
      () => {
        let found = 0;
        for (let i = 0; i < 100; i++) {
          const randomId = Math.floor(Math.random() * dataSize);
          if (testMap.get(randomId)) {
            found++;
          }
        }
        return found;
      }
    );
    
    const improvement = ((arrayTime - mapTime) / arrayTime * 100).toFixed(1);
    console.log(`🚀 Mejora de rendimiento: ${improvement}% más rápido`);
    
    return { arrayTime, mapTime, improvement };
  },
  
  // Ejecutar todos los tests
  runAllTests() {
    console.log('🧪 Iniciando tests de rendimiento...\n');
    
    this.testInitialLoad();
    
    setTimeout(() => {
      this.testDataProcessing(1000);
      this.testDataProcessing(5000);
      this.testOptimizedSearch(10000);
      this.testMemoryUsage();
      this.compareSearchMethods(1000);
      
      console.log('\n✅ Tests de rendimiento completados');
    }, 1000);
  }
};

// Exponer herramientas globalmente para testing manual
window.PerformanceMonitor = PerformanceMonitor;
window.PerformanceTests = PerformanceTests;

// Ejecutar tests automáticamente si se importa el script
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Ejecutar tests después de que la app esté cargada
    setTimeout(() => {
      PerformanceTests.runAllTests();
    }, 2000);
  });
}

// Instrucciones de uso
console.log(`
🔧 HERRAMIENTAS DE RENDIMIENTO CARGADAS

Para usar manualmente:
- PerformanceMonitor.start('nombre'): Iniciar medición
- PerformanceMonitor.end('nombre'): Finalizar medición
- PerformanceTests.runAllTests(): Ejecutar todos los tests
- PerformanceTests.compareSearchMethods(1000): Comparar métodos

Ejemplo:
PerformanceMonitor.start('Mi operación');
// ... código a medir ...
PerformanceMonitor.end('Mi operación');
`);

export { PerformanceMonitor, PerformanceTests };
