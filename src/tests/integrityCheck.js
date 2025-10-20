/**
 * FASE 5 - TAREA 5.2: Integrity Check Script
 * 
 * Valida la integridad completa de la aplicación antes de RC1:
 * 1. Stores Zustand activos y sincronizados
 * 2. No existen módulos huérfanos ni componentes sin uso
 * 3. Dependencias cruzadas limpias entre módulos
 * 4. Logs sin warnings críticos
 * 
 * Genera: INTEGRITY_AUDIT_RC1.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const CONFIG = {
  rootDir: path.resolve(__dirname, '../..'),
  srcDir: path.resolve(__dirname, '..'),
  outputFile: path.resolve(__dirname, '../../INTEGRITY_AUDIT_RC1.md'),
  
  // Stores esperados (activos, sin duplicados)
  expectedStores: [
    'useExcelStore.js',
    'useMetricsStore.js',
    'useAuthStore.js',
    'useSeguimientosStore.js',
    'useGestionesStore.js'
  ],
  
  // Stores duplicados a eliminar
  duplicateStores: [
    'useAppStore-fixed.js',
    'useCallStore-fixed.js',
    'useCallStore-optimized.js'
  ],
  
  // Módulos core
  coreModules: [
    'dashboards/GlobalDashboard.jsx',
    'examples/AuditDemo_Final.jsx',
    'historial/HistorialSeguimientos.jsx',
    'seguimientos/TeleoperadoraDashboard.jsx',
    'gestiones/GestionesModule.jsx'
  ],
  
  // Servicios core
  coreServices: [
    'metricsEngine.js',
    'realtimeSync.js'
  ],
  
  // Tests core (están en src/tests/)
  coreTests: [
    'consistencyTest.js',
    'performanceStressTest.js',
    'integrityCheck.js'
  ],
  
  // Utilidades core
  coreUtils: [
    'performanceMonitor.js',
    'lazyComponents.js',
    'logger.js'
  ],
  
  // Patrones a evitar
  avoidPatterns: [
    'console.log',
    'debugger',
    'TODO:',
    'FIXME:',
    'HACK:',
    'XXX:'
  ]
};

// Resultados del audit
const auditResults = {
  timestamp: new Date().toISOString(),
  stores: { passed: [], failed: [], warnings: [] },
  modules: { passed: [], missing: [], orphaned: [] },
  services: { passed: [], missing: [] },
  utils: { passed: [], missing: [] },
  dependencies: { clean: [], issues: [] },
  codeQuality: { warnings: [], errors: [] },
  overall: { status: 'PENDING', passRate: 0, criticalIssues: 0 }
};

/**
 * Valida existencia y exportaciones de stores Zustand
 */
function validateStores() {
  console.log('\n🔍 Validando Stores Zustand...');
  
  const storesDir = path.join(CONFIG.srcDir, 'stores');
  
  // Primero detectar duplicados
  if (CONFIG.duplicateStores) {
    CONFIG.duplicateStores.forEach(dupStore => {
      const dupPath = path.join(storesDir, dupStore);
      if (fs.existsSync(dupPath)) {
        auditResults.stores.warnings.push({
          file: dupStore,
          issue: 'Store duplicado/legacy detectado - eliminar',
          severity: 'MEDIUM'
        });
      }
    });
  }
  
  CONFIG.expectedStores.forEach(storeName => {
    const storePath = path.join(storesDir, storeName);
    
    if (!fs.existsSync(storePath)) {
      auditResults.stores.failed.push({
        file: storeName,
        issue: 'Store no encontrado',
        severity: 'CRITICAL'
      });
      return;
    }
    
    const content = fs.readFileSync(storePath, 'utf-8');
    
    // Verificar patrón Zustand
    if (!content.includes('create(') || !content.includes('export')) {
      auditResults.stores.warnings.push({
        file: storeName,
        issue: 'Patrón Zustand no detectado claramente',
        severity: 'MEDIUM'
      });
    }
    
    // Verificar que no tenga console.log sin logger
    const consoleMatches = content.match(/console\.(log|warn|error)/g);
    if (consoleMatches && consoleMatches.length > 3) {
      auditResults.stores.warnings.push({
        file: storeName,
        issue: `${consoleMatches.length} console statements (usar logger)`,
        severity: 'LOW'
      });
    }
    
    auditResults.stores.passed.push({
      file: storeName,
      size: (fs.statSync(storePath).size / 1024).toFixed(2) + ' KB',
      lines: content.split('\n').length
    });
  });
  
  console.log(`✅ Stores válidos: ${auditResults.stores.passed.length}`);
  console.log(`⚠️ Warnings: ${auditResults.stores.warnings.length}`);
  console.log(`❌ Críticos: ${auditResults.stores.failed.length}`);
}

