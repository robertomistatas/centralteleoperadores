/**
 * 🔍 DEBUG: Diagnóstico de Asignaciones de Cristina Ramírez
 * 
 * INSTRUCCIONES:
 * 1. Abrir Firebase Console en navegador
 * 2. Ir a Firestore Database
 * 3. Abrir consola del navegador (F12)
 * 4. Copiar y pegar este script completo
 * 5. Presionar Enter
 */

async function debugCristinaAssignments() {
  console.log('🔍 DIAGNÓSTICO DE ASIGNACIONES - CRISTINA RAMÍREZ');
  console.log('='.repeat(60));
  
  try {
    // 1. Obtener todos los documentos de la colección 'assignments'
    console.log('\n📂 PASO 1: Consultando colección "assignments"...');
    
    const { getDocs, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const { db } = await import('./src/firebase');
    
    const assignmentsRef = collection(db, 'assignments');
    const snapshot = await getDocs(assignmentsRef);
    
    console.log(`✅ Total documentos en "assignments": ${snapshot.size}`);
    
    // 2. Buscar documentos relacionados con Cristina
    console.log('\n🔍 PASO 2: Buscando documentos de Cristina Ramírez...');
    
    let cristinaDocuments = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const docId = doc.id;
      
      // Verificar si el documento tiene asignaciones de Cristina
      const hasCristina = data.assignments?.some(assignment => 
        assignment.operatorName?.toLowerCase().includes('cristina') &&
        assignment.operatorName?.toLowerCase().includes('ramirez')
      );
      
      if (hasCristina || data.operatorId?.includes('cristina')) {
        cristinaDocuments.push({
          id: docId,
          userId: data.userId,
          operatorId: data.operatorId,
          totalAssignments: data.assignments?.length || 0,
          updatedAt: data.updatedAt?.toDate?.() || 'Unknown',
          firstBeneficiary: data.assignments?.[0]?.beneficiary || 'N/A'
        });
      }
    });
    
    console.log(`\n📊 Documentos encontrados: ${cristinaDocuments.length}`);
    
    if (cristinaDocuments.length === 0) {
      console.log('⚠️ NO se encontraron documentos de Cristina Ramírez');
      console.log('\n💡 POSIBLES RAZONES:');
      console.log('   1. Las asignaciones fueron eliminadas correctamente');
      console.log('   2. Las asignaciones están bajo otro operatorId');
      console.log('   3. El nombre del operador está mal escrito');
      return;
    }
    
    // 3. Mostrar detalles de cada documento
    console.log('\n📋 DETALLES DE LOS DOCUMENTOS:');
    cristinaDocuments.forEach((doc, index) => {
      console.log(`\n${index + 1}. Documento ID: ${doc.id}`);
      console.log(`   userId: ${doc.userId}`);
      console.log(`   operatorId: ${doc.operatorId}`);
      console.log(`   Total beneficiarios: ${doc.totalAssignments}`);
      console.log(`   Última actualización: ${doc.updatedAt}`);
      console.log(`   Primer beneficiario: ${doc.firstBeneficiary}`);
    });
    
    // 4. Verificar el formato del ID esperado
    console.log('\n🔑 FORMATO DE ID ESPERADO:');
    console.log('   El ID debe tener formato: {userId}_{operatorId}');
    console.log('   Ejemplos de IDs encontrados:');
    cristinaDocuments.forEach(doc => {
      const parts = doc.id.split('_');
      console.log(`   • ${doc.id}`);
      console.log(`     └─ userId: ${parts[0] || 'N/A'}`);
      console.log(`     └─ operatorId: ${parts.slice(1).join('_') || 'N/A'}`);
    });
    
    // 5. Generar comando de eliminación
    console.log('\n🗑️ COMANDOS PARA ELIMINAR:');
    console.log('\nEjecuta estos comandos en la consola para eliminar los documentos:');
    console.log('\n```javascript');
    cristinaDocuments.forEach((doc, index) => {
      console.log(`// Documento ${index + 1}: ${doc.totalAssignments} beneficiarios`);
      console.log(`await deleteDoc(doc(db, 'assignments', '${doc.id}'));`);
      console.log(`console.log('✅ Documento ${doc.id} eliminado');`);
      console.log('');
    });
    console.log('```');
    
    // 6. Mostrar todos los operatorId únicos
    console.log('\n👥 TODOS LOS OPERADORES EN EL SISTEMA:');
    const allOperatorIds = new Set();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.operatorId) {
        allOperatorIds.add(data.operatorId);
      }
    });
    
    console.log(`Total operadores únicos: ${allOperatorIds.size}`);
    allOperatorIds.forEach(id => {
      console.log(`   • ${id}`);
    });
    
  } catch (error) {
    console.error('❌ ERROR durante el diagnóstico:', error);
    console.log('\n🔧 SOLUCIÓN ALTERNATIVA:');
    console.log('1. Ve a Firebase Console');
    console.log('2. Firestore Database → assignments');
    console.log('3. Busca documentos que contengan "cristina" o "ramirez"');
    console.log('4. Elimina manualmente los documentos');
  }
}

// Ejecutar el diagnóstico
console.log('✅ Script cargado');
console.log('💡 Ejecuta: debugCristinaAssignments()');

// Auto-ejecutar
debugCristinaAssignments();
