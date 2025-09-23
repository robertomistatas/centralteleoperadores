#!/usr/bin/env powershell

# Script para verificar y desplegar reglas de Firebase
Write-Host "🔥 Verificando configuración de Firebase..." -ForegroundColor Yellow

# Verificar si firebase CLI está instalado
$firebaseCLI = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseCLI) {
    Write-Host "❌ Firebase CLI no está instalado" -ForegroundColor Red
    Write-Host "💡 Instalar con: npm install -g firebase-tools" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Firebase CLI encontrado" -ForegroundColor Green

# Verificar si está logueado
try {
    $projects = firebase projects:list --json 2>$null | ConvertFrom-Json
    if ($projects.Count -eq 0) {
        Write-Host "❌ No hay proyectos de Firebase configurados" -ForegroundColor Red
        Write-Host "💡 Ejecutar: firebase login" -ForegroundColor Cyan
        exit 1
    }
    Write-Host "✅ Usuario autenticado en Firebase" -ForegroundColor Green
} catch {
    Write-Host "❌ Error verificando autenticación de Firebase" -ForegroundColor Red
    Write-Host "💡 Ejecutar: firebase login" -ForegroundColor Cyan
    exit 1
}

# Verificar configuración del proyecto
if (-not (Test-Path ".firebaserc")) {
    Write-Host "❌ Archivo .firebaserc no encontrado" -ForegroundColor Red
    Write-Host "💡 Ejecutar: firebase init" -ForegroundColor Cyan
    exit 1
}

# Leer configuración del proyecto
$firebaserc = Get-Content ".firebaserc" | ConvertFrom-Json
$projectId = $firebaserc.projects.default

if (-not $projectId) {
    Write-Host "❌ No hay proyecto por defecto configurado" -ForegroundColor Red
    exit 1
}

Write-Host "🎯 Proyecto actual: $projectId" -ForegroundColor Blue

# Verificar archivo de reglas
if (-not (Test-Path "firestore.rules")) {
    Write-Host "❌ Archivo firestore.rules no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Archivo firestore.rules encontrado" -ForegroundColor Green

# Mostrar resumen de las reglas
Write-Host ""
Write-Host "📋 RESUMEN DE REGLAS ACTUALES:" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow

$rules = Get-Content "firestore.rules" -Raw
if ($rules -match "roberto@mistatas\.com") {
    Write-Host "✅ Super admin configurado (roberto@mistatas.com)" -ForegroundColor Green
} else {
    Write-Host "❌ Super admin NO configurado" -ForegroundColor Red
}

if ($rules -match "userProfiles") {
    Write-Host "✅ Colección userProfiles protegida" -ForegroundColor Green
} else {
    Write-Host "❌ Colección userProfiles NO protegida" -ForegroundColor Red
}

if ($rules -match "isSuperAdmin") {
    Write-Host "✅ Función isSuperAdmin() definida" -ForegroundColor Green
} else {
    Write-Host "❌ Función isSuperAdmin() NO definida" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 COMANDOS DISPONIBLES:" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow
Write-Host "firebase deploy --only firestore:rules    # Desplegar reglas" -ForegroundColor Cyan
Write-Host "firebase firestore:rules:get              # Ver reglas actuales" -ForegroundColor Cyan
Write-Host "firebase emulators:start --only firestore # Probar localmente" -ForegroundColor Cyan

Write-Host ""
Write-Host "💡 PARA RESOLVER EL PROBLEMA:" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow
Write-Host "1. Desplegar las reglas actualizadas:" -ForegroundColor White
Write-Host "   firebase deploy --only firestore:rules" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Verificar en la consola de Firebase:" -ForegroundColor White
Write-Host "   https://console.firebase.google.com/project/$projectId/firestore/rules" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Probar la aplicación después del despliegue" -ForegroundColor White

Write-Host ""
Write-Host "🔧 Script completado" -ForegroundColor Green