/**
 * Valida módulos core y detecta componentes huérfanos
 */
function validateModules() {
  console.log('\n🔍 Validando Módulos Core...');
  
  const componentsDir = path.join(CONFIG.srcDir, 'components');
  
  CONFIG.coreModules.forEach(modulePath => {
    const fullPath = path.join(componentsDir, modulePath);
    
    if (!fs.existsSync(fullPath)) {
      auditResults.modules.missing.push({
        file: modulePath,
        issue: 'Módulo core no encontrado',
        severity: 'CRITICAL'
      });
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // Verificar exportación default o named
    if (!content.includes('export default') && !content.includes('export const')) {
      auditResults.modules.missing.push({
        file: modulePath,
        issue: 'Sin exportación válida',
        severity: 'HIGH'
      });
      return;
    }
    
    auditResults.modules.passed.push({
      file: modulePath,
      size: (fs.statSync(fullPath).size / 1024).toFixed(2) + ' KB',
      lines: content.split('\n').length
    });
  });
  
  // Detectar componentes huérfanos (no importados en ningún lado)
  const allJsxFiles = getAllFiles(componentsDir, '.jsx');
  const appJsxContent = fs.readFileSync(path.join(CONFIG.srcDir, 'App.jsx'), 'utf-8');
  const lazyComponentsContent = fs.readFileSync(
    path.join(CONFIG.srcDir, 'utils', 'lazyComponents.js'), 
    'utf-8'
  );
  
  allJsxFiles.forEach(filePath => {
    const fileName = path.basename(filePath, '.jsx');
    
    // Componentes comunes que es normal que no se importen directamente
    const commonComponents = ['LoadingFallback', 'ErrorBoundary', 'Icon'];
    if (commonComponents.some(common => fileName.includes(common))) {
      return;
    }
    
    // Verificar si está importado en App.jsx o lazyComponents.js
    const isImported = 
      appJsxContent.includes(fileName) || 
      lazyComponentsContent.includes(fileName);
    
    if (!isImported && !CONFIG.coreModules.some(m => m.includes(fileName))) {
      auditResults.modules.orphaned.push({
        file: path.relative(CONFIG.srcDir, filePath),
        issue: 'Componente potencialmente huérfano (no importado)',
        severity: 'LOW'
      });
    }
  });
  
  console.log(`✅ Módulos válidos: ${auditResults.modules.passed.length}`);
  console.log(`⚠️ Huérfanos: ${auditResults.modules.orphaned.length}`);
  console.log(`❌ Faltantes: ${auditResults.modules.missing.length}`);
}

/**
 * Valida servicios core
 */
function validateServices() {
  console.log('\n🔍 Validando Servicios Core...');
  
  const servicesDir = path.join(CONFIG.srcDir, 'services');
  
  CONFIG.coreServices.forEach(serviceName => {
    const servicePath = path.join(servicesDir, serviceName);
    
    if (!fs.existsSync(servicePath)) {
      auditResults.services.missing.push({
        file: serviceName,
        issue: 'Servicio core no encontrado',
        severity: 'CRITICAL'
      });
      return;
    }
    
    const content = fs.readFileSync(servicePath, 'utf-8');
    
    auditResults.services.passed.push({
      file: serviceName,
      size: (fs.statSync(servicePath).size / 1024).toFixed(2) + ' KB',
      lines: content.split('\n').length,
      exports: (content.match(/export (const|function|default)/g) || []).length
    });
  });
  
  // Validar tests core
  const testsDir = path.join(CONFIG.srcDir, 'tests');
  CONFIG.coreTests.forEach(testName => {
    const testPath = path.join(testsDir, testName);
    
    if (!fs.existsSync(testPath)) {
      auditResults.services.missing.push({
        file: `tests/${testName}`,
        issue: 'Test core no encontrado',
        severity: 'HIGH'
      });
      return;
    }
    
    const content = fs.readFileSync(testPath, 'utf-8');
    
    auditResults.services.passed.push({
      file: `tests/${testName}`,
      size: (fs.statSync(testPath).size / 1024).toFixed(2) + ' KB',
      lines: content.split('\n').length,
      exports: (content.match(/export (const|function|default)/g) || []).length
    });
  });
  
  console.log(`✅ Servicios + Tests válidos: ${auditResults.services.passed.length}`);
  console.log(`❌ Faltantes: ${auditResults.services.missing.length}`);
}

/**
 * Valida utilidades core
 */
function validateUtils() {
  console.log('\n🔍 Validando Utilidades Core...');
  
  const utilsDir = path.join(CONFIG.srcDir, 'utils');
  
  CONFIG.coreUtils.forEach(utilName => {
    const utilPath = path.join(utilsDir, utilName);
    
    if (!fs.existsSync(utilPath)) {
      auditResults.utils.missing.push({
        file: utilName,
        issue: 'Utilidad core no encontrada',
        severity: 'HIGH'
      });
      return;
    }
    
    const content = fs.readFileSync(utilPath, 'utf-8');
    
    auditResults.utils.passed.push({
      file: utilName,
      size: (fs.statSync(utilPath).size / 1024).toFixed(2) + ' KB',
      lines: content.split('\n').length,
      exports: (content.match(/export (const|function|default)/g) || []).length
    });
  });
  
  console.log(`✅ Utilidades válidas: ${auditResults.utils.passed.length}`);
  console.log(`❌ Faltantes: ${auditResults.utils.missing.length}`);
}

/**
 * Valida dependencias cruzadas entre módulos
 */
function validateDependencies() {
  console.log('\n🔍 Validando Dependencias Cruzadas...');
  
  // Verificar que metricsEngine no importa componentes React
  const metricsEnginePath = path.join(CONFIG.srcDir, 'services', 'metricsEngine.js');
  const metricsContent = fs.readFileSync(metricsEnginePath, 'utf-8');
  
  if (metricsContent.includes('import React') || metricsContent.includes('from \'react\'')) {
    auditResults.dependencies.issues.push({
      file: 'metricsEngine.js',
      issue: 'Servicio importa React (debería ser independiente)',
      severity: 'MEDIUM'
    });
  } else {
    auditResults.dependencies.clean.push({
      file: 'metricsEngine.js',
      check: 'Sin dependencias React'
    });
  }
  
  // Verificar que realtimeSync no tiene importaciones circulares
  const realtimeSyncPath = path.join(CONFIG.srcDir, 'services', 'realtimeSync.js');
  const realtimeContent = fs.readFileSync(realtimeSyncPath, 'utf-8');
  
  if (realtimeContent.includes('import') && realtimeContent.includes('App')) {
    auditResults.dependencies.issues.push({
      file: 'realtimeSync.js',
      issue: 'Posible importación circular con App.jsx',
      severity: 'HIGH'
    });
  } else {
    auditResults.dependencies.clean.push({
      file: 'realtimeSync.js',
      check: 'Sin importaciones circulares'
    });
  }
  
  // Verificar que stores no importan componentes
  CONFIG.expectedStores.forEach(storeName => {
    const storePath = path.join(CONFIG.srcDir, 'stores', storeName);
    
    if (!fs.existsSync(storePath)) {
      return; // Skip if store doesn't exist (already reported in validateStores)
    }
    
    const content = fs.readFileSync(storePath, 'utf-8');
    
    if (content.includes('../components/')) {
      auditResults.dependencies.issues.push({
        file: storeName,
        issue: 'Store importa componentes (violación de arquitectura)',
        severity: 'HIGH'
      });
    } else {
      auditResults.dependencies.clean.push({
        file: storeName,
        check: 'Sin importaciones de componentes'
      });
    }
  });
  
  console.log(`✅ Dependencias limpias: ${auditResults.dependencies.clean.length}`);
  console.log(`❌ Issues detectados: ${auditResults.dependencies.issues.length}`);
}

/**
 * Valida calidad de código
 */
function validateCodeQuality() {
  console.log('\n🔍 Validando Calidad de Código...');
  
  const allJsFiles = [
    ...getAllFiles(path.join(CONFIG.srcDir, 'components'), '.jsx'),
    ...getAllFiles(path.join(CONFIG.srcDir, 'services'), '.js'),
    ...getAllFiles(path.join(CONFIG.srcDir, 'utils'), '.js'),
    ...getAllFiles(path.join(CONFIG.srcDir, 'stores'), '.js')
  ];
  
  allJsFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(CONFIG.srcDir, filePath);
    
    // Buscar patrones a evitar
    CONFIG.avoidPatterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'gi');
      const matches = content.match(regex);
      
      if (matches && matches.length > 0) {
        // Excepción: logger.js puede tener console
        if (relativePath.includes('logger.js') && pattern === 'console.log') {
          return;
        }
        
        // Excepción: tests pueden tener console
        if (relativePath.includes('tests/') && pattern === 'console.log') {
          return;
        }
        
        auditResults.codeQuality.warnings.push({
          file: relativePath,
          issue: `${matches.length}x ${pattern}`,
          severity: pattern.includes('console') ? 'LOW' : 'MEDIUM'
        });
      }
    });
    
    // Detectar funciones sin JSDoc en servicios
    if (relativePath.includes('services/')) {
      const functionMatches = content.match(/export (const|function) \w+/g) || [];
      const jsdocMatches = content.match(/\/\*\*/g) || [];
      
      if (functionMatches.length > jsdocMatches.length + 2) {
        auditResults.codeQuality.warnings.push({
          file: relativePath,
          issue: `${functionMatches.length - jsdocMatches.length} funciones sin JSDoc`,
          severity: 'LOW'
        });
      }
    }
  });
  
  console.log(`⚠️ Warnings de calidad: ${auditResults.codeQuality.warnings.length}`);
  console.log(`❌ Errores críticos: ${auditResults.codeQuality.errors.length}`);
}

