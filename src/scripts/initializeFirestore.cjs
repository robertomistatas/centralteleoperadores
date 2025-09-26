#!/usr/bin/env node

/**
 * Script de Inicialización de Firestore para Sistema de Métricas
 * 
 * Este script reemplaza las Cloud Functions para usuarios en plan gratuito de Firebase.
 * Procesa archivos Excel, calcula métricas y las guarda en Firestore.
 * 
 * Uso:
 *   node src/scripts/initializeFirestore.js
 *   node src/scripts/initializeFirestore.js --file=path/to/excel.xlsx
 *   node src/scripts/initializeFirestore.js --reset
 * 
 * @author Sistema de Métricas - Central Teleoperadores
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Configuración y constantes
const CONFIG = {
  BATCH_SIZE: 500, // Firestore batch limit
  EXCEL_PATH: './data/llamadas.xlsx', // Ruta por defecto del Excel
  SERVICE_ACCOUNT_PATH: './serviceAccountKey.json',
  COLLECTION_NAMES: {
    GLOBAL: 'metricas_globales',
    TELEOPERADORAS: 'metricas_teleoperadoras', 
    BENEFICIARIOS: 'metricas_beneficiarios',
    NO_ASIGNADOS: 'metricas_no_asignados',
    RAW_DATA: 'datos_llamadas'
  },
  BUSINESS_RULES: {
    AL_DIA_DAYS: 15,
    PENDIENTE_DAYS: 30,
    URGENTE_DAYS: 30
  }
};

// Colores para output en consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Variables globales
let db;
let args = {};

/**
 * Función para imprimir mensajes con colores
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Función para mostrar el banner de inicio
 */
function showBanner() {
  log('\n' + '='.repeat(70), 'cyan');
  log('🚀 INICIALIZADOR DE FIRESTORE - SISTEMA DE MÉTRICAS', 'bright');
  log('   Central Teleoperadores v1.0.0', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');
}

/**
 * Función para parsear argumentos de línea de comandos
 */
function parseArguments() {
  const argv = process.argv.slice(2);
  args = {};
  
  argv.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      args[key] = value || true;
    }
  });
  
  log('📋 Argumentos detectados:', 'blue');
  console.log(args);
  console.log();
}

/**
 * Función para inicializar Firebase Admin
 */
async function initializeFirebase() {
  try {
    log('🔥 Inicializando Firebase Admin SDK...', 'yellow');
    
    // Intentar cargar service account key
    const serviceAccountPath = args.serviceAccount || CONFIG.SERVICE_ACCOUNT_PATH;
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(path.resolve(serviceAccountPath));
      initializeApp({
        credential: cert(serviceAccount),
        projectId: 'centralteleoperadores'
      });
      log('✅ Firebase inicializado con Service Account Key', 'green');
    } else if (args.token || process.env.FIREBASE_TOKEN) {
      // Usar token de Firebase CLI
      const { getAuth } = require('firebase-admin/auth');
      const token = args.token || process.env.FIREBASE_TOKEN;
      
      initializeApp({
        projectId: 'centralteleoperadores'
      });
      log('✅ Firebase inicializado con token de CLI', 'green');
    } else {
      // Mostrar instrucciones para obtener token
      log('❌ No se encontraron credenciales válidas', 'red');
      log('\n💡 Para solucionar esto:', 'yellow');
      log('1. Ejecuta: firebase login:ci', 'yellow');
      log('2. Copia el token generado', 'yellow');
      log('3. Ejecuta: npm run init-firestore -- --token=TU_TOKEN', 'yellow');
      log('   O: set FIREBASE_TOKEN=TU_TOKEN && npm run init-firestore', 'yellow');
      log('\n🔑 Token de ejemplo:', 'blue');
      log('   npm run init-firestore -- --token=1//0hQ0vE9ES07guCgYIARAAGBESNwF-L9IrLvwW5TiA...', 'blue');
      process.exit(1);
    }
    
    db = getFirestore();
    log('✅ Firestore conectado correctamente\n', 'green');
    
  } catch (error) {
    log('❌ Error inicializando Firebase:', 'red');
    console.error(error.message);
    log('\n💡 Sugerencias:', 'yellow');
    log('1. Usa el token de Firebase CLI: npm run init-firestore -- --token=TU_TOKEN', 'yellow');
    log('2. O configura variable de entorno: set FIREBASE_TOKEN=TU_TOKEN', 'yellow');
    log('3. O usa Service Account Key si tienes permisos: --serviceAccount=key.json', 'yellow');
    log('4. Verifica permisos de Firestore en Firebase Console\n', 'yellow');
    process.exit(1);
  }
}

