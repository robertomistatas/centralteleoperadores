#!/bin/bash

# Script de deployment para Central Teleoperadores
# Ejecuta todos los pasos necesarios para desplegar el proyecto completo

echo "🚀 INICIANDO DEPLOYMENT DE CENTRAL TELEOPERADORES"
echo "================================================="

# Verificar que estamos logueados en Firebase
echo "🔐 Verificando autenticación Firebase..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ No estás logueado en Firebase. Ejecuta: firebase login"
    exit 1
fi

echo "✅ Autenticación Firebase OK"

# Instalar dependencias del frontend
echo "📦 Instalando dependencias del frontend..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias del frontend"
    exit 1
fi

# Instalar dependencias de las Functions
echo "📦 Instalando dependencias de Cloud Functions..."
cd functions
npm install
if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias de Functions"
    exit 1
fi
cd ..

# Build del frontend
echo "🏗️  Construyendo frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error en el build del frontend"
    exit 1
fi

# Desplegar Firestore rules e indexes
echo "🔥 Desplegando reglas de Firestore..."
firebase deploy --only firestore
if [ $? -ne 0 ]; then
    echo "❌ Error desplegando Firestore"
    exit 1
fi

# Desplegar Storage rules
echo "💾 Desplegando reglas de Storage..."
firebase deploy --only storage
if [ $? -ne 0 ]; then
    echo "❌ Error desplegando Storage"
    exit 1
fi

# Desplegar Cloud Functions
echo "⚡ Desplegando Cloud Functions..."
firebase deploy --only functions
if [ $? -ne 0 ]; then
    echo "❌ Error desplegando Functions"
    exit 1
fi

# Desplegar Hosting
echo "🌐 Desplegando Hosting..."
firebase deploy --only hosting
if [ $? -ne 0 ]; then
    echo "❌ Error desplegando Hosting"
    exit 1
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETADO EXITOSAMENTE"
echo "====================================="
echo ""
echo "📋 Servicios desplegados:"
echo "   ✅ Firestore (base de datos)"
echo "   ✅ Storage (archivos Excel)"
echo "   ✅ Cloud Functions (procesamiento automático)"
echo "   ✅ Hosting (aplicación web)"
echo ""
echo "🔗 Enlaces importantes:"
echo "   • Aplicación web: https://$(firebase projects:list | grep '(current)' | awk '{print $1}').web.app"
echo "   • Consola Firebase: https://console.firebase.google.com/project/$(firebase projects:list | grep '(current)' | awk '{print $1}')"
echo ""
echo "📌 Próximos pasos:"
echo "1. Ejecutar el script de inicialización de Firestore si es la primera vez"
echo "2. Subir un archivo Excel a Storage para probar el procesamiento automático"
echo "3. Verificar que los dashboards muestran las métricas correctamente"
echo ""
echo "💡 Para ver logs de las Functions: firebase functions:log"