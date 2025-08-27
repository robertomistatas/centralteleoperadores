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

      // 🚀 SISTEMA ROBUSTO: Conexión Asignaciones ↔ Llamadas por Teléfono
      getOperatorMetrics: (operatorAssignments = null) => {
        try {
          const { callData } = get();
          
          console.log('🔍 SISTEMA ROBUSTO - Análisis por teléfono:');
          console.log('- callData length:', callData?.length || 0);
          console.log('- operatorAssignments length:', operatorAssignments?.length || 0);
          
          if (!callData || callData.length === 0) {
            console.log('❌ No hay datos de llamadas');
            return [];
          }

          if (!operatorAssignments || !Array.isArray(operatorAssignments) || operatorAssignments.length === 0) {
            console.log('❌ No hay asignaciones válidas');
            return [];
          }

          // 🔑 PASO 1: Crear mapa de teléfono → operadora
          const phoneToOperator = {};
          let totalPhonesProcessed = 0;
          
          operatorAssignments.forEach(assignment => {
            const operatorName = assignment.operator || assignment.operatorName || 'Sin Asignar';
            
            // Extraer todos los números posibles de cada asignación
            const phones = [];
            
            // Números individuales
            if (assignment.phone) phones.push(assignment.phone);
            if (assignment.primaryPhone) phones.push(assignment.primaryPhone);
            if (assignment.telefono) phones.push(assignment.telefono);
            if (assignment.numero_cliente) phones.push(assignment.numero_cliente);
            
            // Array de teléfonos
            if (assignment.phones && Array.isArray(assignment.phones)) {
              phones.push(...assignment.phones);
            }
            
            // Teléfonos separados por punto y coma
            if (assignment.phone && assignment.phone.includes(';')) {
              phones.push(...assignment.phone.split(';').map(p => p.trim()));
            }
            if (assignment.primaryPhone && assignment.primaryPhone.includes(';')) {
              phones.push(...assignment.primaryPhone.split(';').map(p => p.trim()));
            }
            
            // Procesar cada teléfono
            phones.forEach(phone => {
              if (phone && phone !== 'N/A' && phone.trim()) {
                const cleanPhone = phone.toString().replace(/[^\d]/g, ''); // Solo números
                if (cleanPhone.length >= 8) { // Mínimo 8 dígitos
                  const phoneKey = cleanPhone.slice(-8); // Últimos 8 dígitos para normalizar
                  phoneToOperator[phoneKey] = operatorName;
                  totalPhonesProcessed++;
                }
              }
            });
          });
          
          console.log(`� Teléfonos procesados: ${totalPhonesProcessed}`);
          console.log(`📱 Mapa teléfono-operadora creado con ${Object.keys(phoneToOperator).length} entradas`);
          console.log('📋 Primeros 5 mapeos:', Object.entries(phoneToOperator).slice(0, 5));

          // 🔑 PASO 2: Inicializar métricas por operadora
          const operatorNames = [...new Set(Object.values(phoneToOperator))];
          const operatorMetrics = {};
          
          operatorNames.forEach(operatorName => {
            operatorMetrics[operatorName] = {
              operatorName,
              totalCalls: 0,
              successfulCalls: 0,
              failedCalls: 0,
              totalDuration: 0,
              matchedCalls: 0 // Para debugging
            };
          });
          
          console.log(`👩‍💼 Operadoras inicializadas: ${operatorNames.join(', ')}`);

          // 🔑 PASO 3: Analizar cada llamada y asignar a operadora
          let callsMatched = 0;
          let callsUnmatched = 0;
          
          callData.forEach((call, index) => {
            // Extraer número de la llamada
            const callPhone = call.phone || call.telefono || call.numero || call.numero_cliente || call.numero_telefono || '';
            
            if (callPhone && callPhone.trim()) {
              const cleanCallPhone = callPhone.toString().replace(/[^\d]/g, '');
              
              if (cleanCallPhone.length >= 8) {
                const phoneKey = cleanCallPhone.slice(-8);
                const assignedOperator = phoneToOperator[phoneKey];
                
                if (assignedOperator && operatorMetrics[assignedOperator]) {
                  callsMatched++;
                  const metrics = operatorMetrics[assignedOperator];
                  metrics.totalCalls++;
                  metrics.matchedCalls++;
                  
                  // Analizar duración
                  const duration = parseInt(call.duration || call.duracion || 0);
                  metrics.totalDuration += duration;
                  
                  // Analizar resultado de la llamada
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
                  
                  // Log cada 500 llamadas procesadas
                  if (index % 500 === 0) {
                    console.log(`📞 Procesando llamada ${index}: ${callPhone} → ${assignedOperator}`);
                  }
                } else {
                  callsUnmatched++;
                  if (callsUnmatched <= 5) { // Solo mostrar los primeros 5 no coincidentes
                    console.log(`❓ Llamada sin asignación: ${callPhone} (${phoneKey})`);
                  }
                }
              }
            }
          });
          
          console.log(`📊 RESULTADOS DEL PROCESAMIENTO:`);
          console.log(`- Total llamadas: ${callData.length}`);
          console.log(`- Llamadas coincidentes: ${callsMatched}`);
          console.log(`- Llamadas sin asignación: ${callsUnmatched}`);
          console.log(`- Porcentaje de cobertura: ${((callsMatched / callData.length) * 100).toFixed(1)}%`);

          // 🔑 PASO 4: Generar resultado final con verificación matemática
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
                Math.round((metrics.successfulCalls / metrics.totalCalls) * 100) : 0,
              matchedCalls: metrics.matchedCalls // Para debugging
            }))
            .sort((a, b) => b.totalCalls - a.totalCalls);

          // 🔍 VERIFICACIÓN MATEMÁTICA FINAL
          const totalOperatorCalls = result.reduce((sum, op) => sum + op.totalCalls, 0);
          const totalOperatorSuccess = result.reduce((sum, op) => sum + op.successfulCalls, 0);
          const totalOperatorFailed = result.reduce((sum, op) => sum + op.failedCalls, 0);
          
          console.log(`\n✅ VERIFICACIÓN MATEMÁTICA:`);
          console.log(`- Total sistema: ${callData.length} llamadas`);
          console.log(`- Total operadoras: ${totalOperatorCalls} llamadas`);
          console.log(`- Exitosas operadoras: ${totalOperatorSuccess}`);
          console.log(`- Fallidas operadoras: ${totalOperatorFailed}`);
          console.log(`- Suma verifica: ${totalOperatorSuccess + totalOperatorFailed === totalOperatorCalls ? '✅' : '❌'}`);
          console.log(`- Cobertura: ${((totalOperatorCalls / callData.length) * 100).toFixed(1)}%`);
          
          console.log(`\n📋 MÉTRICAS FINALES POR OPERADORA:`);
          result.forEach(op => {
            console.log(`- ${op.operatorName}: ${op.totalCalls} llamadas, ${op.successfulCalls} exitosas (${op.successRate}%), ${op.failedCalls} fallidas`);
          });

          return result;

        } catch (error) {
          console.error('❌ Error en getOperatorMetrics:', error);
          console.error('Stack trace:', error.stack);
          return [];
        }
      },

      // FUNCIÓN ANTERIOR PRESERVADA COMO FALLBACK
      getOperatorMetricsOld: (operatorAssignments = null) => {
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
