// 🔍 DIAGNÓSTICO CRÍTICO: Analizar estructura real de datos
export const diagnosticDataStructure = () => {
  console.log('🔍 === DIAGNÓSTICO CRÍTICO DE ESTRUCTURA DE DATOS ===');
  
  // Acceder a stores directamente desde imports
  try {
    // Intentar obtener datos desde localStorage de Zustand
    const callStoreData = localStorage.getItem('call-store');
    const appStoreData = localStorage.getItem('app-store');
    
    console.log('📊 DATOS DESDE LOCALSTORAGE:');
    if (callStoreData) {
      const parsed = JSON.parse(callStoreData);
      console.log('Call Store:', {
        callDataLength: parsed.state?.callData?.length || 0,
        processedDataLength: parsed.state?.processedData?.length || 0,
        hasMetrics: !!parsed.state?.callMetrics
      });
      
      if (parsed.state?.processedData?.length > 0) {
        console.log('Primera llamada sample:', parsed.state.processedData[0]);
        console.log('Campos disponibles:', Object.keys(parsed.state.processedData[0]));
      }
    }
    
    if (appStoreData) {
      const parsed = JSON.parse(appStoreData);
      console.log('App Store:', {
        operatorsLength: parsed.state?.operators?.length || 0,
        operatorAssignmentsKeys: parsed.state?.operatorAssignments ? Object.keys(parsed.state.operatorAssignments).length : 0
      });
    }
  } catch (error) {
    console.log('⚠️ Error accediendo a localStorage:', error.message);
  }
  
  return true;
};

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  window.diagnosticDataStructure = diagnosticDataStructure;
}

export default diagnosticDataStructure;
