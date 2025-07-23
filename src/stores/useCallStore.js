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
      loadingStage: null, // 'uploading', 'processing', 'analyzing', 'complete'
      loadingMessage: '',
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
          isLoading: false,
          loadingStage: 'complete',
          loadingMessage: `${data.length} llamadas cargadas exitosamente`
        });
        // Analizar automáticamente los nuevos datos
        get().analyzeCallData();
      },

      setLoading: (loading, stage = null, message = '') => {
        set({ 
          isLoading: loading,
          loadingStage: stage,
          loadingMessage: message
        });
      },

      setLoadingStage: (stage, message = '') => {
        const stageMessages = {
          'uploading': 'Subiendo archivo Excel...',
          'processing': 'Procesando datos del archivo...',
          'analyzing': 'Analizando llamadas y generando métricas...',
          'complete': 'Análisis completado exitosamente',
          'error': 'Error durante el procesamiento'
        };
        
        set({
          loadingStage: stage,
          loadingMessage: message || stageMessages[stage] || '',
          isLoading: stage !== 'complete' && stage !== 'error'
        });
      },

      analyzeCallData: () => {
        const { callData } = get();
        
        // Establecer estado de análisis
        get().setLoadingStage('analyzing', 'Analizando datos de llamadas...');
        
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
            loadingStage: 'complete',
            loadingMessage: 'No hay datos para analizar',
            isLoading: false
          });
          return;
        }

        // Simular un pequeño delay para mostrar el estado de análisis
        setTimeout(() => {
          // Procesar datos para auditoría (manteniendo formato de fecha original)
          const processedData = callData.map(call => ({
            ...call,
            duracion: parseInt(call.duracion) || 0,
            isSuccessful: call.categoria === 'exitosa' || call.result === 'Llamado exitoso',
            // ✅ MANTENER fecha como string en lugar de convertir a Date
            fecha: call.fecha || 'N/A',
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
            callMetrics: metrics,
            loadingStage: 'complete',
            loadingMessage: `Análisis completado: ${processedData.length} llamadas procesadas`,
            isLoading: false
          });
        }, 800); // Delay de 800ms para mostrar el estado
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
        if (!processedData || processedData.length === 0) {
          return [];
        }
        
        // Función auxiliar para formatear fechas al formato chileno DD-MM-YYYY
        const formatDateSafely = (dateValue) => {
          if (!dateValue) return 'N/A';
          
          try {
            let date;
            
            // Si es string con formato DD-MM-YYYY o DD/MM/YYYY (ya chileno)
            if (typeof dateValue === 'string' && /^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(dateValue)) {
              const parts = dateValue.split(/[-\/]/);
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]);
              const year = parseInt(parts[2]);
              
              // Verificar que sea formato chileno válido (día <= 31, mes <= 12)
              if (day <= 31 && month <= 12 && year >= 1900) {
                return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
              }
            }
            
            // Si es número (Excel serial date)
            if (typeof dateValue === 'number') {
              date = new Date((dateValue - 25569) * 86400 * 1000);
            } else {
              date = new Date(dateValue);
            }
            
            // Verificar validez y formatear
            if (date && !isNaN(date.getTime())) {
              const day = date.getDate().toString().padStart(2, '0');
              const month = (date.getMonth() + 1).toString().padStart(2, '0');
              const year = date.getFullYear();
              
              return `${day}-${month}-${year}`;
            }
            
            return 'Fecha inválida';
          } catch (error) {
            return typeof dateValue === 'string' ? dateValue : 'Error en fecha';
          }
        };
        
        const beneficiaryStatus = {};

        // Analizar estado de cada beneficiario
        processedData.forEach(call => {
          // Usar los nombres de campos correctos del procesamiento de Excel
          const beneficiary = call.beneficiario || call.beneficiary;
          const result = call.resultado || call.result || (call.categoria === 'exitosa' ? 'Llamado exitoso' : 'Llamado fallido');
          const date = call.fecha || call.date;
          
          if (!beneficiary) return; // Skip si no hay beneficiario
          
          if (!beneficiaryStatus[beneficiary]) {
            beneficiaryStatus[beneficiary] = {
              beneficiary,
              calls: [],
              lastResult: result,
              lastDate: date
            };
          }

          beneficiaryStatus[beneficiary].calls.push(call);

          // Mantener la llamada más reciente
          const currentDate = new Date(date);
          const lastDate = new Date(beneficiaryStatus[beneficiary].lastDate);
          
          if (!isNaN(currentDate.getTime()) && (isNaN(lastDate.getTime()) || currentDate > lastDate)) {
            beneficiaryStatus[beneficiary].lastResult = result;
            beneficiaryStatus[beneficiary].lastDate = date;
          }
        });

        // Generar datos de seguimiento
        return Object.values(beneficiaryStatus).map(item => {
          // Buscar asignación de manera más robusta
          let assignment = null;
          
          if (assignments && Array.isArray(assignments)) {
            // Buscar por diferentes campos posibles
            assignment = assignments.find(a => {
              const assignmentBeneficiary = a.beneficiary || a.beneficiario;
              return assignmentBeneficiary === item.beneficiary;
            });
          }
          
          let status = 'pendiente';
          let colorClass = 'bg-yellow-100 text-yellow-800';

          if (item.lastResult === 'Llamado exitoso' || item.lastResult === 'exitosa') {
            status = 'al-dia';
            colorClass = 'bg-green-100 text-green-800';
          } else if (item.calls.length > 3) {
            status = 'urgente';
            colorClass = 'bg-red-100 text-red-800';
          }

          // Obtener información de la operadora PRIORIZANDO las asignaciones
          let operatorName = 'Sin asignar';
          let phone = 'N/A';
          let commune = 'N/A';
          
          if (assignment) {
            // Prioridad 1: Obtener de las asignaciones (fuente confiable)
            const candidateOperator = assignment.operator || 
                                    assignment.operador || 
                                    assignment.operatorName ||
                                    assignment.teleoperadora ||
                                    assignment.name;
            
            // Validar que el operador sea válido
            if (candidateOperator && 
                candidateOperator !== 'Solo HANGUP' && 
                candidateOperator !== 'HANGUP' &&
                candidateOperator !== 'No identificado' &&
                candidateOperator.trim().length > 2 &&
                !/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(candidateOperator)) {
              operatorName = candidateOperator;
            }
            
            // Probar diferentes campos para el teléfono
            phone = assignment.phone || 
                   assignment.telefono || 
                   assignment.primaryPhone ||
                   assignment.numero_cliente || 
                   'N/A';
            
            // Probar diferentes campos para la comuna
            commune = assignment.commune || 
                     assignment.comuna || 
                     'N/A';
          } 
          
          // Prioridad 2: Solo si no hay operador válido desde asignación
          if (operatorName === 'Sin asignar') {
            const callWithOperator = item.calls.find(call => {
              const operador = call.operador || call.operator || call.teleoperadora;
              // Validación mejorada de operadores
              return operador && 
                     operador !== 'No identificado' && 
                     operador !== 'Solo HANGUP' &&
                     operador !== 'HANGUP' &&
                     operador !== item.beneficiary &&
                     operador.trim().length > 2 &&
                     !/^\d{1,2}:\d{2}/.test(operador) &&
                     !/^\d+$/.test(operador) &&
                     !/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(operador) &&
                     !/^(si|no|exitoso|fallido|pendiente)$/i.test(operador) &&
                     /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s\-\.]{3,}$/.test(operador);
            });
            
            if (callWithOperator) {
              const detectedOperator = callWithOperator.operador || 
                                     callWithOperator.operator || 
                                     callWithOperator.teleoperadora;
              
              operatorName = detectedOperator;
            }
          }

          const result = {
            id: item.beneficiary,
            operator: operatorName,
            beneficiary: item.beneficiary,
            phone: phone,
            commune: commune,
            status,
            lastCall: formatDateSafely(item.lastDate),
            callCount: item.calls.length,
            colorClass
          };
          
          return result;
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
        filters: state.filters,
        loadingStage: state.loadingStage,
        loadingMessage: state.loadingMessage
      })
    }
  )
);

export default useCallStore;
