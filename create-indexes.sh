#!/bin/bash
# Script para crear índices de Firestore manualmente

echo "🔧 Creando índices de Firestore..."

# Crear índice para beneficiaries
echo "📋 Creando índice para beneficiaries..."

# Usar Firebase CLI para crear el índice
firebase firestore:create-index beneficiaries \
  --fields "creadoPor:asc,creadoEn:desc" \
  --query-scope "COLLECTION"

echo "✅ Índices creados exitosamente"
