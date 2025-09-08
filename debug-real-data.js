// DIAGNÓSTICO DE DATOS REALES - Sin estimaciones
// Este script analiza los datos exactos del Excel sin mapeos artificiales

console.log('=== DIAGNÓSTICO DE DATOS REALES ===');

// Función para analizar el contenido real del Excel
function analyzeRealData(callData) {
    console.log('\n🔍 ANÁLISIS DE ESTRUCTURA DE DATOS:');
    console.log(`Total de llamadas procesadas: ${callData.length}`);
    
    // Mostrar estructura de las primeras 5 llamadas
    console.log('\n📋 ESTRUCTURA DE LAS PRIMERAS 5 LLAMADAS:');
    callData.slice(0, 5).forEach((call, index) => {
        console.log(`\nLlamada ${index + 1}:`);
        console.log('  Todas las propiedades:', Object.keys(call));
        console.log('  Operadora posible:', call.operador || call.operator || call.teleoperadora || 'NO ENCONTRADA');
        console.log('  Beneficiario:', call.beneficiario || call.beneficiary || call.nombre || 'NO ENCONTRADO');
        console.log('  Teléfono:', call.telefono || call.phone || call.numero || 'NO ENCONTRADO');
        console.log('  Resultado:', call.resultado || call.result || call.estado || 'NO ENCONTRADO');
        console.log('  Duración:', call.duracion || call.duration || 'NO ENCONTRADA');
    });
    
    // Análisis de operadoras reales en los datos
    console.log('\n👥 ANÁLISIS DE OPERADORAS EN LOS DATOS:');
    const operatorsInData = new Set();
    const operatorFields = ['operador', 'operator', 'teleoperadora', 'operadora'];
    
    callData.forEach(call => {
        operatorFields.forEach(field => {
            if (call[field] && call[field] !== 'No identificado' && call[field] !== 'N/A') {
                operatorsInData.add(call[field]);
            }
        });
    });
    
    console.log('Operadoras encontradas en datos reales:', Array.from(operatorsInData));
    console.log('Cantidad de operadoras únicas:', operatorsInData.size);
    
    // Conteo por operadora real
    if (operatorsInData.size > 0) {
        console.log('\n📊 CONTEO REAL POR OPERADORA:');
        const operatorCounts = {};
        
        Array.from(operatorsInData).forEach(op => {
            operatorCounts[op] = {
                total: 0,
                exitosas: 0,
                fallidas: 0
            };
        });
        
        callData.forEach(call => {
            const operator = call.operador || call.operator || call.teleoperadora || null;
            const result = call.resultado || call.result || call.estado || '';
            const duration = parseInt(call.duracion || call.duration || 0);
            const isSuccessful = (result === 'Llamado exitoso' || result === 'exitoso' || result === 'Exitoso') && duration > 0;
            
            if (operator && operatorCounts[operator]) {
                operatorCounts[operator].total++;
                if (isSuccessful) {
                    operatorCounts[operator].exitosas++;
                } else {
                    operatorCounts[operator].fallidas++;
                }
            }
        });
        
        Object.entries(operatorCounts).forEach(([operator, counts]) => {
            const successRate = counts.total > 0 ? ((counts.exitosas / counts.total) * 100).toFixed(1) : '0.0';
            console.log(`${operator}: ${counts.total} llamadas (${counts.exitosas} exitosas, ${counts.fallidas} fallidas) - ${successRate}% éxito`);
        });
    } else {
        console.log('⚠️  NO SE ENCONTRARON OPERADORAS EN LOS DATOS REALES');
        console.log('   Esto significa que el Excel no contiene información de operadoras por llamada');
        console.log('   El sistema actual está usando estimaciones basadas en mapeo de teléfonos');
    }
    
    // Análisis de campos disponibles
    console.log('\n🔧 TODOS LOS CAMPOS DISPONIBLES EN LOS DATOS:');
    const allFields = new Set();
    callData.forEach(call => {
        Object.keys(call).forEach(key => allFields.add(key));
    });
    console.log('Campos encontrados:', Array.from(allFields).sort());
    
    return {
        totalCalls: callData.length,
        operatorsFound: Array.from(operatorsInData),
        hasRealOperatorData: operatorsInData.size > 0,
        allFields: Array.from(allFields)
    };
}

// Exportar para uso en el navegador
if (typeof window !== 'undefined') {
    window.analyzeRealData = analyzeRealData;
    console.log('✅ Función analyzeRealData disponible en window.analyzeRealData()');
    console.log('Para usar: abrir consola del navegador y ejecutar:');
    console.log('window.analyzeRealData(useCallStore.getState().callData)');
}

// Nota: Este archivo es para debugging en el navegador, no necesita exportación ES6
