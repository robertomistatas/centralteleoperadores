import React, { useEffect, useState } from 'react';
import { useCallStore, useAppStore } from '../../stores';
import { useUIStore } from '../../stores/useUIStore';
import useMetricsStore from '../../stores/useMetricsStore';
import { useMetricsWithFallback } from '../../utils/fallbackMetrics';
import { BarChart3, FileSpreadsheet, TrendingUp, Users, Clock, Phone, User, Download, FileText, Printer } from 'lucide-react';
import { findOperatorForBeneficiary, shouldExcludeAsOperator } from '../../utils/operatorMapping';

function AuditDemo() {
  const {
    callData,
    callMetrics,
    processedData,
    isLoading,
    lastUpdated,
    dataSource,
    clearData,
    hasData,
    getSuccessRate,
    getOperatorMetrics,
    getHourlyDistribution,
    getFollowUpData
  } = useCallStore();

  const {
    operators,
    operatorAssignments,
    getAllAssignments
  } = useAppStore();

  const { showError } = useUIStore();

  // 🔄 USAR MISMA FUENTE DE DATOS QUE EL DASHBOARD
  const {
    globalMetrics,
    getSummaryStats,
    getTopOperators,
    loading,
    errors,
    initializeListeners,
    cleanup
  } = useMetricsStore();

  const fallbackMetrics = useMetricsWithFallback();
  // 🎯 USAR EXACTAMENTE LA MISMA LÓGICA QUE EL DASHBOARD
  const shouldUseFallback = errors.global || !globalMetrics || globalMetrics.totalCalls === 0;

  // Estado para controlar la exportación de PDFs
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Inicializar listeners al montar el componente (igual que el Dashboard)
  useEffect(() => {
    initializeListeners();
    return cleanup; // Limpiar al desmontar
  }, [initializeListeners, cleanup]);

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'N/A';
    }
  };

  // 🎯 CORRECCIÓN CRÍTICA: Procesar datos correctamente para obtener operadores reales
  const getOperatorCallMetrics = () => {
    console.log('🔍 [AUDIT FIXED] === PROCESANDO DATOS DE OPERADORES ===');
    
    // Si no hay datos reales, usar fallback
    if ((!processedData || processedData.length === 0) && (!callData || callData.length === 0)) {
      console.log('⚠️ [AUDIT] No hay datos disponibles, usando fallback');
      
      if (shouldUseFallback) {
        const topOperators = fallbackMetrics.getTopOperators(10);
        return topOperators.map((operator, index) => ({
          operatorName: operator.operatorName,
          operatorInfo: {
            id: `op-${index}`,
            name: operator.operatorName,
            email: `${operator.operatorName.toLowerCase().replace(/\s+/g, '.')}@mistatas.com`
          },
          totalCalls: operator.totalCalls,
          assignedBeneficiaries: operator.uniqueBeneficiaries,
          contactedBeneficiaries: operator.uniqueBeneficiaries,
          uncontactedBeneficiaries: 0,
          successfulCalls: operator.successfulCalls,
          failedCalls: operator.failedCalls || (operator.totalCalls - operator.successfulCalls),
          successRate: operator.successRate,
          totalEffectiveMinutes: Math.round((operator.successfulCalls * (operator.averageDuration / 60)) * 10) / 10,
          averageMinutesPerCall: Math.round((operator.averageDuration / 60) * 10) / 10,
          averageCallsPerBeneficiary: Math.round((operator.totalCalls / operator.uniqueBeneficiaries) * 10) / 10,
          beneficiariesWithCalls: operator.uniqueBeneficiaries,
          allCallsData: []
        }));
      }
      return [];
    }

    // Usar processedData si está disponible, sino callData
    const dataToProcess = processedData && processedData.length > 0 ? processedData : callData;
    console.log('✅ [AUDIT] Procesando', dataToProcess.length, 'llamadas desde', processedData && processedData.length > 0 ? 'processedData' : 'callData');
    
    const operatorStats = {};
    
    dataToProcess.forEach((call, index) => {
      // 🔧 DIAGNÓSTICO: Mostrar estructura de las primeras llamadas
      if (index < 3) {
        console.log(`🔍 [DEBUG] Llamada ${index + 1}:`, {
          operador: call.operador,
          operator: call.operator,
          teleoperadora: call.teleoperadora,
          resultado: call.resultado,
          result: call.result,
          beneficiario: call.beneficiario,
          beneficiary: call.beneficiary
        });
      }
      
      // 🎯 OBTENER NOMBRE DE OPERADOR CORRECTAMENTE
      let operatorName = null;
      
      // Buscar en diferentes campos posibles para el operador
      const operatorFields = [
        call.operador,
        call.operator, 
        call.teleoperadora,
        call.operatorName,
        call.operator_name
      ];
      
      // Lista de valores que NO son nombres de operadores válidos
      const invalidValues = [
        'Llamado exitoso', 'exitoso', 'Exitoso', 'EXITOSO',
        'Sin respuesta', 'sin respuesta', 'SIN RESPUESTA',
        'No contesta', 'no contesta', 'NO CONTESTA',
        'Ocupado', 'ocupado', 'OCUPADO',
        'Fallida', 'fallida', 'FALLIDA',
        'Error', 'error', 'ERROR',
        'HANGUP', 'hangup', 'Hangup',
        'No identificado', 'NO IDENTIFICADO',
        '', null, undefined
      ];
      
      // Buscar el primer campo que tenga un valor válido
      for (const field of operatorFields) {
        if (field && typeof field === 'string' && !invalidValues.includes(field)) {
          operatorName = field.trim();
          break;
        }
      }
      
      // Si no encontramos operador válido
      if (!operatorName) {
        operatorName = 'Sin asignar';
      }
      
      if (index < 3) {
        console.log(`🎯 [DEBUG] Operador asignado: "${operatorName}"`);
      }
      
      // Inicializar estadísticas del operador si no existe
      if (!operatorStats[operatorName]) {
        operatorStats[operatorName] = {
          operatorName: operatorName,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalDuration: 0,
          beneficiariesSet: new Set(),
          calls: []
        };
      }
      
      // Incrementar contadores
      operatorStats[operatorName].totalCalls++;
      operatorStats[operatorName].calls.push(call);
      
      // Determinar si la llamada fue exitosa
      const isSuccessful = call.isSuccessful || 
        call.resultado === 'Llamado exitoso' || 
        call.result === 'Llamado exitoso' ||
        call.estado === 'exitoso';
      
      if (isSuccessful) {
        operatorStats[operatorName].successfulCalls++;
        const duration = call.duration || call.duracion || 0;
        operatorStats[operatorName].totalDuration += duration;
      } else {
        operatorStats[operatorName].failedCalls++;
      }
      
      // Agregar beneficiario único
      const beneficiary = call.beneficiary || call.beneficiario;
      if (beneficiary) {
        operatorStats[operatorName].beneficiariesSet.add(beneficiary);
      }
    });

    // Convertir estadísticas a formato final
    const result = Object.values(operatorStats)
      .filter(stats => stats.totalCalls > 0)
      .map((stats, index) => {
        const uniqueBeneficiaries = stats.beneficiariesSet.size;
        const averageDuration = stats.successfulCalls > 0 ? 
          Math.round(stats.totalDuration / stats.successfulCalls) : 0;
        const successRate = stats.totalCalls > 0 ? 
          Math.round((stats.successfulCalls / stats.totalCalls) * 100) : 0;
        
        // Información del operador
        const operatorInfo = operators?.find(op => 
          op.name === stats.operatorName || 
          op.name?.toLowerCase().includes(stats.operatorName.toLowerCase())
        ) || {
          id: `op-${index}`,
          name: stats.operatorName,
          email: `${stats.operatorName.toLowerCase().replace(/\s+/g, '.')}@mistatas.com`
        };
        
        // Calcular métricas
        const assignedBeneficiariesArray = operatorAssignments?.[operatorInfo.id] || [];
        const assignedBeneficiaries = assignedBeneficiariesArray.length || uniqueBeneficiaries;
        const contactedBeneficiaries = uniqueBeneficiaries;
        const uncontactedBeneficiaries = Math.max(0, assignedBeneficiaries - contactedBeneficiaries);
        
        const totalEffectiveMinutes = Math.round((averageDuration * stats.successfulCalls / 60) * 10) / 10;
        const averageMinutesPerCall = Math.round((averageDuration / 60) * 10) / 10;
        const averageCallsPerBeneficiary = uniqueBeneficiaries > 0 ? 
          Math.round((stats.totalCalls / uniqueBeneficiaries) * 10) / 10 : 0;

        return {
          operatorName: stats.operatorName,
          operatorInfo: operatorInfo,
          totalCalls: stats.totalCalls,
          assignedBeneficiaries: assignedBeneficiaries,
          contactedBeneficiaries: contactedBeneficiaries,
          uncontactedBeneficiaries: uncontactedBeneficiaries,
          successfulCalls: stats.successfulCalls,
          failedCalls: stats.failedCalls,
          successRate: successRate,
          totalEffectiveMinutes: totalEffectiveMinutes,
          averageMinutesPerCall: averageMinutesPerCall,
          averageCallsPerBeneficiary: averageCallsPerBeneficiary,
          beneficiariesWithCalls: contactedBeneficiaries,
          allCallsData: stats.calls
        };
      })
      .sort((a, b) => b.totalCalls - a.totalCalls);

    console.log('✅ [AUDIT] Operadores procesados:', result.length);
    result.forEach((r, index) => {
      console.log(`  ${index + 1}. "${r.operatorName}": ${r.totalCalls} llamadas (${r.successfulCalls} exitosas)`);
    });

    return result;
  };

  const operatorCallMetrics = getOperatorCallMetrics();

  // 📄 FUNCIÓN PARA PDF SIMPLIFICADA
  const generatePDFReport = async (operatorData = null, isGeneral = false) => {
    setIsGeneratingPDF(true);
    
    try {
      const jsPDF = (await import('jspdf')).default;
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      
      // Encabezado
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('INFORME DE AUDITORÍA', pageWidth / 2, 20, { align: 'center' });
      
      // Contenido del PDF (simplificado)
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      let yPos = 50;
      
      if (isGeneral) {
        doc.text('RESUMEN GENERAL', 20, yPos);
        yPos += 10;
        
        const totalCalls = operatorCallMetrics.reduce((sum, op) => sum + op.totalCalls, 0);
        const totalOperators = operatorCallMetrics.length;
        
        doc.setFontSize(10);
        doc.text(`Total de llamadas: ${totalCalls}`, 20, yPos);
        yPos += 5;
        doc.text(`Operadores activos: ${totalOperators}`, 20, yPos);
        yPos += 10;
        
        // Tabla de operadores
        autoTable(doc, {
          startY: yPos,
          head: [['Operador', 'Llamadas', 'Exitosas', 'Tasa Éxito']],
          body: operatorCallMetrics.map(op => [
            op.operatorName,
            op.totalCalls.toString(),
            op.successfulCalls.toString(),
            `${op.successRate}%`
          ])
        });
      }
      
      const fileName = isGeneral ? 
        `Auditoria_General_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf` :
        `Auditoria_${operatorData.operatorName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf`;
      
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      showError('Error al generar el PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* ENCABEZADO */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Auditoría Avanzada de Llamadas
            </h1>
            <p className="text-gray-600 mt-2">
              Análisis detallado y métricas en tiempo real de todas las llamadas registradas en el sistema.
              Estado de datos: <span className="font-semibold">{shouldUseFallback ? 'Datos simulados' : 'Datos reales'}</span> | 
              Última actualización: {formatDate(lastUpdated)}
            </p>
          </div>
          
          <button
            onClick={() => generatePDFReport(null, true)}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {isGeneratingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Informe General
              </>
            )}
          </button>
        </div>

        {/* INDICADOR DE SINCRONIZACIÓN */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-semibold">✅ Datos sincronizados:</span>
            Las métricas mostradas son consistentes con el Dashboard principal.
          </p>
        </div>
      </div>

      {/* MÉTRICAS GENERALES */}
      {operatorCallMetrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Llamadas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {operatorCallMetrics.reduce((sum, m) => sum + m.totalCalls, 0)}
                </p>
                <p className="text-xs text-blue-600 mt-1">Registros sincronizados</p>
              </div>
              <Phone className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasa de Éxito</p>
                <p className="text-2xl font-bold text-green-600">
                  {operatorCallMetrics.length > 0 ? 
                    Math.round(operatorCallMetrics.reduce((sum, m) => sum + m.successRate, 0) / operatorCallMetrics.length) : 0}%
                </p>
                <p className="text-xs text-green-600 mt-1">Promedio general</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Operadores Activos</p>
                <p className="text-2xl font-bold text-purple-600">{operatorCallMetrics.length}</p>
                <p className="text-xs text-purple-600 mt-1">Con actividad registrada</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Duración Promedio</p>
                <p className="text-2xl font-bold text-orange-600">
                  {operatorCallMetrics.length > 0 ? 
                    Math.round(operatorCallMetrics.reduce((sum, m) => sum + m.averageMinutesPerCall, 0) / operatorCallMetrics.length) : 0} min
                </p>
                <p className="text-xs text-orange-600 mt-2">Tiempo por llamada exitosa</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* TARJETAS DE TELEOPERADORAS */}
      {operatorCallMetrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Métricas por Teleoperadora
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {operatorCallMetrics.map((metrics, index) => {
              // Determinar color del indicador de rendimiento
              let indicatorColor = 'bg-red-500';
              let performanceLevel = 'Bajo';
              
              if (metrics.totalCalls >= 30 && metrics.successRate >= 80) {
                indicatorColor = 'bg-green-500';
                performanceLevel = 'Alto';
              } else if (metrics.totalCalls >= 15 && metrics.successRate >= 60) {
                indicatorColor = 'bg-yellow-500';
                performanceLevel = 'Medio';
              }

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                  {/* ENCABEZADO DEL OPERADOR */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{metrics.operatorName}</h4>
                      <p className="text-xs text-gray-600">{metrics.operatorInfo.email}</p>
                    </div>
                    <button
                      onClick={() => generatePDFReport(metrics, false)}
                      disabled={isGeneratingPDF}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Generar informe individual"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  {/* MÉTRICAS */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total llamadas:</span>
                      <span className="font-semibold text-blue-600">{metrics.totalCalls}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Beneficiarios asignados:</span>
                      <span className="font-semibold">{metrics.assignedBeneficiaries}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Beneficiarios contactados:</span>
                      <span className="font-semibold text-green-600">{metrics.contactedBeneficiaries}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Beneficiarios sin contactar:</span>
                      <span className="font-semibold text-red-600">{metrics.uncontactedBeneficiaries}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Llamadas exitosas:</span>
                      <span className="font-semibold text-green-600">{metrics.successfulCalls}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Llamadas fallidas:</span>
                      <span className="font-semibold text-red-600">{metrics.failedCalls}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tasa de Éxito en llamadas:</span>
                      <span className="font-semibold text-blue-600">{metrics.successRate}%</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Minutos totales efectivos:</span>
                      <span className="font-semibold">{metrics.totalEffectiveMinutes} min</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Promedio min/llamada:</span>
                      <span className="font-semibold">{metrics.averageMinutesPerCall} min</span>
                    </div>

                    {/* INDICADOR DE RENDIMIENTO */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Rendimiento:</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${indicatorColor}`}></div>
                          <span className="text-xs font-semibold">{performanceLevel}</span>
                        </div>
                      </div>
                      
                      {/* Barra de progreso */}
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            indicatorColor.replace('bg-', 'bg-').replace('-500', '-400')
                          }`}
                          style={{ width: `${Math.min(metrics.totalCalls * 2, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MENSAJE SIN DATOS */}
      {operatorCallMetrics.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay datos disponibles</h3>
          <p className="text-gray-600 mb-4">
            Para realizar la auditoría, primero necesitas cargar los datos de llamadas desde el módulo principal.
          </p>
        </div>
      )}
    </div>
  );
}

export default AuditDemo;