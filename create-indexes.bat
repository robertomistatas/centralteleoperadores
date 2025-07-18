@echo off
echo 🔍 Creando índices de Firestore...

REM Verificar si firebase CLI está logueado
firebase projects:list >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔑 Necesitas hacer login en Firebase primero
    echo Ejecutando: firebase login
    firebase login
)

echo 📊 Seleccionando proyecto...
firebase use centralteleoperadores

echo 📤 Desplegando índices...
firebase deploy --only firestore:indexes

echo ✅ Índices creados exitosamente!
echo 💡 Los índices pueden tardar unos minutos en estar listos
echo 🔗 Verifica el estado en: https://console.firebase.google.com/project/centralteleoperadores/firestore/indexes

pause
