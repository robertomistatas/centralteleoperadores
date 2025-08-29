import React, { useEffect } from 'react';
import { useCallStore, useAppStore } from '../../stores';
import { BarChart3, FileSpreadsheet, TrendingUp, Users, Clock, Phone, User } from 'lucide-react';
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

  // 🔧 Cargar scripts de diagnóstico automáticamente
  useEffect(() => {
    if (import.meta.env.DEV) {
      // Cargar script de diagnóstico de estructura de datos
      import('../../debug/data_structure_diagnostic.js')
        .then((module) => {
          console.log('✅ Script de diagnóstico cargado exitosamente');
          window.diagnosticDataStructure = module.diagnosticDataStructure || module.default;
        })
        .catch((error) => {
          console.log('💡 Script de diagnóstico no encontrado, creando función local...', error.message);
          window.diagnosticDataStructure = () => {
            console.log('🔍 === DIAGNÓSTICO LOCAL DE ESTRUCTURA ===');
            console.log('📞 Datos procesados:', processedData?.length || 0);
            console.log('👥 Operadores:', operators?.length || 0);
            console.log('📋 Asignaciones:', operatorAssignments ? Object.keys(operatorAssignments).length : 0);
            if (processedData && processedData.length > 0) {
              console.log('Muestra de datos:', processedData[0]);
            }
          };
        });
    }
  }, [processedData, operators, operatorAssignments]);

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

  // Obtener métricas con validación
  const operatorMetrics = getOperatorMetrics ? getOperatorMetrics() : [];
  const hourlyDistribution = getHourlyDistribution ? getHourlyDistribution() : [];

  // 🎯 ESTRATEGIA CRÍTICA: Mapeo Inteligente Beneficiario → Teleoperadora
  const getOperatorCallMetrics = () => {
    console.log('🔍 [AUDIT CRITICAL] === MAPEO INTELIGENTE CON UTILIDADES ===');
    console.log('📞 [AUDIT] Datos disponibles:', processedData?.length || 0);
    console.log('👥 [AUDIT] Operadores disponibles:', operators?.length || 0);
    console.log('📋 [AUDIT] Asignaciones disponibles:', operatorAssignments ? Object.keys(operatorAssignments).length : 0);
    
    if (!processedData || processedData.length === 0 || !operators || operators.length === 0) {
      console.log('⚠️ [AUDIT] Sin datos suficientes para análisis');
      return [];
    }

    // � PASO 1: Analizar las llamadas y mapearlas a operadores usando las utilidades
    const operatorMetrics = {};
    let mappedCalls = 0;
    let unmappedCalls = 0;
    let excludedCalls = 0;

    processedData.forEach((call, index) => {
      const beneficiaryName = call.beneficiario || call.beneficiary || '';
      
      // Debug de las primeras 5 llamadas
      if (index < 5) {
        console.log(`� [AUDIT] Llamada ${index}: beneficiario="${beneficiaryName}"`);
      }

      // Verificar si el "operador" en los datos es realmente un estado
      const operatorFromCall = call.operador || call.operator || call.teleoperadora;
      if (operatorFromCall && shouldExcludeAsOperator(operatorFromCall)) {
        excludedCalls++;
        if (index < 10) {
          console.log(`� [AUDIT] Excluido estado como operador: "${operatorFromCall}"`);
        }
      }

      // Buscar operador asignado para este beneficiario usando las utilidades
      const operatorMapping = findOperatorForBeneficiary(beneficiaryName, operatorAssignments, operators);
      
      if (operatorMapping) {
        mappedCalls++;
        const operatorName = operatorMapping.operatorName;
        
        if (!operatorMetrics[operatorName]) {
          operatorMetrics[operatorName] = {
            operatorInfo: operatorMapping.operatorInfo,
            totalCalls: 0,
            successfulCalls: 0,
            totalDuration: 0,
            beneficiaries: new Set(),
            assignedBeneficiaries: 0 // Se calculará después
          };
        }
        
        operatorMetrics[operatorName].totalCalls++;
        operatorMetrics[operatorName].beneficiaries.add(beneficiaryName);
        
        if (call.isSuccessful || call.categoria === 'exitosa' || call.resultado === 'Llamado exitoso') {
          operatorMetrics[operatorName].successfulCalls++;
        }
        
        operatorMetrics[operatorName].totalDuration += (call.duracion || 0);
      } else {
        unmappedCalls++;
        if (index < 10) { // Log solo las primeras 10 para no saturar
          console.log(`⚠️ [AUDIT] Llamada sin mapeo: beneficiario="${beneficiaryName}"`);
        }
      }
    });

    console.log(`📊 [AUDIT] Resultado del mapeo: ${mappedCalls} mapeadas, ${unmappedCalls} sin mapeo, ${excludedCalls} excluidas`);
    console.log(`📊 [AUDIT] Operadores con actividad:`, Object.keys(operatorMetrics));

    // 🔢 PASO 2: Completar métricas y calcular beneficiarios asignados
    const result = Object.entries(operatorMetrics).map(([operatorName, metrics]) => {
      // Contar beneficiarios asignados reales desde operatorAssignments
      const operatorId = metrics.operatorInfo.id;
      const assignedBeneficiaries = operatorAssignments?.[operatorId]?.length || 0;
      
      const averageCallsPerBeneficiary = assignedBeneficiaries > 0 
        ? Math.round((metrics.totalCalls / assignedBeneficiaries) * 10) / 10
        : 0;

      return {
        operatorName: operatorName,
        operatorInfo: metrics.operatorInfo,
        totalCalls: metrics.totalCalls,
        assignedBeneficiaries: assignedBeneficiaries,
        averageCallsPerBeneficiary: averageCallsPerBeneficiary,
        beneficiariesWithCalls: metrics.beneficiaries.size,
        successfulCalls: metrics.successfulCalls,
        successRate: metrics.totalCalls > 0 ? Math.round((metrics.successfulCalls / metrics.totalCalls) * 100) : 0
      };
    });

    // 🔄 PASO 3: Incluir operadores sin actividad
    if (operators) {
      operators.forEach(operator => {
        if (!operatorMetrics[operator.name]) {
          const assignedBeneficiaries = operatorAssignments?.[operator.id]?.length || 0;
          result.push({
            operatorName: operator.name,
            operatorInfo: operator,
            totalCalls: 0,
            assignedBeneficiaries: assignedBeneficiaries,
            averageCallsPerBeneficiary: 0,
            beneficiariesWithCalls: 0,
            successfulCalls: 0,
            successRate: 0
          });
        }
      });
    }

    console.log('✅ [AUDIT] Métricas finales calculadas:', result.length, 'operadores');
    result.forEach((r, index) => {
      console.log(`  ${index + 1}. "${r.operatorName}": ${r.totalCalls} llamadas, ${r.assignedBeneficiaries} asignados, ${r.beneficiariesWithCalls} activos`);
    });

    return result.sort((a, b) => b.totalCalls - a.totalCalls); // Ordenar por total de llamadas
  };

  const operatorCallMetrics = getOperatorCallMetrics();

  return (
    <div className="space-y-6">
      {/* Header - Auditoría Avanzada */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Auditoría Avanzada de Llamadas
        </h2>
        <p className="text-gray-600">
          Análisis detallado y métricas en tiempo real de todas las llamadas registradas en el sistema.
          Estado de datos: <span className="font-semibold">{hasData && hasData() ? 'Datos cargados' : 'Sin datos'}</span>
          {lastUpdated && ` | Última actualización: ${formatDate(lastUpdated)}`}
        </p>
      </div>

      {/* Métricas Principales */}
      {hasData && hasData() && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">Total Llamadas</h4>
                <p className="text-2xl font-bold text-blue-600">{callMetrics?.totalCalls || 0}</p>
              </div>
              <Phone className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-blue-600 mt-2">Registros procesados</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-green-800 mb-1">Tasa de Éxito</h4>
                <p className="text-2xl font-bold text-green-600">{getSuccessRate ? getSuccessRate() : 0}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-green-600 mt-2">Llamadas exitosas</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-purple-800 mb-1">Operadores Activos</h4>
                <p className="text-2xl font-bold text-purple-600">{operatorCallMetrics?.length || 0}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-xs text-purple-600 mt-2">Con actividad registrada</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-orange-800 mb-1">Duración Promedio</h4>
                <p className="text-2xl font-bold text-orange-600">
                  {formatDuration(callMetrics?.averageDuration || 0)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-xs text-orange-600 mt-2">Tiempo por llamada</p>
          </div>
        </div>
      )}

      {/* 🆕 NUEVA SECCIÓN: Tarjetas de Teleoperadoras con Métricas de Llamadas */}
      {operatorCallMetrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Métricas por Teleoperadora
          </h3>
          
          {/* Mostrar estado de datos */}
          <div className="mb-4">
            {!hasData || !hasData() ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <p className="text-blue-700 text-sm">
                    <span className="font-medium">Modo Asignaciones:</span> Mostrando teleoperadoras con sus asignaciones actuales. 
                    <span className="font-medium">Carga datos de llamadas</span> para ver métricas completas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-green-700 text-sm">
                      <span className="font-medium">Datos Completos:</span> Mostrando métricas extraídas directamente de llamadas.
                    </p>
                  </div>
                  {/* 🧪 BOTÓN DE TESTING MEJORADO PARA AUDITORÍA */}
                  {import.meta.env.DEV && (
                    <button
                      onClick={() => {
                        console.log('🧪 [AUDIT TEST] === DIAGNÓSTICO MAPEO INTELIGENTE ===');
                        console.log('📊 Operadores disponibles:', operators);
                        console.log('📋 Asignaciones disponibles:', operatorAssignments);
                        console.log('📞 Datos procesados:', processedData?.length || 0);
                        
                        // 🔍 DIAGNÓSTICO ESPECÍFICO DE MAPEO
                        console.log('\n🔍 === DIAGNÓSTICO DETALLADO DE MAPEO ===');
                        
                        // Analizar operadores
                        if (operators && operators.length > 0) {
                          console.log('👥 Operadores registrados:');
                          operators.forEach((op, i) => {
                            console.log(`  ${i + 1}. ID: "${op.id}" | Nombre: "${op.name}" | Email: "${op.email}"`);
                          });
                        }
                        
                        // Analizar asignaciones
                        if (operatorAssignments) {
                          console.log('\n📋 Asignaciones por operador:');
                          Object.entries(operatorAssignments).forEach(([opId, beneficiaries]) => {
                            const operator = operators?.find(op => op.id === opId);
                            console.log(`  Operator ID: "${opId}" (${operator?.name || 'NO ENCONTRADO'})`);
                            console.log(`    Beneficiarios asignados: ${beneficiaries.length}`);
                            if (beneficiaries.length > 0) {
                              console.log('    Primeros 3 beneficiarios:', beneficiaries.slice(0, 3));
                            }
                          });
                        }
                        
                        // Analizar datos de llamadas
                        if (processedData && processedData.length > 0) {
                          console.log('\n📞 Análisis de datos de llamadas:');
                          const uniqueBeneficiaries = [...new Set(processedData.map(call => call.beneficiario || call.beneficiary))];
                          console.log(`  Total beneficiarios únicos en llamadas: ${uniqueBeneficiaries.length}`);
                          console.log('  Primeros 5 beneficiarios en llamadas:', uniqueBeneficiaries.slice(0, 5));
                          
                          // Verificar coincidencias
                          if (operatorAssignments) {
                            const allAssignedBeneficiaries = Object.values(operatorAssignments).flat();
                            const matches = uniqueBeneficiaries.filter(beneficiary => 
                              allAssignedBeneficiaries.some(assigned => assigned === beneficiary)
                            );
                            console.log(`  Coincidencias exactas: ${matches.length}`);
                            if (matches.length > 0) {
                              console.log('  Beneficiarios que sí coinciden:', matches.slice(0, 3));
                            }
                          }
                        }
                        
                        // Ejecutar función de mapeo inteligente
                        const auditTest = getOperatorCallMetrics();
                        console.log('📈 Test Mapeo Inteligente:', auditTest);
                        
                        // Ejecutar diagnóstico de estructura de datos
                        window.diagnosticDataStructure?.();
                        
                        // Ejecutar otros diagnósticos
                        window.runDataSyncDiagnostic?.();
                        window.diagnoseAuditProblem?.();
                      }}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                    >
                      🔍 Test Mapeo
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {operatorCallMetrics.map((metrics, index) => (
              <div 
                key={metrics.operatorName} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50"
              >
                {/* Header de la tarjeta */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {metrics.operatorName}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {metrics.operatorInfo?.email || `${metrics.operatorName.toLowerCase().replace(/\s+/g, '.')}@mistatas.com`}
                    </p>
                  </div>
                </div>

                {/* Métricas principales */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Llamadas:</span>
                    <span className="font-bold text-lg text-blue-600">
                      {metrics.totalCalls}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Beneficiarios Asignados:</span>
                    <span className="font-medium text-gray-700">
                      {metrics.assignedBeneficiaries}
                    </span>
                  </div>
                  
                  {metrics.assignedBeneficiaries > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Promedio por Beneficiario:</span>
                      <span className="font-medium text-gray-700">
                        {metrics.averageCallsPerBeneficiary}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Con Actividad:</span>
                    <span className="font-medium text-gray-700">
                      {metrics.beneficiariesWithCalls} / {metrics.assignedBeneficiaries}
                    </span>
                  </div>

                  {/* Mostrar tasa de éxito si hay datos */}
                  {metrics.successfulCalls !== undefined && metrics.totalCalls > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Llamadas Exitosas:</span>
                      <span className="font-medium text-green-600">
                        {metrics.successfulCalls} ({metrics.successRate}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* Indicador de rendimiento */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  {hasData && hasData() ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Rendimiento:</span>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          metrics.totalCalls >= 20 
                            ? 'bg-green-100 text-green-800' 
                            : metrics.totalCalls >= 10 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {metrics.totalCalls >= 20 ? 'Alto' : 
                           metrics.totalCalls >= 10 ? 'Medio' : 'Bajo'}
                        </div>
                      </div>
                      
                      {/* Barra de progreso visual */}
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            metrics.totalCalls >= 20 ? 'bg-green-500' : 
                            metrics.totalCalls >= 10 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ 
                            width: `${Math.min((metrics.totalCalls / 30) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <span className="text-xs text-gray-400">
                        {metrics.assignedBeneficiaries > 0 
                          ? `✅ ${metrics.assignedBeneficiaries} beneficiarios asignados`
                          : '⚠️ Sin asignaciones'
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Resumen estadístico */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Resumen Estadístico</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Teleoperadoras:</span>
                <span className="font-bold text-blue-600 ml-2">
                  {operatorCallMetrics.length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Llamadas Totales:</span>
                <span className="font-bold text-blue-600 ml-2">
                  {operatorCallMetrics.reduce((sum, m) => sum + m.totalCalls, 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Beneficiarios Totales:</span>
                <span className="font-bold text-blue-600 ml-2">
                  {operatorCallMetrics.reduce((sum, m) => sum + m.assignedBeneficiaries, 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Promedio General:</span>
                <span className="font-bold text-blue-600 ml-2">
                  {operatorCallMetrics.length > 0 
                    ? Math.round(operatorCallMetrics.reduce((sum, m) => sum + m.totalCalls, 0) / operatorCallMetrics.length * 10) / 10
                    : 0
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay teleoperadoras creadas */}
      {operatorCallMetrics.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Métricas por Teleoperadora
          </h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-yellow-500" />
              <div>
                <h4 className="text-yellow-800 font-medium">No hay teleoperadoras disponibles</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  Para ver las métricas por teleoperadora, necesitas:
                </p>
                <ul className="text-yellow-700 text-sm mt-2 list-disc list-inside">
                  <li>Crear teleoperadoras en el módulo "Asignaciones"</li>
                  <li>Asignar beneficiarios a las teleoperadoras</li>
                  <li>Opcionalmente, cargar datos de llamadas para métricas completas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estado Sin Datos */}
      {(!hasData || !hasData()) && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay datos de auditoría disponibles
          </h3>
          <p className="text-gray-500 mb-4">
            Sube un archivo Excel en la sección "Registro de Llamadas" para comenzar
            el análisis de auditoría avanzada.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800 text-sm">
              💡 <strong>Tip:</strong> Una vez que subas datos, verás métricas detalladas,
              análisis por operador y distribución temporal de llamadas.
            </p>
          </div>
        </div>
      )}

      {/* Controles de Datos */}
      {hasData && hasData() && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p><strong>Fuente de datos:</strong> {dataSource || 'Desconocida'}</p>
              <p><strong>Última actualización:</strong> {formatDate(lastUpdated)}</p>
            </div>
            {clearData && (
              <button
                onClick={clearData}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                🗑️ Limpiar Datos
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditDemo;
