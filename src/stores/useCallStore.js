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
      getOperatorMetrics: (operators = null, operatorAssignments = null) => {
        const { processedData } = get();
        console.log('🔍 [AUDIT CRITICAL] === ANÁLISIS DE MÉTRICAS DE OPERADORES ===');
        console.log('🔍 [AUDIT CRITICAL] ProcessedData disponible:', processedData?.length || 0, 'llamadas');
        console.log('🔍 [AUDIT CRITICAL] Operators recibidos:', operators?.length || 0);
        console.log('🔍 [AUDIT CRITICAL] OperatorAssignments recibidos:', operatorAssignments ? Object.keys(operatorAssignments).length : 0);
        
        // 🚨 SOLUCIÓN CRÍTICA: PRIORIZAR DATOS DE ASIGNACIONES REALES
        // Obtener datos del store de aplicación para conexión inter-módulos
        const appStore = window.useAppStore?.getState();
        const realOperators = operators || appStore?.operators || [];
        const realAssignments = operatorAssignments || appStore?.operatorAssignments || {};
        
        console.log('🔍 [AUDIT CRITICAL] === DATOS FINALES PARA ANÁLISIS ===');
        console.log('🔍 [AUDIT CRITICAL] Operadores finales:', realOperators.length);
        console.log('🔍 [AUDIT CRITICAL] Asignaciones finales:', Object.keys(realAssignments).length);
        
        // ✅ NUEVA ESTRATEGIA: Crear métricas basadas en operadores REALES del sistema
        if (realOperators.length > 0 && processedData.length > 0) {
          console.log('🎯 [AUDIT CRITICAL] USANDO OPERADORES REALES DEL SISTEMA');
          
          const operatorMetrics = {};
          
          // Inicializar métricas para cada operador real
          realOperators.forEach(operator => {
            operatorMetrics[operator.name] = {
              operador: operator.name,
              totalLlamadas: 0,
              llamadasExitosas: 0,
              tiempoTotal: 0,
              promedioLlamada: 0
            };
            console.log('✅ [AUDIT CRITICAL] Operador real inicializado:', operator.name);
          });
          
          // Mapear llamadas a operadores usando asignaciones
          processedData.forEach((call, index) => {
            const beneficiario = call.beneficiario || call.beneficiary;
            
            if (!beneficiario) return;
            
            // Buscar a qué operador está asignado este beneficiario
            let assignedOperator = null;
            
            Object.entries(realAssignments).forEach(([operatorId, assignments]) => {
              if (assignments && Array.isArray(assignments)) {
                const assignment = assignments.find(a => 
                  a.beneficiary === beneficiario || a.beneficiario === beneficiario
                );
                if (assignment) {
                  const operator = realOperators.find(op => op.id === operatorId);
                  if (operator) {
                    assignedOperator = operator.name;
                  }
                }
              }
            });
            
            // Si encontramos asignación, agregar a métricas del operador
            if (assignedOperator && operatorMetrics[assignedOperator]) {
              const metrics = operatorMetrics[assignedOperator];
              metrics.totalLlamadas++;
              
              if (call.categoria === 'exitosa' || call.resultado === 'Llamado exitoso') {
                metrics.llamadasExitosas++;
              }
              
              metrics.tiempoTotal += call.duracion || 0;
              
              if (index < 10) { // Debug primeras 10
                console.log(`✅ [AUDIT CRITICAL] Llamada ${index}: ${beneficiario} → ${assignedOperator}`);
              }
            } else if (index < 10) {
              console.log(`⚠️ [AUDIT CRITICAL] Llamada ${index}: ${beneficiario} → No asignado`);
            }
          });
          
          // Calcular promedios
          Object.values(operatorMetrics).forEach(metrics => {
            metrics.promedioLlamada = metrics.totalLlamadas > 0 ? 
              Math.round(metrics.tiempoTotal / metrics.totalLlamadas) : 0;
          });
          
          // Mostrar solo operadores con llamadas
          const result = Object.values(operatorMetrics).filter(m => m.totalLlamadas > 0);
          
          console.log('🎯 [AUDIT CRITICAL] === RESULTADO FINAL CORREGIDO ===');
          result.forEach((metric, index) => {
            console.log(`${index + 1}. "${metric.operador}": ${metric.totalLlamadas} llamadas`);
          });
          
          if (result.length === 0) {
            console.log('⚠️ [AUDIT CRITICAL] No se encontraron llamadas asignadas a operadores reales');
            console.log('🔍 [AUDIT CRITICAL] Verificando si hay beneficiarios en común...');
            
            // Debug: Ver si hay beneficiarios en común
            const beneficiariosEnLlamadas = new Set(processedData.map(call => call.beneficiario || call.beneficiary));
            const beneficiariosEnAsignaciones = new Set();
            
            Object.values(realAssignments).forEach(assignments => {
              if (assignments && Array.isArray(assignments)) {
                assignments.forEach(a => beneficiariosEnAsignaciones.add(a.beneficiary || a.beneficiario));
              }
            });
            
            console.log('📊 [AUDIT DEBUG] Beneficiarios en llamadas:', beneficiariosEnLlamadas.size);
            console.log('📊 [AUDIT DEBUG] Beneficiarios en asignaciones:', beneficiariosEnAsignaciones.size);
            
            // Mostrar primeros 5 de cada lado para debug
            const muestra = Array.from(beneficiariosEnLlamadas).slice(0, 5);
            const muestraAsignaciones = Array.from(beneficiariosEnAsignaciones).slice(0, 5);
            
            console.log('📋 [AUDIT DEBUG] Muestra llamadas:', muestra);
            console.log('📋 [AUDIT DEBUG] Muestra asignaciones:', muestraAsignaciones);
          }
          
          return result;
        }
        
        // Si no se proporcionan operadores ni asignaciones, usar los datos procesados directamente
        if ((!operators || operators.length === 0) && (!operatorAssignments || Object.keys(operatorAssignments).length === 0)) {
          console.log('🔍 [AUDIT CRITICAL] Analizando operadores directamente de datos de llamadas...');
          const operatorMetrics = {};
          
          // 🔧 SOLUCIÓN INTELIGENTE: Analizar datos reales antes de filtrar
          const isValidOperatorName = (name) => {
            if (!name || typeof name !== 'string') return false;
            
            const cleanName = name.trim();
            
            // Rechazar valores muy obvios que no son nombres
            if (cleanName.length < 2) return false;
            
            // 🚨 RECHAZAR ESTADOS DE LLAMADAS ESPECÍFICOS (más específico)
            if (/^(sin respuesta|llamado exitoso|ocupado|no contesta|busy|answered|no answer|hangup|ringing|failed|success)$/i.test(cleanName)) {
              console.log(`❌ [AUDIT CRITICAL] Estado de llamada rechazado: "${cleanName}"`);
              return false;
            }
            
            // Rechazar valores técnicos obvios
            if (/^(no|si|n\/a|na|null|undefined|pendiente|solo)$/i.test(cleanName)) {
              console.log(`❌ [AUDIT CRITICAL] Valor técnico rechazado: "${cleanName}"`);
              return false;
            }
            
            // Rechazar fechas y horas
            if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(cleanName)) return false; // Fechas
            if (/^\d{1,2}:\d{2}/.test(cleanName)) return false; // Horas
            if (/^\d+$/.test(cleanName)) return false; // Solo números
            
            // ✅ ENFOQUE MÁS PERMISIVO: Si contiene letras y no es estado, probablemente es nombre
            if (/^[A-Za-záéíóúüñÁÉÍÓÚÜÑ\s\-\.']{2,}$/.test(cleanName)) {
              // Si tiene al menos una letra, probablemente es un nombre
              if (/[A-Za-záéíóúüñÁÉÍÓÚÜÑ]/.test(cleanName)) {
                console.log(`✅ [AUDIT CRITICAL] Nombre VÁLIDO detectado: "${cleanName}"`);
                return true;
              }
            }
            
            console.log(`❌ [AUDIT CRITICAL] Nombre RECHAZADO: "${cleanName}" (no parece nombre de persona)`);
            return false;
          };
          
          console.log('🔍 [AUDIT CRITICAL] === EXTRAYENDO OPERADORES DE LLAMADAS ===');
          
          // Crear métricas basadas solo en los datos de llamadas
          processedData.forEach((call, index) => {
            // Intentar obtener el operador de diferentes campos posibles
            let operatorName = call.operador || call.operator || call.teleoperadora || call.agente;
            
            if (index < 5) { // Debug primeros 5
              console.log(`🔍 [AUDIT CRITICAL] Llamada ${index}: operador="${operatorName}", beneficiario="${call.beneficiario}"`);
            }
            
            // Validar que el operador no sea un beneficiario ni un valor inválido
            if (!isValidOperatorName(operatorName) || 
                operatorName === call.beneficiario || 
                operatorName === call.beneficiary) {
              
              if (index < 5 && operatorName) {
                console.log(`🔍 [AUDIT CRITICAL] Llamada ${index}: Operador "${operatorName}" rechazado - será "No identificado"`);
              }
              operatorName = 'No identificado';
            } else if (index < 5) {
              console.log(`� [AUDIT CRITICAL] Llamada ${index}: Operador "${operatorName}" ACEPTADO`);
            }
            
            if (!operatorMetrics[operatorName]) {
              operatorMetrics[operatorName] = {
                operador: operatorName,
                totalLlamadas: 0,
                llamadasExitosas: 0,
                tiempoTotal: 0,
                promedioLlamada: 0
              };
              console.log('🔍 [AUDIT CRITICAL] Inicializada métrica para:', operatorName);
            }
            
            const metrics = operatorMetrics[operatorName];
            metrics.totalLlamadas++;
            if (call.categoria === 'exitosa' || call.resultado === 'Llamado exitoso') {
              metrics.llamadasExitosas++;
            }
            metrics.tiempoTotal += call.duracion || 0;
          });
          
          console.log('🔍 [AUDIT CRITICAL] === OPERADORES FINALES ENCONTRADOS ===');
          Object.keys(operatorMetrics).forEach((operatorName, index) => {
            console.log(`${index + 1}. "${operatorName}": ${operatorMetrics[operatorName].totalLlamadas} llamadas`);
          });
          
          // Calcular promedios
          Object.values(operatorMetrics).forEach(metrics => {
            metrics.promedioLlamada = metrics.totalLlamadas > 0 ? 
              Math.round(metrics.tiempoTotal / metrics.totalLlamadas) : 0;
          });
          
          const result = Object.values(operatorMetrics);
          console.log('🎯 [AUDIT CRITICAL] RESULTADO FINAL:', result.length, 'operadores con métricas');
          return result;
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
        console.log('🔍 getFollowUpData iniciando con assignments:', assignments);
        console.log('🔍 getFollowUpData - processedData:', processedData?.length, 'llamadas');
        
        if (!processedData || processedData.length === 0) {
          console.log('❌ No hay processedData disponible');
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
        
        // Función auxiliar para parsear fechas chilenas correctamente
        const parseChileanDate = (dateStr) => {
          if (!dateStr || dateStr === 'N/A') return null;
          
          try {
            // Si es formato chileno DD-MM-YYYY o DD/MM/YYYY
            if (typeof dateStr === 'string' && /^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(dateStr)) {
              const [day, month, year] = dateStr.split(/[-\/]/);
              return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            
            // Si es número (Excel serial date)
            if (typeof dateStr === 'number') {
              return new Date((dateStr - 25569) * 86400 * 1000);
            }
            
            // Fallback a Date normal
            return new Date(dateStr);
          } catch (error) {
            console.warn('Error parseando fecha:', dateStr, error);
            return null;
          }
        };
        
        const beneficiaryStatus = {};

        // Analizar estado de cada beneficiario
        processedData.forEach(call => {
          // Usar los nombres de campos correctos del procesamiento de Excel
          const beneficiary = call.beneficiario || call.beneficiary;
          const result = call.resultado || call.result || (call.categoria === 'exitosa' ? 'Llamado exitoso' : 'Llamado fallido');
          const date = call.fecha || call.date;
          
          // 🔍 DEBUG: Análisis específico para Sara Esquivel Miranda
          if (beneficiary && beneficiary.includes('Sara')) {
            console.log('🔍 SARA DEBUG - Procesando llamada:', {
              beneficiary: beneficiary,
              date: date,
              result: result,
              rawCall: call
            });
          }
          
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

          // Mantener la llamada más reciente usando parseador correcto
          const currentDate = parseChileanDate(date);
          const lastDate = parseChileanDate(beneficiaryStatus[beneficiary].lastDate);
          
          // 🔍 DEBUG: Análisis específico para Sara
          if (beneficiary && beneficiary.includes('Sara')) {
            console.log('🔍 SARA DEBUG - Comparación de fechas CORREGIDA:', {
              beneficiary: beneficiary,
              currentDateString: date,
              currentDateParsed: currentDate,
              currentDateValid: currentDate !== null,
              lastDateString: beneficiaryStatus[beneficiary].lastDate,
              lastDateParsed: lastDate,
              lastDateValid: lastDate !== null,
              currentIsNewer: currentDate && lastDate ? currentDate > lastDate : false,
              willUpdate: currentDate && (!lastDate || currentDate > lastDate)
            });
          }
          
          if (currentDate && (!lastDate || currentDate > lastDate)) {
            beneficiaryStatus[beneficiary].lastResult = result;
            beneficiaryStatus[beneficiary].lastDate = date;
            
            // 🔍 DEBUG: Confirmación de actualización para Sara
            if (beneficiary && beneficiary.includes('Sara')) {
              console.log('🔍 SARA DEBUG - Fecha actualizada CORREGIDA:', {
                beneficiary: beneficiary,
                newLastDate: date,
                newLastResult: result,
                totalCalls: beneficiaryStatus[beneficiary].calls.length
              });
            }
          }
        });

        // Generar datos de seguimiento
        const result = Object.values(beneficiaryStatus).map(item => {
          console.log('🔍 Procesando beneficiario:', item.beneficiary);
          
          // 🔍 DEBUG: Análisis completo para Sara
          if (item.beneficiary && item.beneficiary.includes('Sara')) {
            console.log('🔍 SARA DEBUG - Análisis completo:', {
              beneficiary: item.beneficiary,
              totalCalls: item.calls.length,
              lastDate: item.lastDate,
              lastResult: item.lastResult,
              allDates: item.calls.map(c => c.fecha || c.date),
              sortedDates: item.calls.map(c => c.fecha || c.date).sort(),
              uniqueDates: [...new Set(item.calls.map(c => c.fecha || c.date))]
            });
            
            // Encontrar manualmente la fecha más reciente
            const allDates = item.calls.map(c => c.fecha || c.date).filter(d => d && d !== 'N/A');
            console.log('🔍 SARA DEBUG - Todas las fechas sin filtrar:', allDates);
            
            // Intentar ordenar las fechas manualmente
            const parsedDates = allDates.map(dateStr => {
              if (typeof dateStr === 'string' && /^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
                const [day, month, year] = dateStr.split('-');
                return {
                  original: dateStr,
                  parsed: new Date(year, month - 1, day),
                  timestamp: new Date(year, month - 1, day).getTime()
                };
              } else {
                return {
                  original: dateStr,
                  parsed: new Date(dateStr),
                  timestamp: new Date(dateStr).getTime()
                };
              }
            }).filter(d => !isNaN(d.timestamp));
            
            parsedDates.sort((a, b) => b.timestamp - a.timestamp);
            console.log('🔍 SARA DEBUG - Fechas ordenadas manualmente:', parsedDates);
            
            if (parsedDates.length > 0) {
              console.log('🔍 SARA DEBUG - Fecha más reciente encontrada:', parsedDates[0].original);
            }
          }
          
          // 🔧 MEJORA: Buscar asignación de manera más robusta y flexible
          let assignment = null;
          
          if (assignments && Array.isArray(assignments)) {
            console.log('🔍 Buscando assignment para:', item.beneficiary);
            console.log('📋 Total assignments disponibles:', assignments.length);
            
            // Buscar por diferentes campos posibles con coincidencia flexible
            assignment = assignments.find(a => {
              const assignmentBeneficiary = (a.beneficiary || a.beneficiario || '').trim();
              const itemBeneficiary = (item.beneficiary || '').trim();
              
              // Log de comparación detallada
              console.log(`🔍 Comparando: "${assignmentBeneficiary}" vs "${itemBeneficiary}"`);
              
              // Coincidencia exacta (case sensitive)
              if (assignmentBeneficiary === itemBeneficiary) {
                console.log('✅ Coincidencia exacta encontrada');
                return true;
              }
              
              // Coincidencia exacta (case insensitive)
              if (assignmentBeneficiary.toLowerCase() === itemBeneficiary.toLowerCase()) {
                console.log('✅ Coincidencia exacta (case insensitive) encontrada');
                return true;
              }
              
              // Coincidencia parcial para casos de variaciones menores
              const assignmentLower = assignmentBeneficiary.toLowerCase();
              const itemLower = itemBeneficiary.toLowerCase();
              
              if (assignmentLower && itemLower && 
                  (assignmentLower.includes(itemLower) || 
                   itemLower.includes(assignmentLower))) {
                console.log('✅ Coincidencia parcial encontrada');
                return true;
              }
              
              return false;
            });
            
            if (assignment) {
              console.log('✅ Assignment encontrado para', item.beneficiary, ':', assignment);
            } else {
              console.log('❌ No se encontró assignment para:', item.beneficiary);
              console.log('📋 Assignments disponibles:', assignments?.map(a => ({
                beneficiary: a.beneficiary || a.beneficiario,
                operator: a.operator || a.operatorName
              })));
              console.log('🔍 Comparación detallada para:', item.beneficiary);
              assignments?.forEach((a, index) => {
                const assignmentBeneficiary = (a.beneficiary || a.beneficiario || '').trim().toLowerCase();
                const itemBeneficiary = (item.beneficiary || '').trim().toLowerCase();
                console.log(`  [${index}] "${assignmentBeneficiary}" vs "${itemBeneficiary}" - Exacta: ${assignmentBeneficiary === itemBeneficiary}`);
              });
            }
          } else {
            console.log('⚠️ No hay assignments array disponible');
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

          // 🔧 CORRECCIÓN: Obtener información de la operadora SOLO de las asignaciones
          let operatorName = 'No Asignado'; // Cambio: Mostrar "No Asignado" en lugar de "Sin asignar"
          let phone = 'N/A';
          let commune = 'N/A';
          
          if (assignment) {
            // ✅ ÚNICA FUENTE: Obtener SOLO de las asignaciones (fuente confiable)
            console.log('🔍 Assignment encontrado para', item.beneficiary, ':', assignment);
            
            const candidateOperator = assignment.operator || 
                                    assignment.operador || 
                                    assignment.operatorName ||
                                    assignment.teleoperadora ||
                                    assignment.name;
            
            console.log('🔍 Candidate operator:', candidateOperator);
            
            // Validar que el operador sea válido (no es un resultado de llamada)
            if (candidateOperator && 
                candidateOperator !== 'Solo HANGUP' && 
                candidateOperator !== 'HANGUP' &&
                candidateOperator !== 'No identificado' &&
                candidateOperator !== 'Llamado exitoso' &&  // ⭐ NUEVO: Filtrar resultados de llamada
                candidateOperator !== 'Llamado fallido' &&  // ⭐ NUEVO: Filtrar resultados de llamada
                candidateOperator !== 'exitosa' &&          // ⭐ NUEVO: Filtrar resultados de llamada
                candidateOperator !== 'fallida' &&          // ⭐ NUEVO: Filtrar resultados de llamada
                candidateOperator.trim().length > 2 &&
                !/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(candidateOperator)) {
              operatorName = candidateOperator;
              console.log('✅ Operadora asignada encontrada:', operatorName);
            } else {
              console.log('❌ Operadora inválida filtrada:', candidateOperator);
            }
            
            // Obtener teléfono y comuna de la asignación
            phone = assignment.phone || 
                   assignment.telefono || 
                   assignment.primaryPhone ||
                   assignment.numero_cliente || 
                   'N/A';
            
            commune = assignment.commune || 
                     assignment.comuna || 
                     'N/A';
          } else {
            console.log('⚠️ No hay asignación para beneficiario:', item.beneficiary);
          }
          
          // 🚫 ELIMINADO: Prioridad 2 que buscaba en datos de llamadas
          // Esto causaba que apareciera "Llamado exitoso" en lugar del nombre de la operadora

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
          
          // 🔍 DEBUG: Resultado final para Sara
          if (item.beneficiary && item.beneficiary.includes('Sara')) {
            console.log('🔍 SARA DEBUG - Resultado final:', result);
          }
          
          return result;
        });
        
        console.log('📊 Total de beneficiarios en seguimiento:', result.length);
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
