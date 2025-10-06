/**
 * 🔍 SCRIPT DE VERIFICACIÓN DE TELEOPERADORAS
 * 
 * Este script verifica el estado actual de las teleoperadoras en Firebase
 * y detecta posibles teleoperadoras ficticias que deban eliminarse.
 * 
 * INSTRUCCIONES:
 * 1. Ejecutar desde la consola del navegador en la app corriendo
 * 2. O ejecutar con: node verify-operators.js (requiere configuración)
 */

console.log('🔍 VERIFICACIÓN DE TELEOPERADORAS EN FIREBASE');
console.log('='.repeat(60));

/**
 * Función para verificar operadores desde la consola del navegador
 */
const verifyOperatorsInBrowser = async () => {
  try {
    console.log('📥 Obteniendo operadores desde Firebase...\n');
    
    // Importar el servicio
    const { operatorService } = await import('./src/firestoreService.js');
    
    // Obtener todos los operadores
    const operators = await operatorService.getAll();
    
    console.log(`📊 Total de operadores en Firebase: ${operators.length}\n`);
    
    if (operators.length === 0) {
      console.log('⚠️ No se encontraron operadores en Firebase');
      return;
    }
    
    // Nombres conocidos de operadores ficticios
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
    
    // Clasificar operadores
    const realOperators = [];
    const fictitiousOperators = [];
    
    operators.forEach(operator => {
      const name = operator.name?.toLowerCase() || '';
      const email = operator.email?.toLowerCase() || '';
      
      const isFictitious = fictitiousPatterns.some(pattern => 
        name.includes(pattern.toLowerCase()) || 
        email.includes(pattern.toLowerCase())
      );
      
      if (isFictitious) {
        fictitiousOperators.push(operator);
      } else {
        realOperators.push(operator);
      }
    });
    
    // Mostrar operadores reales
    console.log('✅ OPERADORES REALES:', realOperators.length);
    console.log('-'.repeat(60));
    realOperators.forEach((op, index) => {
      console.log(`${index + 1}. ${op.name}`);
      console.log(`   📧 Email: ${op.email}`);
      console.log(`   🆔 ID: ${op.id}`);
      console.log(`   📅 Creado: ${op.createdAt?.toDate?.() || 'Fecha no disponible'}`);
      console.log('');
    });
    
    // Mostrar operadores ficticios
    if (fictitiousOperators.length > 0) {
      console.log('⚠️ OPERADORES FICTICIOS DETECTADOS:', fictitiousOperators.length);
      console.log('-'.repeat(60));
      fictitiousOperators.forEach((op, index) => {
        console.log(`${index + 1}. ${op.name}`);
        console.log(`   📧 Email: ${op.email}`);
        console.log(`   🆔 ID: ${op.id}`);
        console.log(`   📅 Creado: ${op.createdAt?.toDate?.() || 'Fecha no disponible'}`);
        console.log('');
      });
      
      console.log('\n🔧 ACCIÓN RECOMENDADA:');
      console.log('1. Ir al módulo "Asignaciones" en la aplicación');
      console.log('2. Hacer clic en el botón rojo "Limpiar Ficticias"');
      console.log('3. O eliminar manualmente cada operador ficticio');
      console.log('\n💡 También puedes ejecutar: cleanupFictitiousOperators()');
    } else {
      console.log('✅ No se encontraron operadores ficticios');
      console.log('✨ La base de datos está limpia');
    }
    
    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');
    console.log(`   Total: ${operators.length}`);
    console.log(`   Reales: ${realOperators.length}`);
    console.log(`   Ficticios: ${fictitiousOperators.length}`);
    console.log('='.repeat(60));
    
    return {
      total: operators.length,
      real: realOperators,
      fictitious: fictitiousOperators
    };
    
  } catch (error) {
    console.error('❌ Error al verificar operadores:', error);
    console.log('\n💡 SOLUCIÓN:');
    console.log('1. Asegúrate de estar en la página de la aplicación');
    console.log('2. Verifica que tengas permisos de Firebase configurados');
    console.log('3. Revisa la consola para más detalles del error');
  }
};

/**
 * Función para limpiar operadores ficticios (solo desde navegador)
 */
const cleanupFictitiousOperators = async () => {
  try {
    console.log('🧹 Iniciando limpieza de operadores ficticios...\n');
    
    // Verificar primero
    const verification = await verifyOperatorsInBrowser();
    
    if (!verification || verification.fictitious.length === 0) {
      console.log('✅ No hay operadores ficticios para eliminar');
      return;
    }
    
    const fictitiousCount = verification.fictitious.length;
    const confirmMsg = `¿Estás seguro de que deseas eliminar ${fictitiousCount} operadores ficticios?`;
    
    if (!confirm(confirmMsg)) {
      console.log('❌ Limpieza cancelada por el usuario');
      return;
    }
    
    console.log(`🗑️ Eliminando ${fictitiousCount} operadores ficticios...`);
    
    const { operatorService } = await import('./src/firestoreService.js');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const operator of verification.fictitious) {
      try {
        console.log(`🗑️ Eliminando: ${operator.name}...`);
        const result = await operatorService.delete(operator.id);
        
        if (result) {
          successCount++;
          console.log(`   ✅ Eliminado exitosamente`);
        } else {
          errorCount++;
          console.log(`   ❌ Error al eliminar`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error:`, error.message);
      }
      
      // Pausa entre eliminaciones
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ LIMPIEZA COMPLETADA');
    console.log(`   Exitosas: ${successCount}`);
    console.log(`   Errores: ${errorCount}`);
    console.log('='.repeat(60));
    
    console.log('\n🔄 Recarga la página para ver los cambios reflejados');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
};

// Exportar funciones globalmente para uso en consola
if (typeof window !== 'undefined') {
  window.verifyOperators = verifyOperatorsInBrowser;
  window.cleanupFictitiousOperators = cleanupFictitiousOperators;
  
  console.log('✅ Funciones disponibles:');
  console.log('   • verifyOperators() - Verificar estado actual');
  console.log('   • cleanupFictitiousOperators() - Limpiar operadores ficticios');
  console.log('\n💡 Ejecuta verifyOperators() para comenzar');
}

// Auto-ejecutar si se carga como módulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    verifyOperatorsInBrowser,
    cleanupFictitiousOperators
  };
}
