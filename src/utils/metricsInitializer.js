/**
 * Inicializador de métricas desde la aplicación web
 * Funciona con la autenticación existente de Firebase
 */

import { db } from '../firebase';
import { 
  doc, 
  collection, 
  setDoc, 
  writeBatch, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';

/**
 * Inicializa la estructura de métricas en Firestore
 * Debe ejecutarse desde la aplicación con usuario autenticado
 */
export const initializeMetricsStructure = async () => {
  console.log('🏗️ Inicializando estructura de métricas en Firestore...');
  
  try {
    const batch = writeBatch(db);
    
    // 1. Métricas globales
    const globalMetricsRef = doc(db, 'metrics', 'global');
    batch.set(globalMetricsRef, {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      uniqueBeneficiaries: 0,
      averageDuration: 0,
      protocolCompliance: 0,
      lastUpdated: serverTimestamp(),
      created: serverTimestamp()
    });
    
    // 2. Configuración del sistema
    const systemConfigRef = doc(db, 'systemConfig', 'metricsConfig');
    batch.set(systemConfigRef, {
      alDiaThreshold: 15, // días
      pendienteThreshold: 30, // días
      urgenteThreshold: 30, // más de X días es urgente
      autoProcessing: true,
      notificationsEnabled: true,
      lastUpdated: serverTimestamp(),
      created: serverTimestamp()
    });
    
    // 3. Log de procesamiento inicial
    const processLogRef = doc(collection(db, 'processLogs'));
    batch.set(processLogRef, {
      type: 'INITIALIZATION',
      status: 'SUCCESS',
      message: 'Estructura de métricas inicializada desde aplicación web',
      timestamp: serverTimestamp(),
      details: {
        collections: ['metrics', 'systemConfig', 'processLogs'],
        method: 'web_initialization'
      }
    });
    
    // Ejecutar batch
    await batch.commit();
    
    console.log('✅ Estructura de métricas inicializada correctamente');
    return { success: true, message: 'Estructura inicializada correctamente' };
    
  } catch (error) {
    console.error('❌ Error inicializando estructura:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Función para verificar si la estructura ya está inicializada
 */
export const checkMetricsStructure = async () => {
  try {
    const globalMetricsRef = doc(db, 'metrics', 'global');
    const docSnap = await getDoc(globalMetricsRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error verificando estructura:', error);
    return false;
  }
};

/**
 * Función para procesar datos de Excel manualmente (simulando Cloud Functions)
 */
export const processExcelDataManually = async (excelData) => {
  console.log('🔄 Procesando datos de Excel manualmente...');
  
  try {
    const batch = writeBatch(db);
    let processedCount = 0;
    
    // Agrupar datos por operadora
    const operatorData = {};
    const beneficiaryData = {};
    
    excelData.forEach(call => {
      const operatorName = call.operador || 'Sin asignar';
      const beneficiaryName = call.beneficiario || 'Sin nombre';
      
      // Datos por operadora
      if (!operatorData[operatorName]) {
        operatorData[operatorName] = {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalDuration: 0,
          beneficiaries: new Set()
        };
      }
      
      operatorData[operatorName].totalCalls++;
      operatorData[operatorName].totalDuration += (call.duracion || 0);
      operatorData[operatorName].beneficiaries.add(beneficiaryName);
      
      if (call.categoria === 'exitosa' || call.resultado === 'Llamado exitoso') {
        operatorData[operatorName].successfulCalls++;
      } else {
        operatorData[operatorName].failedCalls++;
      }
      
      // Datos por beneficiario
      if (!beneficiaryData[beneficiaryName]) {
        beneficiaryData[beneficiaryName] = {
          totalCalls: 0,
          lastSuccessfulCall: null,
          operator: operatorName,
          commune: call.comuna || call.commune || 'N/A',
          phone: call.numero_cliente || call.phone || 'N/A'
        };
      }
      
      beneficiaryData[beneficiaryName].totalCalls++;
      
      // Actualizar última llamada exitosa
      if (call.categoria === 'exitosa' || call.resultado === 'Llamado exitoso') {
        const callDate = new Date(call.fecha);
        if (!beneficiaryData[beneficiaryName].lastSuccessfulCall || 
            callDate > new Date(beneficiaryData[beneficiaryName].lastSuccessfulCall)) {
          beneficiaryData[beneficiaryName].lastSuccessfulCall = call.fecha;
        }
      }
    });
    
    // Guardar métricas por operadora
    for (const [operatorName, data] of Object.entries(operatorData)) {
      const operatorRef = doc(db, 'operatorMetrics', operatorName);
      batch.set(operatorRef, {
        operatorName,
        totalCalls: data.totalCalls,
        successfulCalls: data.successfulCalls,
        failedCalls: data.failedCalls,
        successRate: data.totalCalls > 0 ? (data.successfulCalls / data.totalCalls * 100) : 0,
        averageDuration: data.totalCalls > 0 ? Math.round(data.totalDuration / data.totalCalls) : 0,
        uniqueBeneficiaries: data.beneficiaries.size,
        lastUpdated: serverTimestamp()
      });
      processedCount++;
    }
    
    // Guardar datos de beneficiarios con clasificación
    for (const [beneficiaryName, data] of Object.entries(beneficiaryData)) {
      let status = 'urgente'; // Por defecto urgente
      
      if (data.lastSuccessfulCall) {
        const daysSinceLastSuccess = Math.floor(
          (new Date() - new Date(data.lastSuccessfulCall)) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastSuccess <= 15) {
          status = 'al-dia';
        } else if (daysSinceLastSuccess <= 30) {
          status = 'pendiente';
        }
      }
      
      const beneficiaryRef = doc(db, 'beneficiaryMetrics', beneficiaryName);
      batch.set(beneficiaryRef, {
        beneficiaryName,
        operator: data.operator,
        commune: data.commune,
        phone: data.phone,
        totalCalls: data.totalCalls,
        lastSuccessfulCall: data.lastSuccessfulCall,
        status,
        daysSinceLastSuccess: data.lastSuccessfulCall ? 
          Math.floor((new Date() - new Date(data.lastSuccessfulCall)) / (1000 * 60 * 60 * 24)) : 
          null,
        lastUpdated: serverTimestamp()
      });
      processedCount++;
    }
    
    // Actualizar métricas globales
    const totalCalls = excelData.length;
    const successfulCalls = excelData.filter(call => 
      call.categoria === 'exitosa' || call.resultado === 'Llamado exitoso'
    ).length;
    
    const globalMetricsRef = doc(db, 'metrics', 'global');
    batch.set(globalMetricsRef, {
      totalCalls,
      successfulCalls,
      failedCalls: totalCalls - successfulCalls,
      uniqueBeneficiaries: Object.keys(beneficiaryData).length,
      uniqueOperators: Object.keys(operatorData).length,
      averageDuration: totalCalls > 0 ? Math.round(
        excelData.reduce((acc, call) => acc + (call.duracion || 0), 0) / totalCalls
      ) : 0,
      successRate: totalCalls > 0 ? (successfulCalls / totalCalls * 100) : 0,
      lastUpdated: serverTimestamp(),
      lastProcessed: serverTimestamp()
    });
    
    // Log del procesamiento
    const logRef = doc(collection(db, 'processLogs'));
    batch.set(logRef, {
      type: 'MANUAL_PROCESSING',
      status: 'SUCCESS',
      message: `Procesados ${processedCount} registros manualmente`,
      timestamp: serverTimestamp(),
      details: {
        totalRecords: excelData.length,
        processedRecords: processedCount,
        operators: Object.keys(operatorData).length,
        beneficiaries: Object.keys(beneficiaryData).length
      }
    });
    
    await batch.commit();
    
    console.log(`✅ Procesados ${processedCount} registros correctamente`);
    return { 
      success: true, 
      message: `Procesados ${processedCount} registros correctamente`,
      stats: {
        totalCalls,
        successfulCalls,
        operators: Object.keys(operatorData).length,
        beneficiaries: Object.keys(beneficiaryData).length
      }
    };
    
  } catch (error) {
    console.error('❌ Error procesando datos:', error);
    return { success: false, error: error.message };
  }
};