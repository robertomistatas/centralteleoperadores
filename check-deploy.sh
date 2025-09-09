#!/bin/bash

# Script para verificar el estado del deploy en GitHub Pages
# Muestra información útil sobre el deploy y las URLs de acceso

echo "🚀 VERIFICACIÓN DEL DEPLOY EN GITHUB PAGES"
echo "=========================================="
echo ""

# Información del repositorio
echo "📁 Repositorio: robertomistatas/centralteleoperadores"
echo "🌐 URL GitHub: https://github.com/robertomistatas/centralteleoperadores"
echo ""

# URLs de acceso
echo "🌍 URLS DE ACCESO:"
echo "   🟢 Producción: https://robertomistatas.github.io/centralteleoperadores/"
echo "   🔧 Desarrollo: http://localhost:5173/centralteleoperadores/"
echo "   🏠 LAN Access: http://192.168.56.1:5173/centralteleoperadores/"
echo "   🏠 LAN Access: http://192.168.0.131:5173/centralteleoperadores/"
echo ""

# Estado del workflow
echo "⚙️ VERIFICACIÓN DEL WORKFLOW:"
echo "   📋 Actions: https://github.com/robertomistatas/centralteleoperadores/actions"
echo "   🔄 Último deploy: $(git log -1 --format='%h - %s (%cr)' main)"
echo ""

# Verificar si la página está accesible
echo "🔍 VERIFICANDO ACCESIBILIDAD..."

# Usar curl para verificar si la página responde (si está disponible)
if command -v curl >/dev/null 2>&1; then
    echo "   Verificando https://robertomistatas.github.io/centralteleoperadores/..."
    
    if curl -s -o /dev/null -w "%{http_code}" https://robertomistatas.github.io/centralteleoperadores/ | grep -q "200"; then
        echo "   ✅ Página accesible (200 OK)"
    else
        echo "   ⏳ Página no disponible aún o en proceso de deploy"
        echo "   💡 El deploy puede tardar unos minutos en completarse"
    fi
else
    echo "   ⚠️ curl no disponible para verificar accesibilidad"
fi

echo ""
echo "📝 INSTRUCCIONES:"
echo "   1. Verificar el estado en GitHub Actions (link arriba)"
echo "   2. Esperar a que el workflow complete (build + deploy)"
echo "   3. Acceder a la URL de producción"
echo "   4. Si hay errores, revisar los logs en Actions"
echo ""

# Información sobre GitHub Pages settings
echo "⚙️ CONFIGURACIÓN GITHUB PAGES:"
echo "   🔧 Settings: https://github.com/robertomistatas/centralteleoperadores/settings/pages"
echo "   📂 Source: GitHub Actions"
echo "   🏗️ Build: Vite + React"
echo "   📍 Base Path: /centralteleoperadores/"
echo ""

echo "✨ Deploy configurado y en proceso!"
echo "🔄 Refresca la página en unos minutos para ver los cambios"
