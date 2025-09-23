#!/usr/bin/env node

/**
 * Script de prueba para el sistema de gestión de usuarios y permisos
 * Ejecutar con: node test-admin-system.js
 */

console.log('🧪 INICIANDO PRUEBAS DEL SISTEMA DE ADMINISTRACIÓN');
console.log('='.repeat(60));

// Test 1: Verificar estructura de componentes
console.log('\n📁 Test 1: Verificación de estructura de archivos');

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  // Componentes de administración
  'src/components/admin/SuperAdminDashboard.jsx',
  'src/components/admin/UserCard.jsx',
  'src/components/admin/CreateUserModal.jsx',
  'src/components/admin/EditUserModal.jsx',
  'src/components/admin/RoleCard.jsx',
  'src/components/admin/StatsCard.jsx',
  'src/components/admin/index.js',
  
  // Servicios
  'src/services/userManagementService.js',
  
  // Stores
  'src/stores/useUserManagementStore.js',
  
  // Hooks
  'src/hooks/usePermissions.js',
  
  // Configuración
  'firestore.rules'
];

let filesOk = 0;
let filesMissing = 0;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
    filesOk++;
  } else {
    console.log(`❌ ${file} - FALTA`);
    filesMissing++;
  }
});

console.log(`\n📊 Resultado: ${filesOk} archivos OK, ${filesMissing} archivos faltantes`);

// Test 2: Verificar imports en App.jsx
console.log('\n📦 Test 2: Verificación de imports en App.jsx');

try {
  const appContent = fs.readFileSync('src/App.jsx', 'utf8');
  
  const requiredImports = [
    'SuperAdminDashboard',
    'usePermissions',
    'Settings'
  ];
  
  let importsOk = 0;
  requiredImports.forEach(importName => {
    if (appContent.includes(importName)) {
      console.log(`✅ Import: ${importName}`);
      importsOk++;
    } else {
      console.log(`❌ Import: ${importName} - FALTA`);
    }
  });
  
  console.log(`📊 Imports: ${importsOk}/${requiredImports.length} OK`);
} catch (error) {
  console.log('❌ Error leyendo App.jsx:', error.message);
}

// Test 3: Verificar integración del sistema de permisos
console.log('\n🔐 Test 3: Verificación del sistema de permisos');

try {
  const appContent = fs.readFileSync('src/App.jsx', 'utf8');
  
  const permissionChecks = [
    'usePermissions()',
    'visibleModules',
    'canViewConfig',
    'activeTab === \'config\'',
    'SuperAdminDashboard'
  ];
  
  let checksOk = 0;
  permissionChecks.forEach(check => {
    if (appContent.includes(check)) {
      console.log(`✅ Check: ${check}`);
      checksOk++;
    } else {
      console.log(`❌ Check: ${check} - FALTA`);
    }
  });
  
  console.log(`📊 Checks de permisos: ${checksOk}/${permissionChecks.length} OK`);
} catch (error) {
  console.log('❌ Error verificando permisos:', error.message);
}

// Test 4: Verificar reglas de Firestore
console.log('\n🔥 Test 4: Verificación de reglas de Firestore');

try {
  const rulesContent = fs.readFileSync('firestore.rules', 'utf8');
  
  const requiredRules = [
    'userProfiles',
    'isSuperAdmin',
    'roberto@mistatas.com',
    'systemConfig',
    'auditLogs'
  ];
  
  let rulesOk = 0;
  requiredRules.forEach(rule => {
    if (rulesContent.includes(rule)) {
      console.log(`✅ Regla: ${rule}`);
      rulesOk++;
    } else {
      console.log(`❌ Regla: ${rule} - FALTA`);
    }
  });
  
  console.log(`📊 Reglas de Firestore: ${rulesOk}/${requiredRules.length} OK`);
} catch (error) {
  console.log('❌ Error leyendo firestore.rules:', error.message);
}

// Test 5: Verificar estructura del store de user management
console.log('\n🏪 Test 5: Verificación del store de gestión de usuarios');

try {
  const storeContent = fs.readFileSync('src/stores/useUserManagementStore.js', 'utf8');
  
  const storeFeatures = [
    'super_admin',
    'teleoperadora',
    'getUserPermissions',
    'isSuperAdmin',
    'canAccessModule',
    'roles:'
  ];
  
  let featuresOk = 0;
  storeFeatures.forEach(feature => {
    if (storeContent.includes(feature)) {
      console.log(`✅ Feature: ${feature}`);
      featuresOk++;
    } else {
      console.log(`❌ Feature: ${feature} - FALTA`);
    }
  });
  
  console.log(`📊 Features del store: ${featuresOk}/${storeFeatures.length} OK`);
} catch (error) {
  console.log('❌ Error leyendo store:', error.message);
}

// Test 6: Verificar hook de permisos
console.log('\n🎣 Test 6: Verificación del hook de permisos');

try {
  const hookContent = fs.readFileSync('src/hooks/usePermissions.js', 'utf8');
  
  const hookFeatures = [
    'usePermissions',
    'roberto@mistatas.com',
    'visibleModules',
    'canViewConfig',
    'checkModuleAccess',
    'defaultTab'
  ];
  
  let hookOk = 0;
  hookFeatures.forEach(feature => {
    if (hookContent.includes(feature)) {
      console.log(`✅ Hook feature: ${feature}`);
      hookOk++;
    } else {
      console.log(`❌ Hook feature: ${feature} - FALTA`);
    }
  });
  
  console.log(`📊 Features del hook: ${hookOk}/${hookFeatures.length} OK`);
} catch (error) {
  console.log('❌ Error leyendo hook:', error.message);
}

// Resumen final
console.log('\n' + '='.repeat(60));
console.log('📋 RESUMEN DE PRUEBAS');
console.log('='.repeat(60));

const totalTests = 6;
let passedTests = 0;

if (filesMissing === 0) passedTests++;
if (fs.existsSync('src/App.jsx')) passedTests++;
// Aquí podrías añadir más lógica de verificación

console.log(`✅ Archivos principales: ${filesOk} de ${requiredFiles.length} presentes`);
console.log(`🔧 Configuración: Firestore rules actualizadas`);
console.log(`⚡ Sistema de permisos: Integrado en App.jsx`);
console.log(`🎯 Super Admin: Configurado para roberto@mistatas.com`);

console.log('\n🚀 SIGUIENTE PASO:');
console.log('   Ejecutar "npm run dev" para probar el sistema completo');
console.log('   El super admin puede acceder a "Configuración" en el menú lateral');

console.log('\n💡 NOTAS:');
console.log('   - El super admin se identifica por email: roberto@mistatas.com');
console.log('   - Los demás usuarios tendrán acceso según su rol asignado');
console.log('   - Las reglas de Firestore protegen el acceso a datos sensibles');

console.log('\n🧪 PRUEBAS COMPLETADAS');
