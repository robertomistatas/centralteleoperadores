#!/bin/bash

# 🚀 Script de Configuración Automática de Firebase
# Este script configura automáticamente Firebase Firestore y Authentication

echo "🔥 Iniciando configuración automática de Firebase..."

# Verificar si Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI no está instalado."
    echo "📥 Instalando Firebase CLI..."
    npm install -g firebase-tools
fi

echo "🔑 Iniciando sesión en Firebase..."
firebase login

echo "📊 Seleccionando proyecto centralteleoperadores..."
firebase use centralteleoperadores

echo "🔐 Configurando Authentication..."
# Habilitar Email/Password authentication
firebase auth:export --format=json auth_backup.json 2>/dev/null || echo "⚠️ No hay usuarios existentes"

echo "🗄️ Configurando Firestore Database..."
# Crear reglas de seguridad para Firestore
cat > firestore.rules << 'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Operadores - solo el dueño puede leer/escribir
    match /operators/{document} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Asignaciones - solo el dueño puede leer/escribir
    match /assignments/{document} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Datos de llamadas - solo el dueño puede leer/escribir
    match /callData/{document} {
      allow read, write: if request.auth != null && document == request.auth.uid;
    }
    
    // Datos de usuario - solo el dueño puede leer/escribir
    match /userData/{document} {
      allow read, write: if request.auth != null && document == request.auth.uid;
    }
  }
}
EOF

echo "📤 Desplegando reglas de Firestore..."
firebase deploy --only firestore:rules

echo "🔍 Creando índices de Firestore..."
cat > firestore.indexes.json << 'EOF'
{
  "indexes": [
    {
      "collectionGroup": "operators",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "assignments",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "updatedAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
EOF

firebase deploy --only firestore:indexes

echo "✅ Configuración completada!"
echo ""
echo "🎯 Próximos pasos:"
echo "1. Ve a https://console.firebase.google.com/project/centralteleoperadores"
echo "2. En Authentication > Sign-in method, habilita 'Email/Password'"
echo "3. En Firestore Database, verifica que las reglas se aplicaron"
echo ""
echo "🔗 Enlaces útiles:"
echo "   • Console: https://console.firebase.google.com/project/centralteleoperadores"
echo "   • Authentication: https://console.firebase.google.com/project/centralteleoperadores/authentication/users"
echo "   • Firestore: https://console.firebase.google.com/project/centralteleoperadores/firestore"
