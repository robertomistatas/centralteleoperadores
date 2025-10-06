# Script para Desplegar Reglas de Firestore Actualizadas

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DESPLIEGUE DE REGLAS DE FIRESTORE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Cambios en las reglas:" -ForegroundColor Yellow
Write-Host "- Agregado permiso delete para operadores" -ForegroundColor Green
Write-Host "- Agregado permiso delete para asignaciones" -ForegroundColor Green
Write-Host "- Solo super admin, admin o dueno pueden eliminar" -ForegroundColor Green
Write-Host ""

Write-Host "Desplegando reglas a Firebase..." -ForegroundColor Yellow
Write-Host ""

firebase deploy --only firestore:rules

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  REGLAS DESPLEGADAS EXITOSAMENTE" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Proximos pasos:" -ForegroundColor Yellow
    Write-Host "1. Recarga la aplicacion en el navegador (F5)" -ForegroundColor White
    Write-Host "2. Cierra sesion y vuelve a iniciar sesion" -ForegroundColor White
    Write-Host "3. Intenta eliminar una teleoperadora ficticia" -ForegroundColor White
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ERROR AL DESPLEGAR REGLAS" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Posibles causas:" -ForegroundColor Yellow
    Write-Host "1. Firebase CLI no instalado: npm install -g firebase-tools" -ForegroundColor White
    Write-Host "2. No has iniciado sesion: firebase login" -ForegroundColor White
    Write-Host ""
    Write-Host "Solucion alternativa:" -ForegroundColor Yellow
    Write-Host "1. Ve a: https://console.firebase.google.com" -ForegroundColor White
    Write-Host "2. Proyecto: centralteleoperadores" -ForegroundColor White
    Write-Host "3. Firestore Database -> Reglas" -ForegroundColor White
    Write-Host "4. Copia el contenido de firestore.rules" -ForegroundColor White
    Write-Host "5. Pegalo y publica" -ForegroundColor White
}

Write-Host ""
