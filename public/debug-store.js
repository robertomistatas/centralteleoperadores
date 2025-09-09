// SCRIPT DE DIAGNÓSTICO INMEDIATO PARA EL STORE
// Ejecutar este script desde la consola del navegador

console.log('=== DIAGNÓSTICO INMEDIATO DEL STORE ===');

function runImmediateDiagnosis() {
    console.log('\n🔧 CHECKING STORE STATE...');
    
    // Verificar si Zustand está disponible
    const store = window.zustandStore || null;
    console.log('1. Store disponible:', !!store);
    
    // Verificar localStorage
    console.log('\n📱 VERIFICANDO LOCALSTORAGE:');
    try {
        const beneficiaryData = localStorage.getItem('beneficiary-store');
        const parsedData = beneficiaryData ? JSON.parse(beneficiaryData) : null;
        console.log('2. Datos en localStorage:', {
            exists: !!beneficiaryData,
            dataLength: beneficiaryData ? beneficiaryData.length : 0,
            beneficiariesCount: parsedData?.state?.beneficiaries?.length || 0
        });
        
        if (parsedData?.state?.beneficiaries) {
            console.log('   Primeros 3 beneficiarios:', parsedData.state.beneficiaries.slice(0, 3));
        }
    } catch (error) {
        console.error('3. Error reading localStorage:', error);
    }
    
    // Verificar Firebase
    console.log('\n🔥 VERIFICANDO FIREBASE:');
    try {
        if (window.firebase || window.firestoreService) {
            console.log('4. Firebase disponible:', true);
            
            // Test de conexión Firebase
            if (window.testFirebaseConnection) {
                console.log('5. Ejecutando test de Firebase...');
                window.testFirebaseConnection();
            }
        } else {
            console.log('4. Firebase NO disponible');
        }
    } catch (error) {
        console.error('5. Error with Firebase:', error);
    }
    
    // Verificar el componente
    console.log('\n⚛️ VERIFICANDO COMPONENTE:');
    const beneficiariesCards = document.querySelectorAll('[class*="beneficiarios"]');
    const statsCards = document.querySelectorAll('[class*="stat"]');
    console.log('6. Elementos de beneficiarios encontrados:', beneficiariesCards.length);
    console.log('7. Tarjetas de estadísticas encontradas:', statsCards.length);
    
    // Buscar cualquier texto con "0" o cero
    const textWithZeros = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && el.textContent.trim() === '0' && el.children.length === 0
    );
    console.log('8. Elementos mostrando "0":', textWithZeros.length);
    textWithZeros.forEach((el, i) => {
        if (i < 5) { // Solo mostrar los primeros 5
            console.log(`   Elemento ${i + 1}:`, el.textContent, el.className);
        }
    });
    
    console.log('\n✅ DIAGNÓSTICO COMPLETADO');
    console.log('Revisa los números arriba para identificar el problema.');
}

// Función para reload forzado del store
function forceReloadStore() {
    console.log('\n🔄 FORZANDO RELOAD DEL STORE...');
    
    try {
        // Clear localStorage
        localStorage.removeItem('beneficiary-store');
        console.log('1. localStorage limpiado');
        
        // Reload page
        window.location.reload();
    } catch (error) {
        console.error('Error during force reload:', error);
    }
}

// Función para inspeccionar datos específicos
function inspectBeneficiaryData() {
    console.log('\n🔍 INSPECCIÓN DETALLADA DE DATOS...');
    
    try {
        const store = window.zustandStore;
        if (store) {
            const state = store.getState();
            console.log('Store state:', {
                beneficiariesCount: state.beneficiaries?.length || 0,
                loading: state.loading,
                error: state.error,
                lastUpdated: state.lastUpdated
            });
            
            if (state.beneficiaries?.length > 0) {
                console.log('Primeros 5 beneficiarios:', state.beneficiaries.slice(0, 5));
            }
        }
    } catch (error) {
        console.error('Error inspecting data:', error);
    }
}

// Hacer funciones disponibles globalmente
window.runImmediateDiagnosis = runImmediateDiagnosis;
window.forceReloadStore = forceReloadStore;
window.inspectBeneficiaryData = inspectBeneficiaryData;

console.log('🚀 Scripts de diagnóstico cargados. Ejecuta:');
console.log('- runImmediateDiagnosis() para diagnóstico completo');
console.log('- forceReloadStore() para limpiar y recargar');
console.log('- inspectBeneficiaryData() para ver datos del store');
