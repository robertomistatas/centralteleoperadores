@echo off
REM 🚀 Script de Configuración Automática de Firebase para Windows
REM Este script configura automáticamente Firebase Firestore y Authentication

echo 🔥 Iniciando configuración automática de Firebase...

REM Verificar si Firebase CLI está instalado
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Firebase CLI no está instalado.
    echo 📥 Instalando Firebase CLI...
    npm install -g firebase-tools
)

echo 🔑 Iniciando sesión en Firebase...
firebase login

echo 📊 Seleccionando proyecto centralteleoperadores...
firebase use centralteleoperadores

echo 🔐 Configurando Authentication...
REM Hacer backup de usuarios existentes
firebase auth:export --format=json auth_backup.json 2>nul || echo ⚠️ No hay usuarios existentes

echo 🗄️ Configurando Firestore Database...
REM Crear reglas de seguridad para Firestore
(
echo rules_version = '2';
echo service cloud.firestore {
echo   match /databases/{database}/documents {
echo     // Operadores - solo el dueño puede leer/escribir
echo     match /operators/{document} {
echo       allow read, write: if request.auth != null ^&^& resource.data.userId == request.auth.uid;
echo       allow create: if request.auth != null ^&^& request.resource.data.userId == request.auth.uid;
echo     }
echo     
echo     // Asignaciones - solo el dueño puede leer/escribir
echo     match /assignments/{document} {
echo       allow read, write: if request.auth != null ^&^& resource.data.userId == request.auth.uid;
echo       allow create: if request.auth != null ^&^& request.resource.data.userId == request.auth.uid;
echo     }
echo     
echo     // Datos de llamadas - solo el dueño puede leer/escribir
echo     match /callData/{document} {
echo       allow read, write: if request.auth != null ^&^& document == request.auth.uid;
echo     }
echo     
echo     // Datos de usuario - solo el dueño puede leer/escribir
echo     match /userData/{document} {
echo       allow read, write: if request.auth != null ^&^& document == request.auth.uid;
echo     }
echo   }
echo }
) > firestore.rules

echo 📤 Desplegando reglas de Firestore...
firebase deploy --only firestore:rules

echo 🔍 Creando índices de Firestore...
(
echo {
echo   "indexes": [
echo     {
echo       "collectionGroup": "operators",
echo       "queryScope": "COLLECTION",
echo       "fields": [
echo         {
echo           "fieldPath": "userId",
echo           "order": "ASCENDING"
echo         },
echo         {
echo           "fieldPath": "createdAt",
echo           "order": "DESCENDING"
echo         }
echo       ]
echo     },
echo     {
echo       "collectionGroup": "assignments",
echo       "queryScope": "COLLECTION",
echo       "fields": [
echo         {
echo           "fieldPath": "userId",
echo           "order": "ASCENDING"
echo         },
echo         {
echo           "fieldPath": "updatedAt",
echo           "order": "DESCENDING"
echo         }
echo       ]
echo     }
echo   ],
echo   "fieldOverrides": []
echo }
) > firestore.indexes.json

firebase deploy --only firestore:indexes

echo ✅ Configuración completada!
echo.
echo 🎯 Próximos pasos:
echo 1. Ve a https://console.firebase.google.com/project/centralteleoperadores
echo 2. En Authentication ^> Sign-in method, habilita 'Email/Password'
echo 3. En Firestore Database, verifica que las reglas se aplicaron
echo.
echo 🔗 Enlaces útiles:
echo    • Console: https://console.firebase.google.com/project/centralteleoperadores
echo    • Authentication: https://console.firebase.google.com/project/centralteleoperadores/authentication/users
echo    • Firestore: https://console.firebase.google.com/project/centralteleoperadores/firestore

pause
