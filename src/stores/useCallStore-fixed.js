// 🏪 Zustand Store para Call Center
// Gestiona datos de llamadas, análisis y métricas de rendimiento
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

const useCallStore = create(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Estado principal
      callData: [],
      processedData: [],
      callMetrics: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageDuration: 0,
        uniqueBeneficiaries: 0,
        protocolCompliance: 0
      },
      
      // Estado de carga
      isLoading: false,
      loadingStage: null,
      loadingMessage: '',
      lastUpdated: null,
      dataSource: null,

      // Filtros
      filters: {
        operator: 'all',
        status: 'all',
        commune: 'all',
        dateRange: null
      },

      // 📊 Acciones principales
      setCallData: (data, source = 'manual') => {
        console.log('📊 Estableciendo datos de llamadas:', {
          dataLength: data?.length || 0,
          source
        });
        
        set({
          callData: data || [],
          lastUpdated: new Date().toISOString(),
          dataSource: source
        });
        
        // Auto-analizar los datos
        if (data && data.length > 0) {
          get().analyzeCallData();
        }
      },

      // 🔍 Análisis de datos simplificado
      analyzeCallData: () => {
        const { callData } = get();
        
        set({ 
          isLoading: true,
          loadingStage: 'analyzing',
          loadingMessage: 'Analizando datos de llamadas...'
        });
        
        if (!callData || callData.length === 0) {
          set({ 
            processedData: [],
            callMetrics: {
              totalCalls: 0,
              successfulCalls: 0,
              failedCalls: 0,
              averageDuration: 0,
              uniqueBeneficiaries: 0,
              protocolCompliance: 0
            },
            isLoading: false,
            loadingStage: 'complete',
            loadingMessage: 'No hay datos para analizar'
          });
          return;
        }

        try {
          const processedData = callData.map((call, index) => {
            // Normalizar datos de llamada
            const processed = {
              id: call.id || `call_${index}`,
              date: call.date || call.fecha || new Date().toISOString(),
              operator: call.operator || call.operador || call.teleoperador || 'Sin asignar',
              beneficiary: call.beneficiary || call.beneficiario || call.nombre || 'Sin identificar',
              commune: call.commune || call.comuna || 'Sin comuna',
              result: call.result || call.resultado || call.estado || 'Sin resultado',
              duration: parseInt(call.duration || call.duracion || 0),
              isSuccessful: false,
              protocolCompliance: 0
            };

            // Determinar éxito de la llamada
            const successKeywords = ['exitosa', 'exitoso', 'contactado', 'respuesta', 'atendida'];
            const failKeywords = ['sin respuesta', 'no contesta', 'fallida', 'error'];
            
            const resultLower = processed.result.toLowerCase();
            processed.isSuccessful = successKeywords.some(keyword => resultLower.includes(keyword)) &&
                                   !failKeywords.some(keyword => resultLower.includes(keyword));

            // Calcular compliance básico
            processed.protocolCompliance = processed.duration > 30 ? 80 : 40;

            return processed;
          });

          // Calcular métricas
          const totalCalls = processedData.length;
          const successfulCalls = processedData.filter(call => call.isSuccessful).length;
          const failedCalls = totalCalls - successfulCalls;
          const totalDuration = processedData.reduce((sum, call) => sum + call.duration, 0);
          const averageDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
          const uniqueBeneficiaries = new Set(processedData.map(call => call.beneficiary)).size;
          const protocolCompliance = totalCalls > 0 ? 
            Math.round(processedData.reduce((sum, call) => sum + call.protocolCompliance, 0) / totalCalls) : 0;

          const metrics = {
            totalCalls,
            successfulCalls,
            failedCalls,
            averageDuration,
            uniqueBeneficiaries,
            protocolCompliance
          };

          set({
            processedData,
            callMetrics: metrics,
            isLoading: false,
            loadingStage: 'complete',
            loadingMessage: `Análisis completado: ${processedData.length} llamadas procesadas`
          });
          
          console.log('✅ Análisis completado:', metrics);
          
        } catch (error) {
          console.error('Error en analyzeCallData:', error);
          set({
            isLoading: false,
            loadingStage: 'error',
            loadingMessage: 'Error al analizar datos'
          });
        }
      },

      // 📈 Métricas de operador simplificadas
      getOperatorMetrics: (operatorAssignments = null) => {
        try {
          const { processedData } = get();
          
          console.log('📈 Calculando métricas de operadores:', {
            operatorAssignments: operatorAssignments ? 'presente' : 'null',
            processedDataLength: processedData?.length || 0
          });

          if (!processedData || processedData.length === 0) {
            return [];
          }

          // Obtener asignaciones
          const operatorAssignmentsData = operatorAssignments || 
            get().getAllAssignments?.() || {};
          
          console.log('Datos de asignaciones:', operatorAssignmentsData);

          // Si tenemos asignaciones, usarlas como fuente de verdad
          if (operatorAssignmentsData && Object.keys(operatorAssignmentsData).length > 0) {
            const beneficiaryToOperator = new Map();
            const operatorMetrics = {};

            // Mapear beneficiarios a operadores desde asignaciones
            Object.values(operatorAssignmentsData).flat().forEach(assignment => {
              if (assignment && assignment.operatorName && assignment.beneficiary) {
                const normBeneficiary = assignment.beneficiary.toLowerCase().trim();
                beneficiaryToOperator.set(normBeneficiary, assignment.operatorName);
                
                if (!operatorMetrics[assignment.operatorName]) {
                  operatorMetrics[assignment.operatorName] = {
                    operatorName: assignment.operatorName,
                    totalCalls: 0,
                    successfulCalls: 0,
                    failedCalls: 0,
                    averageDuration: 0,
                    totalDuration: 0,
                    successRate: 0
                  };
                }
              }
            });

            // Procesar llamadas
            processedData.forEach(call => {
              const normBeneficiary = call.beneficiary.toLowerCase().trim();
              const operatorName = beneficiaryToOperator.get(normBeneficiary);
              
              if (operatorName && operatorMetrics[operatorName]) {
                const metrics = operatorMetrics[operatorName];
                metrics.totalCalls++;
                metrics.totalDuration += call.duration || 0;
                
                if (call.isSuccessful) {
                  metrics.successfulCalls++;
                } else {
                  metrics.failedCalls++;
                }
              }
            });

            // Calcular promedios y tasas
            return Object.values(operatorMetrics).map(metrics => ({
              ...metrics,
              averageDuration: metrics.totalCalls > 0 ? 
                Math.round(metrics.totalDuration / metrics.totalCalls) : 0,
              successRate: metrics.totalCalls > 0 ? 
                Math.round((metrics.successfulCalls / metrics.totalCalls) * 100) : 0
            }));
          }

          // Fallback: agrupar por operador directo
          const operatorGroups = {};
          
          processedData.forEach(call => {
            const operatorName = call.operator || 'Sin asignar';
            
            if (!operatorGroups[operatorName]) {
              operatorGroups[operatorName] = {
                operatorName,
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                totalDuration: 0
              };
            }
            
            const group = operatorGroups[operatorName];
            group.totalCalls++;
            group.totalDuration += call.duration || 0;
            
            if (call.isSuccessful) {
              group.successfulCalls++;
            } else {
              group.failedCalls++;
            }
          });

          return Object.values(operatorGroups).map(metrics => ({
            ...metrics,
            averageDuration: metrics.totalCalls > 0 ? 
              Math.round(metrics.totalDuration / metrics.totalCalls) : 0,
            successRate: metrics.totalCalls > 0 ? 
              Math.round((metrics.successfulCalls / metrics.totalCalls) * 100) : 0
          }));

        } catch (error) {
          console.error('Error calculando métricas de operador:', error);
          return [];
        }
      },

      // Filtros y búsquedas
      setFilters: (newFilters) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters }
        }));
      },

      getFilteredData: () => {
        const { processedData, filters } = get();
        let filtered = [...processedData];

        // Filtrar por operador
        if (filters.operator && filters.operator !== 'all') {
          filtered = filtered.filter(call => call.operator === filters.operator);
        }

        // Filtrar por estado
        if (filters.status && filters.status !== 'all') {
          if (filters.status === 'successful') {
            filtered = filtered.filter(call => call.isSuccessful);
          } else if (filters.status === 'failed') {
            filtered = filtered.filter(call => !call.isSuccessful);
          }
        }

        // Filtrar por comuna
        if (filters.commune && filters.commune !== 'all') {
          filtered = filtered.filter(call => call.commune === filters.commune);
        }

        // Filtrar por rango de fechas
        if (filters.dateRange) {
          const { start, end } = filters.dateRange;
          filtered = filtered.filter(call => {
            const callDate = new Date(call.date);
            return callDate >= new Date(start) && callDate <= new Date(end);
          });
        }

        return filtered;
      },

      clearData: () => {
        set({
          callData: [],
          processedData: [],
          callMetrics: {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageDuration: 0,
            uniqueBeneficiaries: 0,
            protocolCompliance: 0
          },
          lastUpdated: null,
          dataSource: null,
          isLoading: false,
          loadingStage: null,
          loadingMessage: ''
        });
      }
    })),
    {
      name: 'call-store',
      version: 1
    }
  )
);

export default useCallStore;
