import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Store para manejo de datos de auditoría de llamadas
 * Gestiona la carga, análisis y persistencia de datos de llamadas para auditoría
 */
const useCallStore = create(
  persist(
    (set, get) => ({
      // Estado inicial de datos de auditoría
      callData: [], // Datos brutos de llamadas cargados desde Excel
      processedData: [], // Datos procesados y analizados
      callMetrics: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageDuration: 0,
        uniqueBeneficiaries: 0,
        protocolCompliance: 0
      },
      isLoading: false,
      lastUpdated: null,
      dataSource: null, // 'excel', 'firebase', 'api'
      filters: {
        dateRange: null,
        operator: null,
        status: 'all',
        commune: null
      },

      // Acciones principales para auditoría
      setCallData: (data, source = 'excel') => {
        const timestamp = new Date().toISOString();
        set({
          callData: data,
          dataSource: source,
          lastUpdated: timestamp,
          isLoading: false
        });
        // Analizar automáticamente los nuevos datos
        get().analyzeCallData();
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      analyzeCallData: () => {
        const { callData } = get();
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
            }
          });
          return;
        }

        // Procesar datos para auditoría
        const processedData = callData.map(call => ({
          ...call,
          duracion: parseInt(call.duracion) || 0,
          isSuccessful: call.categoria === 'exitosa' || call.result === 'Llamado exitoso',
          fecha: call.fecha ? new Date(call.fecha) : new Date(),
          hora: call.hora ? parseInt(call.hora.split(':')[0]) : null
        }));

        // Calcular métricas de auditoría
        const successfulCalls = processedData.filter(call => call.isSuccessful);
        const uniqueBeneficiaries = new Set(processedData.map(call => call.beneficiario || call.beneficiary)).size;
        const totalDuration = processedData.reduce((sum, call) => sum + (call.duracion || 0), 0);
        const averageDuration = processedData.length > 0 ? Math.round(totalDuration / processedData.length) : 0;
        const protocolCompliance = processedData.length > 0 ? 
          Math.round((successfulCalls.length / processedData.length) * 100) : 0;

        const metrics = {
          totalCalls: processedData.length,
          successfulCalls: successfulCalls.length,
          failedCalls: processedData.length - successfulCalls.length,
          averageDuration,
          uniqueBeneficiaries,
          protocolCompliance
        };

        set({
          processedData,
          callMetrics: metrics
        });
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
          dataSource: null
        });
      },

      // Análisis específicos para auditoría
      getOperatorMetrics: (operatorAssignments = null) => {
        const { processedData } = get();
        
        // Si no se proporciona operatorAssignments, usar los datos procesados directamente
        if (!operatorAssignments || typeof operatorAssignments !== 'object') {
          const operatorMetrics = {};
          
          // Función auxiliar para validar si un valor es un nombre de operador válido
          const isValidOperatorName = (name) => {
            if (!name || typeof name !== 'string') return false;
            
            // Rechazar formatos de hora
            if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(name)) return false;
            
            // Rechazar solo números
            if (/^\d+$/.test(name)) return false;
            
            // Rechazar fechas
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(name) || !isNaN(Date.parse(name))) return false;
            
            // Rechazar valores muy cortos
            if (name.trim().length < 3) return false;
            
            // Aceptar nombres que contengan al menos 2 palabras o caracteres alfabéticos
            const words = name.trim().split(/\s+/).filter(word => word.length > 1);
            if (words.length >= 2) return true;
            
            // Aceptar si contiene principalmente letras
            if (/^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s\-\.]{3,}$/.test(name)) return true;
            
            return false;
          };
          
          // Crear métricas basadas solo en los datos de llamadas
          processedData.forEach(call => {
            // Intentar obtener el operador de diferentes campos posibles
            let operatorName = call.operador || call.operator || call.teleoperadora || call.agente;
            
            // Validar que el operador no sea un beneficiario ni un valor inválido
            if (!isValidOperatorName(operatorName) || 
                operatorName === call.beneficiario || 
                operatorName === call.beneficiary) {
              operatorName = 'No identificado';
            }
            
            // Debug: Log solo para operadores que parecen problemáticos
            if (operatorName !== 'No identificado' && 
                (/^\d{1,2}:\d{2}/.test(call.operador) || 
                 call.operador === call.beneficiario || 
                 call.operador === call.beneficiary)) {
              console.warn(`🚨 Operador problemático detectado: "${call.operador}" → corregido a: "${operatorName}" de llamada:`, {
                operadorOriginal: call.operador,
                beneficiario: call.beneficiario,
                operadorFinal: operatorName
              });
            }
            
            if (!operatorMetrics[operatorName]) {
              operatorMetrics[operatorName] = {
                operador: operatorName,
                totalLlamadas: 0,
                llamadasExitosas: 0,
                tiempoTotal: 0,
                promedioLlamada: 0
              };
            }
            
            const metrics = operatorMetrics[operatorName];
            metrics.totalLlamadas++;
            if (call.categoria === 'exitosa') metrics.llamadasExitosas++;
            metrics.tiempoTotal += call.duracion || 0;
          });
          
          // Calcular promedios
          Object.values(operatorMetrics).forEach(metrics => {
            metrics.promedioLlamada = metrics.totalLlamadas > 0 ? 
              Math.round(metrics.tiempoTotal / metrics.totalLlamadas) : 0;
          });
          
          return Object.values(operatorMetrics);
        }
        
        // Lógica original con operatorAssignments
        const operatorMetrics = {};

        // Inicializar métricas para cada operador
        try {
          Object.values(operatorAssignments).flat().forEach(assignment => {
            if (assignment.operatorName && !operatorMetrics[assignment.operatorName]) {
              operatorMetrics[assignment.operatorName] = {
                operador: assignment.operatorName,
                totalLlamadas: 0,
                llamadasExitosas: 0,
                tiempoTotal: 0,
                promedioLlamada: 0
              };
            }
          });
        } catch (error) {
          console.warn('Error procesando operatorAssignments:', error);
          return [];
        }

        // Calcular métricas basadas en datos reales
        processedData.forEach(call => {
          try {
            const assignment = Object.values(operatorAssignments)
              .flat()
              .find(a => a.beneficiary === call.beneficiary);
            
            if (assignment && operatorMetrics[assignment.operatorName]) {
              const metrics = operatorMetrics[assignment.operatorName];
              metrics.totalLlamadas++;
              if (call.categoria === 'exitosa') metrics.llamadasExitosas++;
              metrics.tiempoTotal += call.duracion || 0;
            }
          } catch (error) {
            console.warn('Error procesando call data:', error);
          }
        });

        // Calcular promedios
        Object.values(operatorMetrics).forEach(metrics => {
          metrics.promedioLlamada = metrics.totalLlamadas > 0 ? 
            Math.round(metrics.tiempoTotal / metrics.totalLlamadas) : 0;
        });

        return Object.values(operatorMetrics);
      },

      getHourlyDistribution: () => {
        const { processedData } = get();
        const hourlyData = Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          calls: 0
        }));

        if (!Array.isArray(processedData)) {
          return hourlyData;
        }

        processedData.forEach(call => {
          try {
            let hour = null;
            
            // Extraer hora de diferentes formatos posibles
            if (call.hora) {
              const timeStr = call.hora.toString();
              const hourMatch = timeStr.match(/^(\d{1,2})/);
              if (hourMatch) {
                hour = parseInt(hourMatch[1]);
              }
            } else if (call.hour !== undefined) {
              hour = parseInt(call.hour);
            }
            
            if (hour !== null && hour >= 0 && hour < 24) {
              hourlyData[hour].calls++;
            }
          } catch (error) {
            console.warn('Error procesando hora de llamada:', error);
          }
        });

        return hourlyData;
      },

      getFollowUpData: (assignments) => {
        const { processedData } = get();
        const beneficiaryStatus = {};

        // Analizar estado de cada beneficiario
        processedData.forEach(call => {
          const beneficiary = call.beneficiary;
          if (!beneficiaryStatus[beneficiary]) {
            beneficiaryStatus[beneficiary] = {
              beneficiary,
              calls: [],
              lastResult: call.result,
              lastDate: call.date
            };
          }

          beneficiaryStatus[beneficiary].calls.push(call);

          // Mantener la llamada más reciente
          if (new Date(call.date) > new Date(beneficiaryStatus[beneficiary].lastDate)) {
            beneficiaryStatus[beneficiary].lastResult = call.result;
            beneficiaryStatus[beneficiary].lastDate = call.date;
          }
        });

        // Generar datos de seguimiento
        return Object.values(beneficiaryStatus).map(item => {
          const assignment = assignments.find(a => a.beneficiary === item.beneficiary);
          let status = 'pendiente';
          let colorClass = 'bg-yellow-100 text-yellow-800';

          if (item.lastResult === 'Llamado exitoso') {
            status = 'al-dia';
            colorClass = 'bg-green-100 text-green-800';
          } else if (item.calls.length > 3) {
            status = 'urgente';
            colorClass = 'bg-red-100 text-red-800';
          }

          return {
            id: item.beneficiary,
            operator: assignment ? assignment.operator : 'Sin asignar',
            beneficiary: item.beneficiary,
            phone: assignment ? assignment.phone : 'N/A',
            commune: assignment ? assignment.commune : 'N/A',
            status,
            lastCall: item.lastDate,
            callCount: item.calls.length,
            colorClass
          };
        });
      },

      // Getters útiles
      hasData: () => {
        const { callData } = get();
        return callData && callData.length > 0;
      },

      getSuccessRate: () => {
        const { callMetrics } = get();
        if (!callMetrics || !callMetrics.totalCalls || callMetrics.totalCalls === 0) {
          return 0;
        }
        return Math.round((callMetrics.successfulCalls / callMetrics.totalCalls) * 100);
      },

      getDataSummary: () => {
        const { callMetrics, lastUpdated, dataSource } = get();
        return {
          ...callMetrics,
          lastUpdated,
          dataSource,
          successRate: get().getSuccessRate()
        };
      }
    }),
    {
      name: 'call-audit-storage',
      storage: createJSONStorage(() => localStorage),
      // Persistir datos de auditoría importantes
      partialize: (state) => ({
        callData: state.callData,
        processedData: state.processedData,
        callMetrics: state.callMetrics,
        lastUpdated: state.lastUpdated,
        dataSource: state.dataSource,
        filters: state.filters
      })
    }
  )
);

export default useCallStore;
