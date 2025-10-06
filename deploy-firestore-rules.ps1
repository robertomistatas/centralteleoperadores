# 🔥 Script para Desplegar Reglas de Firestore Actualizadas
# Este script despliega las reglas que permiten la eliminación de operadores

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DESPLIEGUE DE REGLAS DE FIRESTORE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Cambios en las reglas:" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Agregado permiso 'delete' para operadores" -ForegroundColor Green
Write-Host "✅ Agregado permiso 'delete' para asignaciones" -ForegroundColor Green
Write-Host "✅ Solo super admin, admin o dueño pueden eliminar" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 Desplegando reglas a Firebase..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar el comando de Firebase
firebase deploy --only firestore:rules

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ REGLAS DESPLEGADAS EXITOSAMENTE" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Próximos pasos:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Recarga la aplicación en el navegador (F5)" -ForegroundColor White
    Write-Host "2. Intenta eliminar una teleoperadora ficticia" -ForegroundColor White
    Write-Host "3. Debería funcionar sin errores de permisos" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ❌ ERROR AL DESPLEGAR REGLAS" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Posibles causas:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Firebase CLI no está instalado" -ForegroundColor White
    Write-Host "   Solución: npm install -g firebase-tools" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. No has iniciado sesión en Firebase" -ForegroundColor White
    Write-Host "   Solución: firebase login" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. No estás en el directorio correcto del proyecto" -ForegroundColor White
    Write-Host "   Solución: cd al directorio que contiene firebase.json" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 SOLUCIÓN ALTERNATIVA:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Puedes desplegar las reglas manualmente desde Firebase Console:" -ForegroundColor White
    Write-Host ""
    Write-Host "1. Ve a: https://console.firebase.google.com" -ForegroundColor White
    Write-Host "2. Selecciona el proyecto centralteleoperadores" -ForegroundColor White
    Write-Host "3. Ve a Firestore Database -> Reglas" -ForegroundColor White
    Write-Host "4. Copia el contenido de firestore.rules" -ForegroundColor White
    Write-Host "5. Pégalo en el editor y publica" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "Presiona Enter para continuar..." -ForegroundColor Gray
$null = Read-Host