/**
 * Función para leer y parsear archivo Excel
 */
function readExcelFile(filePath) {
  try {
    log(`📊 Leyendo archivo Excel: ${filePath}`, 'yellow');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo no encontrado: ${filePath}`);
    }
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    log(`✅ Excel leído: ${data.length} filas encontradas`, 'green');
    
    // Mostrar muestra de las primeras filas
    if (data.length > 0) {
      log('\n📋 Muestra de datos (primeras 3 filas):', 'blue');
      console.table(data.slice(0, 3));
      
      log('\n📋 Columnas detectadas:', 'blue');
      console.log(Object.keys(data[0]));
    }
    
    return data;
    
  } catch (error) {
    log('❌ Error leyendo archivo Excel:', 'red');
    console.error(error.message);
    log('\n💡 Sugerencias:', 'yellow');
    log('1. Verifica que el archivo existe y es un Excel válido (.xlsx, .xls)', 'yellow');
    log('2. Asegúrate de que tiene permisos de lectura', 'yellow');
    log('3. Usa: --file=ruta/a/tu/archivo.xlsx\n', 'yellow');
    process.exit(1);
  }
}

/**
 * Función para limpiar y normalizar datos del Excel
 */
function cleanData(rawData) {
  log('🧹 Limpiando y normalizando datos...', 'yellow');
  
  const cleanedData = rawData.map((row, index) => {
    try {
      // Normalizar nombres de campos (manejar diferentes formatos de Excel)
      const normalizedRow = {};
      
      Object.keys(row).forEach(key => {
        const normalizedKey = key.toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[áàäâ]/g, 'a')
          .replace(/[éèëê]/g, 'e')
          .replace(/[íìïî]/g, 'i')
          .replace(/[óòöô]/g, 'o')
          .replace(/[úùüû]/g, 'u')
          .replace(/ñ/g, 'n');
        
        normalizedRow[normalizedKey] = row[key];
      });
      
      // Campos estándar esperados
      const cleaned = {
        id: `call_${index + 1}`,
        fecha: parseDate(normalizedRow.fecha || normalizedRow.date || normalizedRow.fecha_llamada),
        teleoperadora: normalizedRow.teleoperadora || normalizedRow.operador || normalizedRow.operator || 'Sin Asignar',
        beneficiario: normalizedRow.beneficiario || normalizedRow.cliente || normalizedRow.client || 'Sin Nombre',
        telefono: cleanPhone(normalizedRow.telefono || normalizedRow.phone || normalizedRow.celular),
        duracion: parseInt(normalizedRow.duracion || normalizedRow.duration || 0),
        exitosa: parseBoolean(normalizedRow.exitosa || normalizedRow.exito || normalizedRow.success),
        motivo: normalizedRow.motivo || normalizedRow.reason || normalizedRow.observaciones || '',
        comuna: normalizedRow.comuna || normalizedRow.city || normalizedRow.ciudad || '',
        timestamp: new Date(),
        
        // Campos calculados
        hora: new Date(parseDate(normalizedRow.fecha || normalizedRow.date)).getHours(),
        dia_semana: getDayOfWeek(parseDate(normalizedRow.fecha || normalizedRow.date)),
        mes: new Date(parseDate(normalizedRow.fecha || normalizedRow.date)).getMonth() + 1,
        año: new Date(parseDate(normalizedRow.fecha || normalizedRow.date)).getFullYear()
      };
      
      return cleaned;
      
    } catch (error) {
      log(`⚠️ Error procesando fila ${index + 1}:`, 'yellow');
      console.error(error.message);
      return null;
    }
  }).filter(row => row !== null);
  
  log(`✅ Datos limpiados: ${cleanedData.length} filas válidas`, 'green');
  
  return cleanedData;
}

/**
 * Función para parsear fechas flexiblemente
 */
function parseDate(dateValue) {
  if (!dateValue) return new Date();
  
  // Si ya es una fecha
  if (dateValue instanceof Date) return dateValue;
  
  // Si es un número (Excel serial date)
  if (typeof dateValue === 'number') {
    return new Date((dateValue - 25569) * 86400 * 1000);
  }
  
  // Si es string, intentar varios formatos
  const dateStr = dateValue.toString().trim();
  
  // Formatos comunes
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format.source.startsWith('^(\\d{4})')) {
        // YYYY-MM-DD
        return new Date(match[1], match[2] - 1, match[3]);
      } else {
        // DD/MM/YYYY o DD-MM-YYYY
        return new Date(match[3], match[2] - 1, match[1]);
      }
    }
  }
  
  // Fallback: intentar parsear directamente
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Función para limpiar números de teléfono
 */
function cleanPhone(phone) {
  if (!phone) return '';
  return phone.toString().replace(/\D/g, '').slice(-9); // Mantener últimos 9 dígitos
}

/**
 * Función para parsear valores booleanos
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return ['true', 'verdadero', 'si', 'sí', 'yes', '1', 'exitosa'].includes(lower);
  }
  if (typeof value === 'number') return value > 0;
  return false;
}

/**
 * Función para obtener día de la semana
 */
function getDayOfWeek(date) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Función para calcular métricas globales
 */
function calculateGlobalMetrics(data) {
  log('📊 Calculando métricas globales...', 'yellow');
  
  const totalCalls = data.length;
  const successfulCalls = data.filter(call => call.exitosa).length;
  const failedCalls = totalCalls - successfulCalls;
  const uniqueBeneficiaries = new Set(data.map(call => call.beneficiario)).size;
  const uniqueOperators = new Set(data.map(call => call.teleoperadora)).size;
  
  const totalDuration = data.reduce((sum, call) => sum + (call.duracion || 0), 0);
  const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
  const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
  
  // Distribución por día de la semana
  const dayDistribution = {};
  data.forEach(call => {
    const day = call.dia_semana;
    dayDistribution[day] = (dayDistribution[day] || 0) + 1;
  });
  
  // Distribución por hora
  const hourDistribution = {};
  data.forEach(call => {
    const hour = call.hora;
    hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
  });
  
  // Distribución mensual
  const monthDistribution = {};
  data.forEach(call => {
    const month = call.mes;
    monthDistribution[month] = (monthDistribution[month] || 0) + 1;
  });
  
  const globalMetrics = {
    totalCalls,
    successfulCalls,
    failedCalls,
    uniqueBeneficiaries,
    uniqueOperators,
    totalDuration,
    averageDuration,
    successRate,
    dayDistribution,
    hourDistribution,
    monthDistribution,
    lastUpdated: new Date(),
    generatedBy: 'initializeFirestore.js',
    version: '1.0.0'
  };
  
  log(`✅ Métricas globales calculadas:`, 'green');
  log(`   - Total llamadas: ${totalCalls}`, 'green');
  log(`   - Llamadas exitosas: ${successfulCalls} (${successRate.toFixed(1)}%)`, 'green');
  log(`   - Beneficiarios únicos: ${uniqueBeneficiaries}`, 'green');
  log(`   - Teleoperadoras activas: ${uniqueOperators}`, 'green');
  
  return globalMetrics;
}

/**
 * Función para calcular métricas por teleoperadora
 */
function calculateOperatorMetrics(data) {
  log('👥 Calculando métricas por teleoperadora...', 'yellow');
  
  const operatorGroups = {};
  
  // Agrupar por teleoperadora
  data.forEach(call => {
    const operator = call.teleoperadora;
    if (!operatorGroups[operator]) {
      operatorGroups[operator] = [];
    }
    operatorGroups[operator].push(call);
  });
  
  const operatorMetrics = {};
  
  Object.entries(operatorGroups).forEach(([operatorName, calls]) => {
    const totalCalls = calls.length;
    const successfulCalls = calls.filter(call => call.exitosa).length;
    const failedCalls = totalCalls - successfulCalls;
    const totalDuration = calls.reduce((sum, call) => sum + (call.duracion || 0), 0);
    const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    const uniqueBeneficiaries = new Set(calls.map(call => call.beneficiario)).size;
    
    // Distribución por hora para esta operadora
    const hourDistribution = {};
    calls.forEach(call => {
      const hour = call.hora;
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    });
    
    // Últimas llamadas (máximo 100)
    const recentCalls = calls
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 100)
      .map(call => ({
        id: call.id,
        fecha: call.fecha,
        beneficiario: call.beneficiario,
        telefono: call.telefono,
        duracion: call.duracion,
        exitosa: call.exitosa,
        motivo: call.motivo
      }));
    
    operatorMetrics[operatorName] = {
      nombreOriginal: operatorName,
      totalCalls,
      successfulCalls,
      failedCalls,
      totalDuration,
      averageDuration,
      successRate,
      uniqueBeneficiaries,
      hourDistribution,
      recentCalls,
      lastUpdated: new Date(),
      generatedBy: 'initializeFirestore.js'
    };
  });
  
  log(`✅ Métricas calculadas para ${Object.keys(operatorMetrics).length} teleoperadoras`, 'green');
  
  return operatorMetrics;
}

/**
 * Función para calcular métricas de beneficiarios
 */
function calculateBeneficiaryMetrics(data) {
  log('🏥 Calculando métricas de beneficiarios...', 'yellow');
  
  const beneficiaryGroups = {};
  
  // Agrupar por beneficiario
  data.forEach(call => {
    const beneficiary = call.beneficiario;
    if (!beneficiaryGroups[beneficiary]) {
      beneficiaryGroups[beneficiary] = [];
    }
    beneficiaryGroups[beneficiary].push(call);
  });
  
  const now = new Date();
  const beneficiaryMetrics = {};
  let statusCounts = { 'Al día': 0, 'Pendiente': 0, 'Urgente': 0 };
  
  Object.entries(beneficiaryGroups).forEach(([beneficiaryName, calls]) => {
    // Ordenar llamadas por fecha (más reciente primero)
    calls.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    const lastCall = calls[0];
    const daysSinceLastCall = Math.floor((now - new Date(lastCall.fecha)) / (1000 * 60 * 60 * 24));
    
    // Determinar estado según reglas de negocio
    let status;
    if (daysSinceLastCall <= CONFIG.BUSINESS_RULES.AL_DIA_DAYS) {
      status = 'Al día';
    } else if (daysSinceLastCall <= CONFIG.BUSINESS_RULES.PENDIENTE_DAYS) {
      status = 'Pendiente';
    } else {
      status = 'Urgente';
    }
    
    statusCounts[status]++;
    
    const totalCalls = calls.length;
    const successfulCalls = calls.filter(call => call.exitosa).length;
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    
    beneficiaryMetrics[beneficiaryName] = {
      nombreOriginal: beneficiaryName,
      status,
      daysSinceLastCall,
      lastCall: {
        fecha: lastCall.fecha,
        teleoperadora: lastCall.teleoperadora,
        exitosa: lastCall.exitosa,
        motivo: lastCall.motivo
      },
      totalCalls,
      successfulCalls,
      successRate,
      telefono: lastCall.telefono,
      comuna: lastCall.comuna,
      lastUpdated: new Date(),
      generatedBy: 'initializeFirestore.js'
    };
  });
  
  log(`✅ Métricas calculadas para ${Object.keys(beneficiaryMetrics).length} beneficiarios`, 'green');
  log(`   - Al día: ${statusCounts['Al día']}`, 'green');
  log(`   - Pendiente: ${statusCounts['Pendiente']}`, 'yellow');
  log(`   - Urgente: ${statusCounts['Urgente']}`, 'red');
  
  return {
    beneficiarios: beneficiaryMetrics,
    resumen: statusCounts
  };
}

/**
 * Función para guardar datos en Firestore en lotes
 */
async function saveToFirestore(collectionName, data, documentId = null) {
  try {
    log(`💾 Guardando en colección: ${collectionName}`, 'yellow');
    
    if (documentId) {
      // Guardar documento único
      await db.collection(collectionName).doc(documentId).set(data);
      log(`✅ Documento guardado: ${collectionName}/${documentId}`, 'green');
    } else {
      // Guardar múltiples documentos en lotes
      const entries = Object.entries(data);
      const batches = [];
      
      for (let i = 0; i < entries.length; i += CONFIG.BATCH_SIZE) {
        const batch = db.batch();
        const batchEntries = entries.slice(i, i + CONFIG.BATCH_SIZE);
        
        batchEntries.forEach(([key, value]) => {
          const docRef = db.collection(collectionName).doc(key);
          batch.set(docRef, value);
        });
        
        batches.push(batch);
      }
      
      // Ejecutar lotes
      for (let i = 0; i < batches.length; i++) {
        await batches[i].commit();
        log(`✅ Lote ${i + 1}/${batches.length} guardado (${Math.min((i + 1) * CONFIG.BATCH_SIZE, entries.length)}/${entries.length} documentos)`, 'green');
      }
    }
    
  } catch (error) {
    log(`❌ Error guardando en ${collectionName}:`, 'red');
    console.error(error.message);
    throw error;
  }
}

/**
 * Función para limpiar colecciones existentes
 */
async function resetCollections() {
  log('🗑️ Limpiando colecciones existentes...', 'yellow');
  
  const collections = Object.values(CONFIG.COLLECTION_NAMES);
  
  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName).get();
      
      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        log(`✅ Colección ${collectionName} limpiada (${snapshot.size} documentos eliminados)`, 'green');
      } else {
        log(`ℹ️ Colección ${collectionName} ya estaba vacía`, 'blue');
      }
    } catch (error) {
      log(`⚠️ Error limpiando ${collectionName}: ${error.message}`, 'yellow');
    }
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    showBanner();
    parseArguments();
    
    // Mostrar ayuda si se solicita
    if (args.help || args.h) {
      showHelp();
      return;
    }
    
    // Inicializar Firebase
    await initializeFirebase();
    
    // Reset si se solicita
    if (args.reset) {
      await resetCollections();
      log('✅ Reset completado. Ejecuta nuevamente sin --reset para cargar datos\n', 'green');
      return;
    }
    
    // Determinar archivo Excel a usar
    const excelPath = args.file || CONFIG.EXCEL_PATH;
    
    // Leer y procesar datos
    const rawData = readExcelFile(excelPath);
    const cleanedData = cleanData(rawData);
    
    if (cleanedData.length === 0) {
      log('❌ No hay datos válidos para procesar', 'red');
      return;
    }
    
    // Calcular métricas
    log('\n📊 CALCULANDO MÉTRICAS...', 'cyan');
    const globalMetrics = calculateGlobalMetrics(cleanedData);
    const operatorMetrics = calculateOperatorMetrics(cleanedData);
    const beneficiaryResult = calculateBeneficiaryMetrics(cleanedData);
    
    // Guardar en Firestore
    log('\n💾 GUARDANDO EN FIRESTORE...', 'cyan');
    
    await saveToFirestore(CONFIG.COLLECTION_NAMES.GLOBAL, globalMetrics, 'current');
    await saveToFirestore(CONFIG.COLLECTION_NAMES.TELEOPERADORAS, operatorMetrics);
    await saveToFirestore(CONFIG.COLLECTION_NAMES.BENEFICIARIOS, beneficiaryResult.beneficiarios);
    
    // Guardar resumen de beneficiarios
    await saveToFirestore(CONFIG.COLLECTION_NAMES.NO_ASIGNADOS, {
      resumen: beneficiaryResult.resumen,
      totalBeneficiarios: Object.keys(beneficiaryResult.beneficiarios).length,
      lastUpdated: new Date(),
      generatedBy: 'initializeFirestore.js'
    }, 'summary');
    
    // Opcionalmente guardar datos raw
    if (args.saveRaw) {
      log('💾 Guardando dados raw...', 'yellow');
      const rawBatches = {};
      cleanedData.forEach((call, index) => {
        rawBatches[call.id] = call;
      });
      await saveToFirestore(CONFIG.COLLECTION_NAMES.RAW_DATA, rawBatches);
    }
    
    // Mostrar resumen final
    log('\n🎉 PROCESO COMPLETADO EXITOSAMENTE', 'green');
    log('='.repeat(50), 'cyan');
    log(`📊 Total llamadas procesadas: ${cleanedData.length}`, 'green');
    log(`👥 Teleoperadoras: ${Object.keys(operatorMetrics).length}`, 'green');
    log(`🏥 Beneficiarios: ${Object.keys(beneficiaryResult.beneficiarios).length}`, 'green');
    log(`✅ Tasa de éxito global: ${globalMetrics.successRate.toFixed(1)}%`, 'green');
    log('='.repeat(50), 'cyan');
    
    log('\n💡 Próximos pasos:', 'blue');
    log('1. Verifica los datos en tu consola de Firebase', 'blue');
    log('2. Abre tu aplicación web para ver las métricas', 'blue');
    log('3. El sistema ahora usará datos reales en lugar del modo demo', 'blue');
    
  } catch (error) {
    log('\n❌ ERROR CRÍTICO:', 'red');
    console.error(error);
    log('\n💡 Posibles soluciones:', 'yellow');
    log('1. Verifica tu conexión a internet', 'yellow');
    log('2. Revisa las credenciales de Firebase', 'yellow');
    log('3. Asegúrate de que el archivo Excel existe y es válido', 'yellow');
    log('4. Ejecuta con --help para ver opciones disponibles', 'yellow');
    process.exit(1);
  }
}

/**
 * Función para mostrar ayuda
 */
function showHelp() {
  log('\n📖 AYUDA - initializeFirestore.cjs', 'cyan');
  log('='.repeat(50), 'cyan');
  log('\nUso:', 'bright');
  log('  node src/scripts/initializeFirestore.cjs [opciones]', 'blue');
  
  log('\nOpciones:', 'bright');
  log('  --help, -h              Mostrar esta ayuda', 'blue');
  log('  --file=RUTA            Especificar archivo Excel (default: ./data/llamadas.xlsx)', 'blue');
  log('  --reset                Limpiar todas las colecciones antes de cargar', 'blue');
  log('  --saveRaw              Guardar también los datos raw en Firestore', 'blue');
  log('  --serviceAccount=RUTA  Especificar ruta del service account key', 'blue');
  
  log('\nEjemplos:', 'bright');
  log('  npm run init-firestore', 'green');
  log('  node src/scripts/initializeFirestore.cjs --file=mi_archivo.xlsx', 'green');
  log('  node src/scripts/initializeFirestore.cjs --reset', 'green');
  log('  node src/scripts/initializeFirestore.cjs --file=datos.xlsx --saveRaw', 'green');
  
  log('\nRequisitos:', 'bright');
  log('  • Node.js v14+', 'blue');
  log('  • Firebase project configurado', 'blue');  
  log('  • Service Account Key o credenciales por defecto', 'blue');
  log('  • Archivo Excel con datos de llamadas', 'blue');
  
  log('\nMás información:', 'bright');
  log('  🌐 Documentación: README.md', 'blue');
  log('  🐛 Reportar bugs: GitHub Issues', 'blue');
  log('='.repeat(50) + '\n', 'cyan');
}

// Ejecutar script solo si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

// Exportar funciones para testing
module.exports = {
  cleanData,
  calculateGlobalMetrics,
  calculateOperatorMetrics,
  calculateBeneficiaryMetrics,
  parseDate,
  cleanPhone,
  parseBoolean
};