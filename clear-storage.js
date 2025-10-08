/**
 * Script para limpiar localStorage de manera segura
 * Ejecutar en la consola del navegador: copy(clearStorageScript); eval(clearStorageScript)
 */

const clearStorageScript = `
console.log('🧹 Iniciando limpieza de localStorage...');

// Mostrar tamaño actual
let totalSize = 0;
Object.keys(localStorage).forEach(key => {
  const size = localStorage.getItem(key).length;
  totalSize += size;
  console.log(\`📦 \${key}: \${(size / 1024).toFixed(2)} KB\`);
});
console.log(\`📊 Tamaño total: \${(totalSize / 1024).toFixed(2)} KB\`);

// Limpiar stores específicos que causan problemas
const keysToRemove = [
  'call-audit-storage-optimized',
  'app-storage'
];

keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(\`✅ Eliminado: \${key}\`);
  }
});

console.log('🎉 Limpieza completada. Recargando página...');
setTimeout(() => location.reload(), 1000);
`;

console.log('📋 Script de limpieza copiado al portapapeles');
console.log('🔧 Para ejecutar, pega en la consola del navegador:');
console.log(clearStorageScript);
