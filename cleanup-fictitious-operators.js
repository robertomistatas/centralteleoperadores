/**
 * 🧹 SCRIPT DE LIMPIEZA PARA TELEOPERADORAS FICTICIAS
 * 
 * Este script puede ejecutarse desde la consola del navegador
 * para eliminar teleoperadoras de prueba sin depender de Firebase.
 * 
 * INSTRUCCIONES:
 * 1. Abrir el navegador en http://localhost:5173/centralteleoperadores/
 * 2. Ir a Herramientas de Desarrollador (F12)
 * 3. Ir a la pestaña "Console"
 * 4. Pegar este código y presionar Enter
 * 5. Seguir las instrucciones que aparezcan en consola
 */

console.log('🧹 SCRIPT DE LIMPIEZA DE TELEOPERADORAS FICTICIAS');
console.log('='.repeat(50));

// Obtener el store de la aplicación
const getAppStore = () => {
  try {
    // Intentar obtener el store desde el contexto global de React
    return window.useAppStore?.getState?.();
  } catch (error) {
    console.error('❌ No se pudo acceder al store de la aplicación:', error);
    return null;
  }
};

// Función principal de limpieza
const cleanupFictitiousOperators = () => {
  console.log('🔍 Buscando teleoperadoras ficticias...');
  
  // Nombres ficticios conocidos (basados en la captura de pantalla)
  const fictitiousPatterns = [
    'javiera reyes alvarado',
    'javiera valdivia',
    'maría gonzález',
    'teleoperadora ejemplo',
    'demo operator',
    'operadora prueba',
    'test operator',
    'reyes alvarado',
    'reyesalvaradojaviera@gmail.com',
    'javiera@teleoperadora.com',
    'maria@teleoperadora.com'
  ];

  // Intentar acceder a los datos de la aplicación desde el DOM
  let operatorsToClean = [];
  
  try {
    // Buscar elementos de teleoperadoras en el DOM
    const operatorCards = document.querySelectorAll('[class*="operator"], [class*="teleoperador"]');
    console.log(`📋 Encontrados ${operatorCards.length} elementos de operadoras en la interfaz`);
    
    // Buscar específicamente tarjetas que contengan nombres ficticios
    operatorCards.forEach((card, index) => {
      const textContent = card.textContent?.toLowerCase() || '';
      
      fictitiousPatterns.forEach(pattern => {
        if (textContent.includes(pattern.toLowerCase())) {
          operatorsToClean.push({
            element: card,
            pattern: pattern,
            index: index,
            text: textContent.substring(0, 100) + '...'
          });
        }
      });
    });

    if (operatorsToClean.length === 0) {
      console.log('✅ No se encontraron teleoperadoras ficticias en la interfaz actual');
      console.log('💡 Asegúrate de estar en el módulo "Asignaciones" para ver las teleoperadoras');
      return;
    }

    console.log(`🎯 Encontradas ${operatorsToClean.length} teleoperadoras ficticias:`);
    operatorsToClean.forEach((op, i) => {
      console.log(`  ${i + 1}. Patrón: "${op.pattern}" -> ${op.text}`);
    });

    // Buscar botones de eliminar asociados
    operatorsToClean.forEach((op, index) => {
      const deleteButton = op.element.querySelector('button[class*="bg-red"], button[title*="liminar"], button[title*="delete"]');
      if (deleteButton) {
        console.log(`🔘 Botón de eliminar encontrado para la operadora ${index + 1}`);
        
        // Agregar evento de click automático (opcional)
        op.deleteButton = deleteButton;
      } else {
        console.log(`⚠️ No se encontró botón de eliminar para la operadora ${index + 1}`);
      }
    });

    // Ofrecer eliminación automática
    if (operatorsToClean.some(op => op.deleteButton)) {
      console.log('\n🤖 ELIMINACIÓN AUTOMÁTICA DISPONIBLE');
      console.log('Para eliminar automáticamente todas las teleoperadoras ficticias, ejecuta:');
      console.log('eliminateAll()');
      
      // Crear función global para eliminación automática
      window.eliminateAll = () => {
        console.log('🚀 Iniciando eliminación automática...');
        
        operatorsToClean.forEach((op, index) => {
          if (op.deleteButton) {
            setTimeout(() => {
              console.log(`🗑️ Eliminando operadora ${index + 1}: ${op.pattern}`);
              op.deleteButton.click();
            }, index * 1000); // Esperar 1 segundo entre eliminaciones
          }
        });
        
        console.log(`✅ Proceso iniciado. Se eliminarán ${operatorsToClean.filter(op => op.deleteButton).length} operadoras en los próximos ${operatorsToClean.length} segundos`);
      };
    }

    // Información adicional
    console.log('\n📋 INFORMACIÓN ADICIONAL:');
    console.log('• Para eliminar manualmente, busca los botones rojos "Eliminar" en cada tarjeta');
    console.log('• Si no ves botones de eliminar, verifica tus permisos de usuario');
    console.log('• El nuevo botón "Limpiar Ficticias" en el módulo hace esto automáticamente');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    console.log('\n🔧 SOLUCIÓN ALTERNATIVA:');
    console.log('1. Ve al módulo "Asignaciones"');
    console.log('2. Busca el botón rojo "Limpiar Ficticias" en la parte superior');
    console.log('3. Haz clic para eliminar automáticamente todas las teleoperadoras de prueba');
  }
};

// Ejecutar el script
cleanupFictitiousOperators();

// Función de ayuda
window.helpCleanup = () => {
  console.log('🆘 AYUDA - LIMPIEZA DE TELEOPERADORAS FICTICIAS');
  console.log('='.repeat(50));
  console.log('1. cleanupFictitiousOperators() - Ejecutar análisis de limpieza');
  console.log('2. eliminateAll() - Eliminar automáticamente (si está disponible)');
  console.log('3. helpCleanup() - Mostrar esta ayuda');
  console.log('\n📍 Ubicación del botón automático:');
  console.log('   Módulo Asignaciones → Botón rojo "Limpiar Ficticias"');
};

console.log('\n✅ Script cargado correctamente');
console.log('💡 Ejecuta helpCleanup() para ver más opciones');