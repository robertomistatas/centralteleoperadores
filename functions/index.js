/**
 * Cloud Functions para Central Teleoperadores
 * Procesa archivos Excel con datos de llamadas y calcula métricas automáticamente
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onRequest } from 'firebase-functions/v2/https';
import * as XLSX from 'xlsx';

// Inicializar Firebase Admin
initializeApp();
const db = getFirestore();
const storage = getStorage();

/**
 * Normaliza nombres para comparación (elimina tildes, convierte a minúsculas)
 */
function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
    .trim();
}

/**
 * Valida y normaliza números de teléfono
 */
function normalizePhone(phone) {
  if (!phone) return null;
  
  // Convertir a string y limpiar
  const cleaned = String(phone).replace(/\D/g, '');
  
  // Ignorar números inválidos como 000000000
  if (cleaned === '000000000' || cleaned.length < 8) {
    return null;
  }
  
  return cleaned;
}

/**
 * Convierte fecha de Excel a Date object
 */
function excelDateToDate(excelDate) {
  if (!excelDate) return null;
  
  // Si ya es una fecha
  if (excelDate instanceof Date) return excelDate;
  
  // Si es un número (fecha de Excel)
  if (typeof excelDate === 'number') {
    return new Date((excelDate - 25569) * 86400 * 1000);
  }
  
  // Si es string, intentar parsear
  if (typeof excelDate === 'string') {
    const parsed = new Date(excelDate);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  return null;
}

/**
 * Calcula el estado del beneficiario basado en sus llamadas
 */
function calculateBeneficiaryStatus(calls) {
  const now = new Date();
  const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  // Buscar llamadas exitosas
  const successfulCalls = calls.filter(call => call.exitosa === true || call.exitosa === 'Sí' || call.exitosa === 'SI');
  
  // Verificar llamadas en los últimos 15 días
  const recentSuccessful = successfulCalls.filter(call => call.fecha >= fifteenDaysAgo);
  if (recentSuccessful.length > 0) {
    return 'Al día';
  }
  
  // Verificar llamadas en los últimos 30 días
  const monthlySuccessful = successfulCalls.filter(call => call.fecha >= thirtyDaysAgo);
  if (monthlySuccessful.length > 0) {
    return 'Pendiente';
  }
  
  return 'Urgente';
}

/**
 * Procesa archivo Excel y extrae datos de llamadas
 */
function processExcelFile(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir a JSON con headers en la primera fila
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawData.length < 2) {
      throw new Error('El archivo Excel debe tener al menos 2 filas (headers + datos)');
    }
    
    const headers = rawData[0];
    const rows = rawData.slice(1);
    
    // Mapear headers comunes (ajustar según tu estructura de Excel)
    const headerMap = {
      'fecha': ['fecha', 'date', 'fecha_llamada'],
      'hora': ['hora', 'time', 'hora_llamada'],
      'teleoperadora': ['teleoperadora', 'operadora', 'agente'],
      'beneficiario': ['beneficiario', 'cliente', 'nombre'],
      'telefono1': ['telefono1', 'telefono_1', 'tel1', 'phone1'],
      'telefono2': ['telefono2', 'telefono_2', 'tel2', 'phone2'],
      'telefono3': ['telefono3', 'telefono_3', 'tel3', 'phone3'],
      'duracion': ['duracion', 'duration', 'tiempo'],
      'exitosa': ['exitosa', 'exito', 'successful', 'contacto'],
      'observaciones': ['observaciones', 'notas', 'comments']
    };
    
    // Encontrar índices de columnas
    const columnIndexes = {};
    Object.keys(headerMap).forEach(key => {
      const possibleNames = headerMap[key];
      const index = headers.findIndex(header => 
        possibleNames.some(name => 
          normalizeName(header).includes(normalizeName(name))
        )
      );
      columnIndexes[key] = index !== -1 ? index : null;
    });
    
    // Procesar filas
    const processedCalls = [];
    
    rows.forEach((row, index) => {
      try {
        // Extraer datos básicos
        const fecha = columnIndexes.fecha !== null ? excelDateToDate(row[columnIndexes.fecha]) : null;
        const hora = columnIndexes.hora !== null ? row[columnIndexes.hora] : null;
        const teleoperadora = columnIndexes.teleoperadora !== null ? String(row[columnIndexes.teleoperadora] || '').trim() : '';
        const beneficiario = columnIndexes.beneficiario !== null ? String(row[columnIndexes.beneficiario] || '').trim() : '';
        
        // Procesar teléfonos
        const telefonos = [];
        ['telefono1', 'telefono2', 'telefono3'].forEach(key => {
          if (columnIndexes[key] !== null) {
            const phone = normalizePhone(row[columnIndexes[key]]);
            if (phone) telefonos.push(phone);
          }
        });
        
        const duracion = columnIndexes.duracion !== null ? parseFloat(row[columnIndexes.duracion]) || 0 : 0;
        const exitosaRaw = columnIndexes.exitosa !== null ? row[columnIndexes.exitosa] : false;
        const observaciones = columnIndexes.observaciones !== null ? String(row[columnIndexes.observaciones] || '').trim() : '';
        
        // Determinar si la llamada fue exitosa
        let exitosa = false;
        if (typeof exitosaRaw === 'boolean') {
          exitosa = exitosaRaw;
        } else if (typeof exitosaRaw === 'string') {
          const exitosaStr = exitosaRaw.toLowerCase();
          exitosa = exitosaStr === 'sí' || exitosaStr === 'si' || exitosaStr === 'yes' || exitosaStr === 'true' || exitosaStr === '1';
        } else if (typeof exitosaRaw === 'number') {
          exitosa = exitosaRaw === 1;
        }
        
        // Validar datos mínimos
        if (!fecha || !beneficiario || telefonos.length === 0) {
          console.warn(`Fila ${index + 2} omitida: datos incompletos`);
          return;
        }
        
        const processedCall = {
          id: `call_${Date.now()}_${index}`,
          fecha,
          hora,
          teleoperadora: normalizeName(teleoperadora),
          teleoperadoraOriginal: teleoperadora,
          beneficiario: normalizeName(beneficiario),
          beneficiarioOriginal: beneficiario,
          telefonos,
          duracion,
          exitosa,
          observaciones,
          procesadoEn: new Date()
        };
        
        processedCalls.push(processedCall);
        
      } catch (error) {
        console.error(`Error procesando fila ${index + 2}:`, error);
      }
    });
    
    return processedCalls;
    
  } catch (error) {
    console.error('Error procesando archivo Excel:', error);
    throw error;
  }
}

