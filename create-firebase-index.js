/**
 * Script para crear el índice compuesto requerido por Firebase
 * Error: The query requires an index for collection 'seguimientos'
 */

console.log('🔧 CREAR ÍNDICE FIREBASE REQUERIDO');
console.log('');
console.log('❌ Error detectado:');
console.log('FirebaseError: The query requires an index');
console.log('');
console.log('✅ SOLUCIÓN:');
console.log('1. Ve a Firebase Console:');
console.log('   https://console.firebase.google.com/v1/r/project/centralteleoperadores/firestore/indexes?create_composite=Clpwcm9qZWN0cy9jZW50cmFsdGVsZW9wZXJhZG9yZXMvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3NlZ3VpbWllbnRvcy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoRCg1mZWNoYUNvbnRhY3RvEAIaDAoIX19uYW1lX18QAg');
console.log('');
console.log('2. O crear manualmente en Firebase Console:');
console.log('   - Colección: seguimientos');
console.log('   - Campos:');
console.log('     * userId (Ascending)');
console.log('     * fechaContacto (Descending)');
console.log('     * __name__ (Descending)');
console.log('');
console.log('3. Esperar a que se complete la creación del índice');
console.log('');
console.log('⚠️ Mientras tanto, actualizando firestore.indexes.json...');

// Leer el archivo existente de índices
const fs = require('fs');
const path = require('path');

const indexesPath = path.join(__dirname, 'firestore.indexes.json');

try {
  let indexes = { indexes: [] };
  
  if (fs.existsSync(indexesPath)) {
    indexes = JSON.parse(fs.readFileSync(indexesPath, 'utf8'));
  }
  
  // Verificar si el índice ya existe
  const existingIndex = indexes.indexes.find(index => 
    index.collectionGroup === 'seguimientos' &&
    index.fields.some(f => f.fieldPath === 'userId') &&
    index.fields.some(f => f.fieldPath === 'fechaContacto')
  );
  
  if (!existingIndex) {
    // Agregar el nuevo índice requerido
    const newIndex = {
      "collectionGroup": "seguimientos",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "fechaContacto", 
          "order": "DESCENDING"
        },
        {
          "fieldPath": "__name__",
          "order": "DESCENDING"
        }
      ]
    };
    
    indexes.indexes.push(newIndex);
    
    // Escribir de vuelta el archivo
    fs.writeFileSync(indexesPath, JSON.stringify(indexes, null, 2));
    
    console.log('✅ Índice agregado a firestore.indexes.json');
    console.log('📋 Nuevo índice:', JSON.stringify(newIndex, null, 2));
  } else {
    console.log('ℹ️ El índice ya existe en firestore.indexes.json');
  }
  
} catch (error) {
  console.error('❌ Error actualizando firestore.indexes.json:', error);
}

console.log('');
console.log('🚀 PRÓXIMOS PASOS:');
console.log('1. Ejecutar: firebase deploy --only firestore:indexes');
console.log('2. O crear el índice manualmente en Firebase Console usando el link de arriba');
console.log('3. El proceso puede tomar varios minutos');