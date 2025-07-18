# Script de Deploy Automático para GitHub Pages (Windows PowerShell)
# Checkpoint y Deploy de Mistatas - Seguimiento de llamadas

Write-Host "🚀 Iniciando checkpoint y deploy automático..." -ForegroundColor Green

# Verificar que estamos en la rama main
Write-Host "📋 Verificando rama actual..." -ForegroundColor Yellow
git branch --show-current

# Agregar todos los cambios
Write-Host "📁 Agregando archivos al staging area..." -ForegroundColor Yellow
git add .

# Crear commit con timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "💾 Creando commit: $timestamp" -ForegroundColor Yellow
git commit -m "feat: checkpoint automático - $timestamp

- ✅ Módulo de Asignaciones funcionando
- ✅ Dashboard con métricas actualizadas  
- ✅ Carga de Excel optimizada
- ✅ Validaciones implementadas
- 🎯 Deploy automático a GitHub Pages"

# Push al repositorio
Write-Host "⬆️ Subiendo cambios a GitHub..." -ForegroundColor Yellow
git push origin main

# Build para producción
Write-Host "🔨 Construyendo para producción..." -ForegroundColor Yellow
npm run build

# Deploy a GitHub Pages
Write-Host "🌐 Desplegando a GitHub Pages..." -ForegroundColor Yellow
npm run deploy

Write-Host "✅ Deploy completado!" -ForegroundColor Green
Write-Host "🌐 Aplicación disponible en: https://robertomistatas.github.io/centralteleoperadores/" -ForegroundColor Cyan
Write-Host "📊 Repositorio: https://github.com/robertomistatas/centralteleoperadores" -ForegroundColor Cyan