/**
 * Calcula métricas globales
 */
async function calculateGlobalMetrics(calls) {
  const totalCalls = calls.length;
  const successfulCalls = calls.filter(call => call.exitosa).length;
  const failedCalls = totalCalls - successfulCalls;
  const totalDuration = calls.reduce((sum, call) => sum + call.duracion, 0);
  const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
  
  // Distribución por día de la semana
  const dayDistribution = {};
  const hourDistribution = {};
  
  calls.forEach(call => {
    const dayOfWeek = call.fecha.toLocaleDateString('es-ES', { weekday: 'long' });
    dayDistribution[dayOfWeek] = (dayDistribution[dayOfWeek] || 0) + 1;
    
    const hour = call.fecha.getHours();
    hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
  });
  
  const metrics = {
    totalCalls,
    successfulCalls,
    failedCalls,
    successRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
    totalDuration,
    averageDuration,
    dayDistribution,
    hourDistribution,
    lastUpdated: new Date()
  };
  
  await db.collection('metrics').doc('global').set(metrics);
  console.log('Métricas globales calculadas y guardadas');
  
  return metrics;
}

/**
 * Calcula métricas por teleoperadora
 */
async function calculateOperatorMetrics(calls) {
  const operatorStats = {};
  
  calls.forEach(call => {
    const operator = call.teleoperadora;
    if (!operator || operator === '') return;
    
    if (!operatorStats[operator]) {
      operatorStats[operator] = {
        id: operator,
        nombreOriginal: call.teleoperadoraOriginal,
        totalCalls: 0,
        successfulCalls: 0,
        totalDuration: 0,
        calls: []
      };
    }
    
    operatorStats[operator].totalCalls++;
    if (call.exitosa) operatorStats[operator].successfulCalls++;
    operatorStats[operator].totalDuration += call.duracion;
    operatorStats[operator].calls.push({
      id: call.id,
      fecha: call.fecha,
      beneficiario: call.beneficiarioOriginal,
      duracion: call.duracion,
      exitosa: call.exitosa,
      observaciones: call.observaciones
    });
  });
  
  // Guardar métricas de cada teleoperadora
  const batch = db.batch();
  
  Object.values(operatorStats).forEach(stats => {
    const metrics = {
      ...stats,
      successRate: stats.totalCalls > 0 ? (stats.successfulCalls / stats.totalCalls) * 100 : 0,
      averageDuration: stats.totalCalls > 0 ? stats.totalDuration / stats.totalCalls : 0,
      lastUpdated: new Date()
    };
    
    const docRef = db.collection('metrics').doc('teleoperadoras').collection('operators').doc(stats.id);
    batch.set(docRef, metrics);
  });
  
  await batch.commit();
  console.log(`Métricas de ${Object.keys(operatorStats).length} teleoperadoras calculadas`);
  
  return operatorStats;
}

