# Script de deployment para Central Teleoperadores (PowerShell)
# Ejecuta todos los pasos necesarios para desplegar el proyecto completo

Write-Host "🚀 INICIANDO DEPLOYMENT DE CENTRAL TELEOPERADORES" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Verificar que estamos logueados en Firebase
Write-Host "🔐 Verificando autenticación Firebase..." -ForegroundColor Cyan
$firebaseCheck = firebase projects:list 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ No estás logueado en Firebase. Ejecuta: firebase login" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Autenticación Firebase OK" -ForegroundColor Green

# Instalar dependencias del frontend
Write-Host "📦 Instalando dependencias del frontend..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error instalando dependencias del frontend" -ForegroundColor Red
    exit 1
}

# Instalar dependencias de las Functions
Write-Host "📦 Instalando dependencias de Cloud Functions..." -ForegroundColor Cyan
Push-Location functions
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error instalando dependencias de Functions" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Build del frontend
Write-Host "🏗️  Construyendo frontend..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en el build del frontend" -ForegroundColor Red
    exit 1
}

# Desplegar Firestore rules e indexes
Write-Host "🔥 Desplegando reglas de Firestore..." -ForegroundColor Cyan
firebase deploy --only firestore
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error desplegando Firestore" -ForegroundColor Red
    exit 1
}

# Desplegar Storage rules
Write-Host "💾 Desplegando reglas de Storage..." -ForegroundColor Cyan
firebase deploy --only storage
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error desplegando Storage" -ForegroundColor Red
    exit 1
}

# Desplegar Cloud Functions
Write-Host "⚡ Desplegando Cloud Functions..." -ForegroundColor Cyan
firebase deploy --only functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error desplegando Functions" -ForegroundColor Red
    exit 1
}

# Desplegar Hosting
Write-Host "🌐 Desplegando Hosting..." -ForegroundColor Cyan
firebase deploy --only hosting
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error desplegando Hosting" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 DEPLOYMENT COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Servicios desplegados:" -ForegroundColor Cyan
Write-Host "   ✅ Firestore (base de datos)" -ForegroundColor Green
Write-Host "   ✅ Storage (archivos Excel)" -ForegroundColor Green
Write-Host "   ✅ Cloud Functions (procesamiento automático)" -ForegroundColor Green
Write-Host "   ✅ Hosting (aplicación web)" -ForegroundColor Green
Write-Host ""
Write-Host "📌 Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Ejecutar el script de inicialización de Firestore si es la primera vez"
Write-Host "2. Subir un archivo Excel a Storage para probar el procesamiento automático"
Write-Host "3. Verificar que los dashboards muestran las métricas correctamente"
Write-Host ""
Write-Host "💡 Para ver logs de las Functions: firebase functions:log" -ForegroundColor Gray