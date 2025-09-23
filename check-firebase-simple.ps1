Write-Host "Verificando configuración de Firebase..." -ForegroundColor Yellow

# Verificar si firebase CLI está instalado
$firebaseCLI = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseCLI) {
    Write-Host "Firebase CLI no está instalado" -ForegroundColor Red
    Write-Host "Instalar con: npm install -g firebase-tools" -ForegroundColor Cyan
    exit 1
}

Write-Host "Firebase CLI encontrado" -ForegroundColor Green

# Verificar archivo de reglas
if (-not (Test-Path "firestore.rules")) {
    Write-Host "Archivo firestore.rules no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "Archivo firestore.rules encontrado" -ForegroundColor Green

# Verificar configuración del proyecto
if (Test-Path ".firebaserc") {
    $firebaserc = Get-Content ".firebaserc" | ConvertFrom-Json
    $projectId = $firebaserc.projects.default
    Write-Host "Proyecto actual: $projectId" -ForegroundColor Blue
} else {
    Write-Host "Archivo .firebaserc no encontrado" -ForegroundColor Red
    Write-Host "Ejecutar: firebase init" -ForegroundColor Cyan
}

# Mostrar resumen de las reglas
Write-Host ""
Write-Host "RESUMEN DE REGLAS ACTUALES:" -ForegroundColor Yellow

$rules = Get-Content "firestore.rules" -Raw
if ($rules -match "roberto@mistatas\.com") {
    Write-Host "Super admin configurado (roberto@mistatas.com)" -ForegroundColor Green
} else {
    Write-Host "Super admin NO configurado" -ForegroundColor Red
}

if ($rules -match "userProfiles") {
    Write-Host "Colección userProfiles protegida" -ForegroundColor Green
} else {
    Write-Host "Colección userProfiles NO protegida" -ForegroundColor Red
}

Write-Host ""
Write-Host "COMANDOS PARA RESOLVER:" -ForegroundColor Yellow
Write-Host "firebase deploy --only firestore:rules" -ForegroundColor Cyan
Write-Host ""
Write-Host "Script completado" -ForegroundColor Green