/**
 * Calcula métricas por beneficiario
 */
async function calculateBeneficiaryMetrics(calls) {
  const beneficiaryStats = {};
  
  calls.forEach(call => {
    const beneficiary = call.beneficiario;
    if (!beneficiary || beneficiary === '') return;
    
    if (!beneficiaryStats[beneficiary]) {
      beneficiaryStats[beneficiary] = {
        id: beneficiary,
        nombreOriginal: call.beneficiarioOriginal,
        telefonos: [...call.telefonos],
        calls: []
      };
    } else {
      // Agregar teléfonos únicos
      call.telefonos.forEach(phone => {
        if (!beneficiaryStats[beneficiary].telefonos.includes(phone)) {
          beneficiaryStats[beneficiary].telefonos.push(phone);
        }
      });
    }
    
    beneficiaryStats[beneficiary].calls.push({
      id: call.id,
      fecha: call.fecha,
      teleoperadora: call.teleoperadoraOriginal,
      duracion: call.duracion,
      exitosa: call.exitosa,
      observaciones: call.observaciones
    });
  });
  
  // Calcular métricas y estado de cada beneficiario
  const batch = db.batch();
  
  Object.values(beneficiaryStats).forEach(stats => {
    const sortedCalls = stats.calls.sort((a, b) => b.fecha - a.fecha);
    const successfulCalls = stats.calls.filter(call => call.exitosa);
    const lastCall = sortedCalls[0];
    const lastSuccessfulCall = successfulCalls.sort((a, b) => b.fecha - a.fecha)[0];
    
    const metrics = {
      id: stats.id,
      nombreOriginal: stats.nombreOriginal,
      telefonos: stats.telefonos,
      totalCalls: stats.calls.length,
      successfulCalls: successfulCalls.length,
      successRate: stats.calls.length > 0 ? (successfulCalls.length / stats.calls.length) * 100 : 0,
      lastCall: lastCall ? lastCall.fecha : null,
      lastSuccessfulCall: lastSuccessfulCall ? lastSuccessfulCall.fecha : null,
      status: calculateBeneficiaryStatus(stats.calls),
      calls: sortedCalls,
      lastUpdated: new Date()
    };
    
    const docRef = db.collection('metrics').doc('beneficiarios').collection('beneficiaries').doc(stats.id);
    batch.set(docRef, metrics);
  });
  
  await batch.commit();
  console.log(`Métricas de ${Object.keys(beneficiaryStats).length} beneficiarios calculadas`);
  
  return beneficiaryStats;
}

/**
 * Identifica beneficiarios no asignados
 */
