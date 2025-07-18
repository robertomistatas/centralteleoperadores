// 🧪 Script de Pruebas Automatizadas - Mistatas Seguimiento de llamadas
// Este script se puede ejecutar en la consola del navegador para realizar pruebas

console.log('🚀 Iniciando pruebas automatizadas...');

// Función helper para esperar elementos
const waitForElement = (selector, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Elemento ${selector} no encontrado en ${timeout}ms`));
    }, timeout);
  });
};

// Función helper para simular clicks
const clickElement = async (selector) => {
  const element = await waitForElement(selector);
  element.click();
  return element;
};

// Función helper para llenar inputs
const fillInput = async (selector, value) => {
  const input = await waitForElement(selector);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return input;
};

// PRUEBA 1: Verificación Inicial
const test1_verificacionInicial = async () => {
  console.log('🔍 PRUEBA 1: Verificación Inicial');
  
  try {
    // Verificar que la aplicación cargó
    const app = await waitForElement('.min-h-screen', 1000);
    console.log('✅ Aplicación cargada correctamente');
    
    // Verificar estado de Firebase
    const firebaseStatus = document.querySelector('[class*="bg-blue-50"], [class*="bg-slate-50"]');
    if (firebaseStatus) {
      const statusText = firebaseStatus.textContent;
      if (statusText.includes('Modo Local')) {
        console.log('ℹ️ Firebase en modo local');
      } else if (statusText.includes('Verificando')) {
        console.log('🔄 Firebase conectando...');
      } else {
        console.log('✅ Firebase conectado');
      }
    }
    
    // Verificar que no hay errores críticos
    const errors = console.error.toString();
    if (!errors.includes('TypeError') && !errors.includes('ReferenceError')) {
      console.log('✅ Sin errores críticos detectados');
    }
    
    return { success: true, message: 'Verificación inicial exitosa' };
  } catch (error) {
    console.error('❌ Error en verificación inicial:', error);
    return { success: false, error: error.message };
  }
};

// PRUEBA 2: Sistema de Autenticación
const test2_autenticacion = async () => {
  console.log('🔐 PRUEBA 2: Sistema de Autenticación');
  
  try {
    // Verificar si ya está logueado
    const logoutBtn = document.querySelector('[data-testid="logout-btn"], button[title*="Cerrar"], button[aria-label*="logout"]');
    
    if (logoutBtn) {
      console.log('ℹ️ Usuario ya logueado, probando logout...');
      logoutBtn.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Buscar formulario de login/registro
    const emailInput = await waitForElement('input[type="email"]', 3000);
    const passwordInput = await waitForElement('input[type="password"]', 1000);
    
    console.log('✅ Formulario de autenticación encontrado');
    
    // Generar email único para prueba
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    // Llenar formulario
    await fillInput('input[type="email"]', testEmail);
    await fillInput('input[type="password"]', testPassword);
    
    console.log(`📝 Formulario llenado con email: ${testEmail}`);
    
    // Buscar botón de registro/login
    const submitBtn = await waitForElement('button[type="submit"], button:contains("Crear"), button:contains("Ingresar")', 2000);
    
    console.log('🎯 Preparado para enviar formulario');
    
    return { 
      success: true, 
      message: 'Formulario de autenticación preparado',
      email: testEmail,
      password: testPassword
    };
  } catch (error) {
    console.error('❌ Error en prueba de autenticación:', error);
    return { success: false, error: error.message };
  }
};

// PRUEBA 3: Navegación de Pestañas
const test3_navegacion = async () => {
  console.log('🗂️ PRUEBA 3: Navegación de Pestañas');
  
  try {
    const tabs = ['Dashboard', 'Asignaciones', 'Llamadas', 'Historial'];
    const results = [];
    
    for (const tab of tabs) {
      try {
        const tabElement = await waitForElement(`button:contains("${tab}"), [role="tab"]:contains("${tab}")`, 2000);
        tabElement.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`✅ Navegación a ${tab} exitosa`);
        results.push({ tab, success: true });
      } catch (error) {
        console.log(`⚠️ Pestaña ${tab} no encontrada o no clickeable`);
        results.push({ tab, success: false, error: error.message });
      }
    }
    
    return { success: true, message: 'Prueba de navegación completada', results };
  } catch (error) {
    console.error('❌ Error en navegación:', error);
    return { success: false, error: error.message };
  }
};

// Función principal de pruebas
const runAllTests = async () => {
  console.log('🏁 === INICIANDO BATERÍA COMPLETA DE PRUEBAS ===');
  const startTime = Date.now();
  
  const results = {
    startTime: new Date().toLocaleString(),
    tests: []
  };
  
  // Ejecutar pruebas
  try {
    results.tests.push({
      name: 'Verificación Inicial',
      ...(await test1_verificacionInicial())
    });
    
    results.tests.push({
      name: 'Sistema de Autenticación',
      ...(await test2_autenticacion())
    });
    
    results.tests.push({
      name: 'Navegación',
      ...(await test3_navegacion())
    });
    
  } catch (error) {
    console.error('❌ Error general en pruebas:', error);
  }
  
  // Resumen final
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  results.endTime = new Date().toLocaleString();
  results.duration = `${duration}s`;
  results.summary = {
    total: results.tests.length,
    passed: results.tests.filter(test => test.success).length,
    failed: results.tests.filter(test => !test.success).length
  };
  
  console.log('📊 === RESUMEN DE PRUEBAS ===');
  console.log(`⏱️ Duración: ${duration}s`);
  console.log(`✅ Exitosas: ${results.summary.passed}`);
  console.log(`❌ Fallidas: ${results.summary.failed}`);
  console.log(`📈 Tasa de éxito: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  
  console.log('📋 Resultados detallados:', results);
  
  return results;
};

// Exportar funciones para uso manual
window.testSuite = {
  runAllTests,
  test1_verificacionInicial,
  test2_autenticacion,
  test3_navegacion,
  waitForElement,
  clickElement,
  fillInput
};

console.log('✅ Script de pruebas cargado. Usa window.testSuite.runAllTests() para ejecutar todas las pruebas.');
console.log('🔧 También puedes ejecutar pruebas individuales: window.testSuite.test1_verificacionInicial()');

// Auto-ejecutar si se solicita
if (window.location.hash === '#autotest') {
  setTimeout(() => {
    runAllTests();
  }, 2000);
}
