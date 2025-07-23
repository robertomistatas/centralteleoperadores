// SCRIPT DE DEBUG PARA FECHAS EN EL NAVEGADOR
// Copiar y pegar en la consola del navegador para diagnosticar el problema

console.log('🔧 INICIANDO DEBUG DE FECHAS...');

// Test de función de formateo de fechas chilenas
const testChileanDateFormat = (dateValue) => {
  console.log(`📅 Testing date: ${dateValue} (type: ${typeof dateValue})`);
  
  if (!dateValue) return 'N/A';
  
  try {
    let date;
    
    // Si es string con formato DD-MM-YYYY o DD/MM/YYYY (ya chileno)
    if (typeof dateValue === 'string' && /^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(dateValue)) {
      const parts = dateValue.split(/[-\/]/);
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      // Verificar que sea formato chileno válido (día <= 31, mes <= 12)
      if (day <= 31 && month <= 12 && year >= 1900) {
        const result = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
        console.log(`✅ Format maintained: ${result}`);
        return result;
      }
    }
    
    // Si es número (Excel serial date)
    if (typeof dateValue === 'number') {
      date = new Date((dateValue - 25569) * 86400 * 1000);
      console.log(`📊 Excel serial converted to: ${date}`);
    } else {
      date = new Date(dateValue);
      console.log(`📆 Standard date conversion: ${date}`);
    }
    
    // Verificar validez y formatear
    if (date && !isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      const result = `${day}-${month}-${year}`;
      console.log(`✅ Formatted result: ${result}`);
      return result;
    }
    
    console.log('❌ Invalid date');
    return 'Fecha inválida';
  } catch (error) {
    console.log('🚨 Error:', error);
    return typeof dateValue === 'string' ? dateValue : 'Error en fecha';
  }
};

// Test cases
console.log('\n📋 CASOS DE PRUEBA:');
console.log('Test 1 - Fecha americana:', testChileanDateFormat('12/07/2024'));
console.log('Test 2 - Fecha chilena:', testChileanDateFormat('07-12-2024'));
console.log('Test 3 - Date object:', testChileanDateFormat(new Date('2024-12-07')));
console.log('Test 4 - Excel serial:', testChileanDateFormat(45273)); // Aproximadamente 2024-12-07
console.log('Test 5 - String ISO:', testChileanDateFormat('2024-12-07'));

// Probar con datos de Zustand si están disponibles
if (typeof useCallStore !== 'undefined') {
  console.log('\n🏪 PROBANDO CON DATOS DE ZUSTAND:');
  const store = useCallStore.getState();
  if (store.processedData && store.processedData.length > 0) {
    const sampleCall = store.processedData[0];
    console.log('Sample call data:', sampleCall);
    console.log('Date field:', sampleCall.fecha || sampleCall.date);
    console.log('Formatted:', testChileanDateFormat(sampleCall.fecha || sampleCall.date));
  }
  
  // Probar getFollowUpData
  const followUpData = store.getFollowUpData([]);
  if (followUpData && followUpData.length > 0) {
    console.log('\n📋 FOLLOW UP DATA SAMPLE:');
    console.log('First item:', followUpData[0]);
    console.log('Last call field:', followUpData[0].lastCall);
  }
} else {
  console.log('\n⚠️ Zustand store not available. Run this in the browser with the app loaded.');
}

console.log('\n✅ DEBUG COMPLETADO');