async function calculateUnassignedMetrics(calls) {
  const unassignedCalls = calls.filter(call => !call.teleoperadora || call.teleoperadora === '');
  
  const unassignedStats = {};
  unassignedCalls.forEach(call => {
    const beneficiary = call.beneficiario;
    if (!unassignedStats[beneficiary]) {
      unassignedStats[beneficiary] = {
        beneficiario: call.beneficiarioOriginal,
        telefonos: [...call.telefonos],
        calls: []
      };
    }
    unassignedStats[beneficiary].calls.push(call);
  });
  
  const metrics = {
    totalUnassigned: Object.keys(unassignedStats).length,
    totalUnassignedCalls: unassignedCalls.length,
    beneficiaries: Object.values(unassignedStats).map(stats => ({
      beneficiario: stats.beneficiario,
      telefonos: stats.telefonos,
      totalCalls: stats.calls.length,
      lastCall: stats.calls.sort((a, b) => b.fecha - a.fecha)[0]?.fecha
    })),
    lastUpdated: new Date()
  };
  
  await db.collection('metrics').doc('noAsignados').set(metrics);
  console.log(`${metrics.totalUnassigned} beneficiarios no asignados identificados`);
  
  return metrics;
}

/**
 * Cloud Function: Se ejecuta cuando se sube un archivo Excel a Storage
 */
export const processExcelFile = onObjectFinalized(async (event) => {
  try {
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    
    // Verificar que sea un archivo Excel
    if (!contentType || (!contentType.includes('spreadsheet') && !filePath.endsWith('.xlsx') && !filePath.endsWith('.xls'))) {
      console.log('Archivo ignorado: no es un Excel');
      return;
    }
    
    console.log(`Procesando archivo Excel: ${filePath}`);
    
    // Descargar archivo
    const bucket = storage.bucket();
    const file = bucket.file(filePath);
    const [buffer] = await file.download();
    
    // Procesar Excel
    const calls = processExcelFile(buffer);
    console.log(`${calls.length} llamadas extraídas del Excel`);
    
    if (calls.length === 0) {
      console.warn('No se encontraron llamadas válidas en el archivo');
      return;
    }
    
    // Guardar llamadas procesadas
    const batch = db.batch();
    calls.forEach(call => {
      const docRef = db.collection('calls').doc(call.id);
      batch.set(docRef, call);
    });
    await batch.commit();
    console.log('Llamadas guardadas en Firestore');
    
    // Calcular todas las métricas
    await Promise.all([
      calculateGlobalMetrics(calls),
      calculateOperatorMetrics(calls),
      calculateBeneficiaryMetrics(calls),
      calculateUnassignedMetrics(calls)
    ]);
    
    console.log('Todas las métricas calculadas exitosamente');
    
    // Registrar procesamiento
    await db.collection('processing_log').add({
      fileName: filePath,
      callsProcessed: calls.length,
      processedAt: new Date(),
      status: 'success'
    });
    
  } catch (error) {
    console.error('Error procesando archivo Excel:', error);
    
    // Registrar error
    await db.collection('processing_log').add({
      fileName: event.data.name,
      error: error.message,
      processedAt: new Date(),
      status: 'error'
    });
    
    throw error;
  }
});

/**
 * Cloud Function: Recalcular métricas manualmente
 */
export const recalculateMetrics = onRequest(async (request, response) => {
  try {
    console.log('Iniciando recálculo manual de métricas...');
    
    // Obtener todas las llamadas
    const callsSnapshot = await db.collection('calls').get();
    const calls = callsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (calls.length === 0) {
      response.json({ success: false, message: 'No hay llamadas para procesar' });
      return;
    }
    
    // Recalcular métricas
    await Promise.all([
      calculateGlobalMetrics(calls),
      calculateOperatorMetrics(calls),
      calculateBeneficiaryMetrics(calls),
      calculateUnassignedMetrics(calls)
    ]);
    
    console.log('Recálculo de métricas completado');
    
    response.json({
      success: true,
      message: `Métricas recalculadas para ${calls.length} llamadas`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error recalculando métricas:', error);
    response.status(500).json({
      success: false,
      error: error.message
    });
  }
});