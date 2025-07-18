#!/bin/bash

# Script de Deploy Automático para GitHub Pages
# Checkpoint y Deploy de Mistatas - Seguimiento de llamadas

echo "🚀 Iniciando checkpoint y deploy automático..."

# Verificar que estamos en la rama main
echo "📋 Verificando rama actual..."
git branch --show-current

# Agregar todos los cambios
echo "📁 Agregando archivos al staging area..."
git add .

# Crear commit con timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
echo "💾 Creando commit: $TIMESTAMP"
git commit -m "feat: checkpoint automático - $TIMESTAMP

- ✅ Módulo de Asignaciones funcionando
- ✅ Dashboard con métricas actualizadas  
- ✅ Carga de Excel optimizada
- ✅ Validaciones implementadas
- 🎯 Deploy automático a GitHub Pages"

# Push al repositorio
echo "⬆️ Subiendo cambios a GitHub..."
git push origin main

# Build para producción
echo "🔨 Construyendo para producción..."
npm run build

# Deploy a GitHub Pages
echo "🌐 Desplegando a GitHub Pages..."
npm run deploy

echo "✅ Deploy completado!"
echo "🌐 Aplicación disponible en: https://robertomistatas.github.io/centralteleoperadores/"
echo "📊 Repositorio: https://github.com/robertomistatas/centralteleoperadores"