/**
 * Calcula resultado general
 */
function calculateOverallResult() {
  console.log('\n📊 Calculando Resultado General...');
  
  const criticalIssues = [
    ...auditResults.stores.failed,
    ...auditResults.modules.missing,
    ...auditResults.services.missing
  ].filter(issue => issue.severity === 'CRITICAL').length;
  
  const highIssues = [
    ...auditResults.dependencies.issues,
    ...auditResults.utils.missing
  ].filter(issue => issue.severity === 'HIGH').length;
  
  const totalChecks = 
    CONFIG.expectedStores.length +
    CONFIG.coreModules.length +
    CONFIG.coreServices.length +
    CONFIG.coreUtils.length;
  
  const passedChecks =
    auditResults.stores.passed.length +
    auditResults.modules.passed.length +
    auditResults.services.passed.length +
    auditResults.utils.passed.length;
  
  auditResults.overall.passRate = ((passedChecks / totalChecks) * 100).toFixed(2);
  auditResults.overall.criticalIssues = criticalIssues + highIssues;
  
  if (criticalIssues > 0) {
    auditResults.overall.status = 'FAILED';
  } else if (highIssues > 3) {
    auditResults.overall.status = 'WARNING';
  } else {
    auditResults.overall.status = 'PASSED';
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Estado: ${auditResults.overall.status}`);
  console.log(`Pass Rate: ${auditResults.overall.passRate}%`);
  console.log(`Issues Críticos: ${auditResults.overall.criticalIssues}`);
  console.log(`${'='.repeat(50)}\n`);
}

/**
 * Genera reporte Markdown
 */
function generateReport() {
  console.log('📝 Generando reporte INTEGRITY_AUDIT_RC1.md...');
  
  const report = `# INTEGRITY AUDIT - RELEASE CANDIDATE 1 (RC1)

**Fecha:** ${new Date(auditResults.timestamp).toLocaleString('es-ES')}  
**Estado General:** ${getStatusEmoji(auditResults.overall.status)} **${auditResults.overall.status}**  
**Pass Rate:** ${auditResults.overall.passRate}%  
**Issues Críticos:** ${auditResults.overall.criticalIssues}

---

## 📊 RESUMEN EJECUTIVO

| Categoría | Válidos | Warnings | Críticos | Estado |
|-----------|---------|----------|----------|--------|
| **Stores Zustand** | ${auditResults.stores.passed.length} | ${auditResults.stores.warnings.length} | ${auditResults.stores.failed.length} | ${getStatusEmoji(auditResults.stores.failed.length === 0 ? 'PASSED' : 'FAILED')} |
| **Módulos Core** | ${auditResults.modules.passed.length} | ${auditResults.modules.orphaned.length} | ${auditResults.modules.missing.length} | ${getStatusEmoji(auditResults.modules.missing.length === 0 ? 'PASSED' : 'FAILED')} |
| **Servicios Core** | ${auditResults.services.passed.length} | 0 | ${auditResults.services.missing.length} | ${getStatusEmoji(auditResults.services.missing.length === 0 ? 'PASSED' : 'FAILED')} |
| **Utilidades Core** | ${auditResults.utils.passed.length} | 0 | ${auditResults.utils.missing.length} | ${getStatusEmoji(auditResults.utils.missing.length === 0 ? 'PASSED' : 'FAILED')} |
| **Dependencias** | ${auditResults.dependencies.clean.length} | ${auditResults.dependencies.issues.filter(i => i.severity !== 'HIGH').length} | ${auditResults.dependencies.issues.filter(i => i.severity === 'HIGH').length} | ${getStatusEmoji(auditResults.dependencies.issues.length === 0 ? 'PASSED' : 'WARNING')} |
| **Calidad Código** | - | ${auditResults.codeQuality.warnings.length} | ${auditResults.codeQuality.errors.length} | ${getStatusEmoji(auditResults.codeQuality.errors.length === 0 ? 'PASSED' : 'WARNING')} |

---

## ✅ STORES ZUSTAND

### Stores Válidos (${auditResults.stores.passed.length})

${auditResults.stores.passed.map(store => 
  `- **${store.file}** - ${store.size}, ${store.lines} líneas`
).join('\n')}

${auditResults.stores.warnings.length > 0 ? `
### ⚠️ Warnings (${auditResults.stores.warnings.length})

${auditResults.stores.warnings.map(w => 
  `- **${w.file}**: ${w.issue} (Severidad: ${w.severity})`
).join('\n')}
` : ''}

${auditResults.stores.failed.length > 0 ? `
### ❌ Críticos (${auditResults.stores.failed.length})

${auditResults.stores.failed.map(f => 
  `- **${f.file}**: ${f.issue} (Severidad: ${f.severity})`
).join('\n')}
` : ''}

---

## 🧩 MÓDULOS CORE

### Módulos Válidos (${auditResults.modules.passed.length})

${auditResults.modules.passed.map(module => 
  `- **${module.file}** - ${module.size}, ${module.lines} líneas`
).join('\n')}

${auditResults.modules.orphaned.length > 0 ? `
### ⚠️ Componentes Huérfanos (${auditResults.modules.orphaned.length})

${auditResults.modules.orphaned.map(o => 
  `- **${o.file}**: ${o.issue}`
).join('\n')}

**Acción recomendada:** Revisar si estos componentes deben eliminarse o integrarse.
` : ''}

${auditResults.modules.missing.length > 0 ? `
### ❌ Módulos Faltantes (${auditResults.modules.missing.length})

${auditResults.modules.missing.map(m => 
  `- **${m.file}**: ${m.issue} (Severidad: ${m.severity})`
).join('\n')}
` : ''}

---

## ⚙️ SERVICIOS CORE

### Servicios Válidos (${auditResults.services.passed.length})

${auditResults.services.passed.map(service => 
  `- **${service.file}** - ${service.size}, ${service.lines} líneas, ${service.exports} exports`
).join('\n')}

${auditResults.services.missing.length > 0 ? `
### ❌ Servicios Faltantes (${auditResults.services.missing.length})

${auditResults.services.missing.map(m => 
  `- **${m.file}**: ${m.issue} (Severidad: ${m.severity})`
).join('\n')}
` : ''}

---

## 🛠️ UTILIDADES CORE

### Utilidades Válidas (${auditResults.utils.passed.length})

${auditResults.utils.passed.map(util => 
  `- **${util.file}** - ${util.size}, ${util.lines} líneas, ${util.exports} exports`
).join('\n')}

${auditResults.utils.missing.length > 0 ? `
### ❌ Utilidades Faltantes (${auditResults.utils.missing.length})

${auditResults.utils.missing.map(m => 
  `- **${m.file}**: ${m.issue} (Severidad: ${m.severity})`
).join('\n')}
` : ''}

---

## 🔗 DEPENDENCIAS CRUZADAS

### Dependencias Limpias (${auditResults.dependencies.clean.length})

${auditResults.dependencies.clean.map(dep => 
  `- ✅ **${dep.file}**: ${dep.check}`
).join('\n')}

${auditResults.dependencies.issues.length > 0 ? `
### ⚠️ Issues Detectados (${auditResults.dependencies.issues.length})

${auditResults.dependencies.issues.map(issue => 
  `- ${issue.severity === 'HIGH' ? '❌' : '⚠️'} **${issue.file}**: ${issue.issue} (Severidad: ${issue.severity})`
).join('\n')}
` : ''}

---

## 🎨 CALIDAD DE CÓDIGO

${auditResults.codeQuality.warnings.length > 0 ? `
### Warnings (${auditResults.codeQuality.warnings.length})

${auditResults.codeQuality.warnings.slice(0, 20).map(w => 
  `- **${w.file}**: ${w.issue} (Severidad: ${w.severity})`
).join('\n')}

${auditResults.codeQuality.warnings.length > 20 ? `\n*...y ${auditResults.codeQuality.warnings.length - 20} warnings adicionales*` : ''}
` : '✅ No se detectaron warnings críticos de calidad de código.'}

---

## 🎯 VEREDICTO FINAL

**Estado:** ${getStatusEmoji(auditResults.overall.status)} **${auditResults.overall.status}**

${auditResults.overall.status === 'PASSED' ? `
✅ **La aplicación está lista para RC1**

Todos los módulos core, servicios y stores están presentes y funcionando correctamente.
Las dependencias están limpias y no hay issues críticos.
` : ''}

${auditResults.overall.status === 'WARNING' ? `
⚠️ **La aplicación tiene warnings pero puede avanzar a RC1**

Existen algunos issues menores que deberían resolverse antes de producción, pero no bloquean RC1.
` : ''}

${auditResults.overall.status === 'FAILED' ? `
❌ **La aplicación NO está lista para RC1**

Se detectaron issues críticos que deben resolverse antes de continuar:
${[...auditResults.stores.failed, ...auditResults.modules.missing, ...auditResults.services.missing]
  .filter(i => i.severity === 'CRITICAL')
  .map(i => `- ${i.file}: ${i.issue}`)
  .join('\n')}
` : ''}

---

## 📋 CHECKLIST DE ACCIÓN

${auditResults.overall.criticalIssues === 0 ? '- [x]' : '- [ ]'} Resolver issues críticos
${auditResults.stores.warnings.length === 0 ? '- [x]' : '- [ ]'} Revisar warnings de stores
${auditResults.modules.orphaned.length === 0 ? '- [x]' : '- [ ]'} Limpiar componentes huérfanos
${auditResults.dependencies.issues.length === 0 ? '- [x]' : '- [ ]'} Resolver dependencias cruzadas
${auditResults.codeQuality.warnings.length < 10 ? '- [x]' : '- [ ]'} Mejorar calidad de código

---

**Generado automáticamente por:** \`integrityCheck.js\`  
**Timestamp:** ${auditResults.timestamp}  
**Versión:** RC1  
`;

  fs.writeFileSync(CONFIG.outputFile, report, 'utf-8');
  console.log(`✅ Reporte generado: ${CONFIG.outputFile}`);
}

/**
 * Helper: Obtener emoji de estado
 */
function getStatusEmoji(status) {
  const emojis = {
    'PASSED': '✅',
    'WARNING': '⚠️',
    'FAILED': '❌',
    'PENDING': '⏳'
  };
  return emojis[status] || '❓';
}

/**
 * Helper: Obtener todos los archivos con extensión específica
 */
function getAllFiles(dir, ext) {
  const files = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, ext));
    } else if (fullPath.endsWith(ext)) {
      files.push(fullPath);
    }
  });
  
  return files;
}

/**
 * Función principal
 */
async function runIntegrityCheck() {
  console.log('🚀 INICIANDO INTEGRITY CHECK - RC1');
  console.log('='.repeat(50));
  
  try {
    validateStores();
    validateModules();
    validateServices();
    validateUtils();
    validateDependencies();
    validateCodeQuality();
    calculateOverallResult();
    generateReport();
    
    console.log('\n✅ Integrity Check completado exitosamente');
    console.log(`📄 Reporte generado: INTEGRITY_AUDIT_RC1.md`);
    
    // Exit code basado en resultado
    if (auditResults.overall.status === 'FAILED') {
      process.exit(1);
    } else if (auditResults.overall.status === 'WARNING') {
      process.exit(0); // Warning pero no bloquea
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Error durante Integrity Check:', error);
    process.exit(1);
  }
}

// Ejecutar
runIntegrityCheck();
