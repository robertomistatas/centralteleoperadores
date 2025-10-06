# 🔍 Script de Verificación de Operadores en Firebase
# Ejecutar desde PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERIFICACIÓN DE TELEOPERADORAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si la aplicación está corriendo
Write-Host "📋 INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Asegúrate de que la aplicación esté corriendo (npm run dev)" -ForegroundColor White
Write-Host "2. Abre el navegador en http://localhost:5173" -ForegroundColor White
Write-Host "3. Abre la consola del navegador (F12 -> Console)" -ForegroundColor White
Write-Host "4. Copia y pega el siguiente código:" -ForegroundColor White
Write-Host ""

$scriptContent = @"
// 🔍 VERIFICACIÓN RÁPIDA DE OPERADORES
(async () => {
  try {
    const { operatorService } = await import('./src/firestoreService.js');
    const operators = await operatorService.getAll();
    
    console.log('📊 Total de operadores:', operators.length);
    console.table(operators.map(op => ({
      Nombre: op.name,
      Email: op.email,
      ID: op.id
    })));
    
    const fictitious = operators.filter(op => {
      const name = op.name?.toLowerCase() || '';
      const email = op.email?.toLowerCase() || '';
      return name.includes('javiera') || name.includes('prueba') || 
             name.includes('demo') || name.includes('test') ||
             email.includes('javiera') || email.includes('test');
    });
    
    if (fictitious.length > 0) {
      console.warn('⚠️ Operadores ficticios detectados:', fictitious.length);
      console.table(fictitious.map(op => ({
        Nombre: op.name,
        Email: op.email,
        ID: op.id
      })));
      console.log('💡 Recomendación: Usa el botón "Limpiar Ficticias" en el módulo Asignaciones');
    } else {
      console.log('✅ No se encontraron operadores ficticios');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
"@

Write-Host $scriptContent -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Opción alternativa: Abrir la consola automáticamente
Write-Host "🚀 OPCIÓN RÁPIDA:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona Enter para copiar el script al portapapeles..." -ForegroundColor White
$null = Read-Host

# Copiar al portapapeles
Set-Clipboard -Value $scriptContent
Write-Host "✅ Script copiado al portapapeles" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora:" -ForegroundColor Yellow
Write-Host "1. Ve a la consola del navegador (F12)" -ForegroundColor White
Write-Host "2. Pega el script (Ctrl+V)" -ForegroundColor White
Write-Host "3. Presiona Enter" -ForegroundColor White
Write-Host ""

# Información adicional
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INFORMACIÓN ADICIONAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Para verificar operadores manualmente:" -ForegroundColor Yellow
Write-Host "   1. Ve a Firebase Console" -ForegroundColor White
Write-Host "   2. Firestore Database -> operators" -ForegroundColor White
Write-Host "   3. Revisa los documentos" -ForegroundColor White
Write-Host ""
Write-Host "🗑️ Para eliminar operadores ficticios:" -ForegroundColor Yellow
Write-Host "   1. Ve al módulo Asignaciones" -ForegroundColor White
Write-Host "   2. Haz clic en 'Limpiar Ficticias' (botón rojo)" -ForegroundColor White
Write-Host "   3. Confirma la eliminación" -ForegroundColor White
Write-Host ""
Write-Host "✅ Cambios aplicados:" -ForegroundColor Green
Write-Host "   • La eliminación ahora es persistente" -ForegroundColor White
Write-Host "   • Firebase se actualiza antes que el estado local" -ForegroundColor White
Write-Host "   • Al recargar, no reaparecen operadores eliminados" -ForegroundColor White
Write-Host ""
