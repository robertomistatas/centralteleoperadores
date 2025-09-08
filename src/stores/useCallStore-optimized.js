import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Store OPTIMIZADO para manejo de datos de auditoría de llamadas
 * Optimizaciones implementadas:
 * - Eliminación de logs excesivos
 * - Uso de Maps para búsquedas O(1)
 * - Caché de operaciones costosas
 * - Procesamiento por lotes
 */
const useCallStore = create(
  persist(
    (set, get) => ({
      // Estado inicial de datos de auditoría
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
      isLoading: false,
      loadingStage: null,
      loadingMessage: '',
      lastUpdated: null,
      dataSource: null,
      filters: {
        dateRange: null,
        operator: null,
        status: 'all',
        commune: null
      },
      
      // Cachés para optimización
      _phoneToOperatorCache: new Map(),
      _beneficiaryCache: new Map(),
      _dateCache: new Map(),

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

        // Procesamiento optimizado en lotes
        setTimeout(() => {
          const processedData = callData.map(call => {
            const beneficiary = call.beneficiario || call.beneficiary || call.nombre || 'Sin identificar';
            const operator = call.operador || call.operator || call.teleoperadora || 'No identificado';
            const phone = call.telefono || call.phone || call.numero || 'N/A';
            const date = call.fecha || call.date || new Date().toISOString().split('T')[0];
            const duration = parseInt(call.duracion || call.duration || 0);
            
            // Análisis simplificado de resultado
            const result = (call.resultado || call.result || call.estado || '').toLowerCase();
            const isSuccessful = result.includes('exitosa') || result.includes('contactado') || 
                               result.includes('atendida') || result.includes('completada');
            
            return {
              ...call,
              beneficiary,
              operator,
              phone,
              date,
              duration,
              isSuccessful,
              categoria: isSuccessful ? 'exitosa' : 'fallida'
            };
          });

          // Calcular métricas optimizadas
          const totalCalls = processedData.length;
          const successfulCalls = processedData.filter(call => call.isSuccessful).length;
          const failedCalls = totalCalls - successfulCalls;
          const totalDuration = processedData.reduce((sum, call) => sum + call.duration, 0);
          const averageDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
          const uniqueBeneficiaries = new Set(processedData.map(call => call.beneficiary)).size;

          const callMetrics = {
            totalCalls,
            successfulCalls,
            failedCalls,
            averageDuration,
            uniqueBeneficiaries,
            protocolCompliance: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0
          };

          set({
            processedData,
            callMetrics,
            loadingStage: 'complete',
            loadingMessage: `Análisis completado: ${totalCalls} llamadas procesadas`,
            isLoading: false
          });
        }, 100);
      },

      // Función optimizada para filtros
      getFilteredData: () => {
        const { processedData, filters } = get();
        
        if (!processedData || processedData.length === 0) {
          return [];
        }

        let filtered = [...processedData];

        // Aplicar filtros de manera eficiente
        if (filters.operator && filters.operator !== 'all') {
          filtered = filtered.filter(call => call.operator === filters.operator);
        }

        if (filters.status && filters.status !== 'all') {
          if (filters.status === 'successful') {
            filtered = filtered.filter(call => call.isSuccessful);
          } else if (filters.status === 'failed') {
            filtered = filtered.filter(call => !call.isSuccessful);
          }
        }

        if (filters.commune && filters.commune !== 'all') {
          filtered = filtered.filter(call => call.commune === filters.commune);
        }

        if (filters.dateRange) {
          const { start, end } = filters.dateRange;
          const startTime = new Date(start).getTime();
          const endTime = new Date(end).getTime();
          
          filtered = filtered.filter(call => {
            const callTime = new Date(call.date).getTime();
            return callTime >= startTime && callTime <= endTime;
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
          loadingMessage: '',
          _phoneToOperatorCache: new Map(),
          _beneficiaryCache: new Map(),
          _dateCache: new Map()
        });
      },

      // FUNCIÓN OPTIMIZADA: Métricas de operadora con Map para O(1)
      getOperatorMetrics: (operatorAssignments = null) => {
        try {
          const { callData, _phoneToOperatorCache } = get();
          
          if (!callData || callData.length === 0) {
            return [];
          }

          if (!operatorAssignments || !Array.isArray(operatorAssignments) || operatorAssignments.length === 0) {
            return [];
          }

          // OPTIMIZACIÓN 1: Crear Map de teléfono → operadora (solo si no existe en caché)
          let phoneToOperator = _phoneToOperatorCache;
          
          if (phoneToOperator.size === 0) {
            operatorAssignments.forEach(assignment => {
              const operatorName = assignment.operator || assignment.operatorName || 'Sin Asignar';
              
              // Extraer todos los números de manera eficiente
              const phones = [];
              
              // Campos individuales
              [assignment.phone, assignment.primaryPhone, assignment.telefono, assignment.numero_cliente]
                .filter(Boolean)
                .forEach(phone => {
                  if (phone.includes(';')) {
                    phones.push(...phone.split(';').map(p => p.trim()));
                  } else {
                    phones.push(phone);
                  }
                });
              
              // Array de teléfonos
              if (assignment.phones && Array.isArray(assignment.phones)) {
                phones.push(...assignment.phones);
              }
              
              // Procesar cada teléfono de manera optimizada
              phones.forEach(phone => {
                if (phone && phone !== 'N/A' && phone.trim()) {
                  const cleanPhone = phone.toString().replace(/[^\d]/g, '');
                  if (cleanPhone.length >= 8) {
                    const phoneKey = cleanPhone.slice(-8);
                    phoneToOperator.set(phoneKey, operatorName);
                  }
                }
              });
            });
            
            // Actualizar caché
            set({ _phoneToOperatorCache: phoneToOperator });
          }

          // OPTIMIZACIÓN 2: Inicializar métricas con Set para operadoras únicas
          const operatorNames = [...new Set(Array.from(phoneToOperator.values()))];
          const operatorMetrics = {};
          
          operatorNames.forEach(operatorName => {
            operatorMetrics[operatorName] = {
              operatorName,
              totalCalls: 0,
              successfulCalls: 0,
              failedCalls: 0,
              totalDuration: 0
            };
          });

          // OPTIMIZACIÓN 3: Procesar llamadas de manera eficiente (sin logs excesivos)
          let callsMatched = 0;
          
          callData.forEach(call => {
            const callPhone = call.phone || call.telefono || call.numero || call.numero_cliente || call.numero_telefono || '';
            
            if (callPhone && callPhone.trim()) {
              const cleanCallPhone = callPhone.toString().replace(/[^\d]/g, '');
              
              if (cleanCallPhone.length >= 8) {
                const phoneKey = cleanCallPhone.slice(-8);
                const assignedOperator = phoneToOperator.get(phoneKey);
                
                if (assignedOperator && operatorMetrics[assignedOperator]) {
                  callsMatched++;
                  const metrics = operatorMetrics[assignedOperator];
                  metrics.totalCalls++;
                  
                  const duration = parseInt(call.duration || call.duracion || 0);
                  metrics.totalDuration += duration;
                  
                  // Análisis simplificado de resultado
                  const result = (call.result || call.resultado || call.estado || '').toLowerCase();
                  const isSuccessful = result.includes('exitosa') || result.includes('exitoso') || 
                                     result.includes('contactado') || result.includes('atendida') ||
                                     result.includes('respuesta') || result.includes('contesto') ||
                                     result.includes('completada') || result.includes('respondio');
                  
                  if (isSuccessful) {
                    metrics.successfulCalls++;
                  } else {
                    metrics.failedCalls++;
                  }
                }
              }
            }
          });

          // OPTIMIZACIÓN 4: Generar resultado final de manera eficiente
          const result = Object.values(operatorMetrics)
            .filter(metrics => metrics.totalCalls > 0)
            .map(metrics => ({
              operatorName: metrics.operatorName,
              totalCalls: metrics.totalCalls,
              successfulCalls: metrics.successfulCalls,
              failedCalls: metrics.failedCalls,
              averageDuration: metrics.totalCalls > 0 ? 
                Math.round(metrics.totalDuration / metrics.totalCalls) : 0,
              successRate: metrics.totalCalls > 0 ? 
                Math.round((metrics.successfulCalls / metrics.totalCalls) * 100) : 0
            }))
            .sort((a, b) => b.totalCalls - a.totalCalls);

          return result;

        } catch (error) {
          console.error('Error en getOperatorMetrics:', error);
          return [];
        }
      },

      // FUNCIÓN OPTIMIZADA: Distribución horaria
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
            // Silenciar errores para optimización
          }
        });

        return hourlyData;
      },

      // FUNCIÓN OPTIMIZADA: Datos de seguimiento
      getFollowUpData: (assignments) => {
        const { processedData, _beneficiaryCache } = get();
        
        if (!processedData || processedData.length === 0) {
          return [];
        }
        
        // OPTIMIZACIÓN 1: Formateo de fechas con caché
        const { _dateCache } = get();
        const formatDateSafely = (dateValue) => {
          if (!dateValue) return 'N/A';
          
          if (_dateCache.has(dateValue)) {
            return _dateCache.get(dateValue);
          }
          
          try {
            let result;
            
            if (typeof dateValue === 'string' && /^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(dateValue)) {
              const parts = dateValue.split(/[-\/]/);
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]);
              const year = parseInt(parts[2]);
              
              if (day <= 31 && month <= 12 && year >= 1900) {
                result = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
              } else {
                result = 'Fecha inválida';
              }
            } else if (typeof dateValue === 'number') {
              const date = new Date((dateValue - 25569) * 86400 * 1000);
              if (!isNaN(date.getTime())) {
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                result = `${day}-${month}-${year}`;
              } else {
                result = 'Fecha inválida';
              }
            } else {
              const date = new Date(dateValue);
              if (!isNaN(date.getTime())) {
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                result = `${day}-${month}-${year}`;
              } else {
                result = typeof dateValue === 'string' ? dateValue : 'Error en fecha';
              }
            }
            
            _dateCache.set(dateValue, result);
            return result;
          } catch (error) {
            return typeof dateValue === 'string' ? dateValue : 'Error en fecha';
          }
        };

        // OPTIMIZACIÓN 2: Crear Map de beneficiarios para O(1) lookup
        let beneficiaryStatus = _beneficiaryCache;
        
        if (beneficiaryStatus.size === 0) {
          processedData.forEach(call => {
            const beneficiary = call.beneficiario || call.beneficiary;
            const result = call.resultado || call.result || (call.categoria === 'exitosa' ? 'Llamado exitoso' : 'Llamado fallido');
            const date = call.fecha || call.date;
            
            if (!beneficiary) return;
            
            if (!beneficiaryStatus.has(beneficiary)) {
              beneficiaryStatus.set(beneficiary, {
                beneficiary,
                calls: [],
                lastResult: result,
                lastDate: date
              });
            }

            const status = beneficiaryStatus.get(beneficiary);
            status.calls.push(call);

            // Mantener la llamada más reciente (comparación optimizada)
            try {
              const currentTime = new Date(date).getTime();
              const lastTime = new Date(status.lastDate).getTime();
              
              if (!isNaN(currentTime) && (isNaN(lastTime) || currentTime > lastTime)) {
                status.lastResult = result;
                status.lastDate = date;
              }
            } catch (error) {
              // Silenciar errores para optimización
            }
          });
          
          // Actualizar caché
          set({ _beneficiaryCache: beneficiaryStatus });
        }

        // OPTIMIZACIÓN 3: Crear Map de asignaciones para búsqueda O(1)
        const assignmentMap = new Map();
        if (assignments && Array.isArray(assignments)) {
          assignments.forEach(assignment => {
            const beneficiary = (assignment.beneficiary || assignment.beneficiario || '').trim();
            if (beneficiary) {
              assignmentMap.set(beneficiary.toLowerCase(), assignment);
            }
          });
        }

        // OPTIMIZACIÓN 4: Generar resultado de manera eficiente
        const result = Array.from(beneficiaryStatus.values()).map(item => {
          // Búsqueda optimizada de asignación
          const assignment = assignmentMap.get(item.beneficiary.toLowerCase());
          
          let status = 'pendiente';
          let colorClass = 'bg-yellow-100 text-yellow-800';

          if (item.lastResult === 'Llamado exitoso' || item.lastResult === 'exitosa') {
            status = 'al-dia';
            colorClass = 'bg-green-100 text-green-800';
          } else if (item.calls.length > 3) {
            status = 'urgente';
            colorClass = 'bg-red-100 text-red-800';
          }

          // Obtener información de la operadora de manera optimizada
          let operatorName = 'No Asignado';
          let phone = 'N/A';
          let commune = 'N/A';
          
          if (assignment) {
            const candidateOperator = assignment.operator || 
                                    assignment.operador || 
                                    assignment.operatorName ||
                                    assignment.teleoperadora ||
                                    assignment.name;
            
            // Validación simplificada de operador
            if (candidateOperator && 
                candidateOperator !== 'Solo HANGUP' && 
                candidateOperator !== 'HANGUP' &&
                candidateOperator !== 'No identificado' &&
                candidateOperator !== 'Llamado exitoso' &&
                candidateOperator !== 'Llamado fallido' &&
                candidateOperator !== 'exitosa' &&
                candidateOperator !== 'fallida' &&
                candidateOperator.trim().length > 2 &&
                !/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(candidateOperator)) {
              operatorName = candidateOperator;
            }
            
            phone = assignment.phone || assignment.telefono || assignment.primaryPhone || assignment.numero_cliente || 'N/A';
            commune = assignment.commune || assignment.comuna || 'N/A';
          }

          return {
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
        });
        
        return result;
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
      name: 'call-audit-storage-optimized',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        callData: state.callData,
        processedData: state.processedData,
        callMetrics: state.callMetrics,
        lastUpdated: state.lastUpdated,
        dataSource: state.dataSource,
        filters: state.filters,
        loadingStage: state.loadingStage,
        loadingMessage: state.loadingMessage
        // No persistir cachés (se regeneran al cargar)
      })
    }
  )
);

export default useCallStore;
