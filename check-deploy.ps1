# Script PowerShell para verificar el estado del deploy en GitHub Pages
# Muestra información útil sobre el deploy y las URLs de acceso

Write-Host "🚀 VERIFICACIÓN DEL DEPLOY EN GITHUB PAGES" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Información del repositorio
Write-Host "📁 Repositorio: robertomistatas/centralteleoperadores" -ForegroundColor Cyan
Write-Host "🌐 URL GitHub: https://github.com/robertomistatas/centralteleoperadores" -ForegroundColor Cyan
Write-Host ""

# URLs de acceso
Write-Host "🌍 URLS DE ACCESO:" -ForegroundColor Yellow
Write-Host "   🟢 Producción: https://robertomistatas.github.io/centralteleoperadores/" -ForegroundColor Green
Write-Host "   🔧 Desarrollo: http://localhost:5173/centralteleoperadores/" -ForegroundColor Blue
Write-Host "   🏠 LAN Access: http://192.168.56.1:5173/centralteleoperadores/" -ForegroundColor Blue
Write-Host "   🏠 LAN Access: http://192.168.0.131:5173/centralteleoperadores/" -ForegroundColor Blue
Write-Host ""

# Estado del workflow
Write-Host "⚙️ VERIFICACIÓN DEL WORKFLOW:" -ForegroundColor Yellow
Write-Host "   📋 Actions: https://github.com/robertomistatas/centralteleoperadores/actions" -ForegroundColor Cyan

try {
    $lastCommit = git log -1 --format='%h - %s (%cr)' main
    Write-Host "   🔄 Último deploy: $lastCommit" -ForegroundColor White
} catch {
    Write-Host "   ⚠️ Error obteniendo info del último commit" -ForegroundColor Yellow
}

Write-Host ""

# Verificar si la página está accesible
Write-Host "🔍 VERIFICANDO ACCESIBILIDAD..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "https://robertomistatas.github.io/centralteleoperadores/" -Method Head -TimeoutSec 10 -ErrorAction SilentlyContinue
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Página accesible (200 OK)" -ForegroundColor Green
    } else {
        Write-Host "   ⏳ Página responde con código: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⏳ Página no disponible aún o en proceso de deploy" -ForegroundColor Yellow
    Write-Host "   💡 El deploy puede tardar unos minutos en completarse" -ForegroundColor Blue
}

Write-Host ""
Write-Host "📝 INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host "   1. Verificar el estado en GitHub Actions (link arriba)" -ForegroundColor White
Write-Host "   2. Esperar a que el workflow complete (build + deploy)" -ForegroundColor White
Write-Host "   3. Acceder a la URL de producción" -ForegroundColor White
Write-Host "   4. Si hay errores, revisar los logs en Actions" -ForegroundColor White
Write-Host ""

# Información sobre GitHub Pages settings
Write-Host "⚙️ CONFIGURACIÓN GITHUB PAGES:" -ForegroundColor Yellow
Write-Host "   🔧 Settings: https://github.com/robertomistatas/centralteleoperadores/settings/pages" -ForegroundColor Cyan
Write-Host "   📂 Source: GitHub Actions" -ForegroundColor White
Write-Host "   🏗️ Build: Vite + React" -ForegroundColor White
Write-Host "   📍 Base Path: /centralteleoperadores/" -ForegroundColor White
Write-Host ""

Write-Host "✨ Deploy configurado y en proceso!" -ForegroundColor Green
Write-Host "🔄 Refresca la página en unos minutos para ver los cambios" -ForegroundColor Blue

# Opcional: Abrir URLs en el navegador
Write-Host ""
$openBrowser = Read-Host "¿Quieres abrir las URLs en el navegador? (y/N)"
if ($openBrowser -eq "y" -or $openBrowser -eq "Y" -or $openBrowser -eq "yes") {
    Write-Host "🌐 Abriendo URLs..." -ForegroundColor Green
    
    Start-Process "https://github.com/robertomistatas/centralteleoperadores/actions"
    Start-Sleep -Seconds 2
    Start-Process "https://robertomistatas.github.io/centralteleoperadores/"
    
    Write-Host "✅ URLs abiertas en el navegador" -ForegroundColor Green
}
