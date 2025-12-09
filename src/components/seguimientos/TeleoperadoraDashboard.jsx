import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Search,
  Plus,
  Calendar,
  FileText,
  Activity,
  Target,
  Award,
  Timer,
  Download
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { useCallStore, useAppStore, useDashboardStore, USER_ROLES } from '../../stores';
import { useSeguimientosStore } from '../../stores/useSeguimientosStore';
import usePermissions from '../../hooks/usePermissions';
import { seguimientoService } from '../../services/seguimientoService';
import MetricCard from './MetricCard';
import BeneficiaryCard from './BeneficiaryCard';
import NewContactForm from './NewContactForm';

/**
 * Dashboard principal para módulo "Seguimientos Periódicos"
 * Permite a teleoperadoras gestionar sus beneficiarios asignados
 * y registrar contactos con reglas de 15/30 días
 */
const TeleoperadoraDashboard = () => {
  const { user: authUser } = useAuth();
  const { user, isAdmin } = usePermissions(); // Usar usePermissions para obtener rol correcto
  const { operators, getAllAssignments, getAssignmentsByEmail } = useAppStore();
  const { callData, getOperatorMetrics } = useCallStore();
  const { 
    addSeguimiento, 
    initializeSubscription, 
    clearStore 
  } = useSeguimientosStore();
  
  // ✅ NUEVO: Usar store persistente para datos del dashboard
  const {
    beneficiarios,
    seguimientos,
    isLoading,
    dataLoaded,
    lastLoadedEmail,
    setBeneficiarios,
    setSeguimientos,
    setIsLoading,
    setDataLoaded,
    needsReload,
    invalidateCache,
    clearDashboard
  } = useDashboardStore();

  // ✅ SIMPLIFICADO: Usar solo el perfil de usePermissions (ya está sincronizado)
  // NO necesitamos useUserSync aquí porque usePermissions ya maneja la sincronización

  // Estados locales de UI (no necesitan persistir)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de la UI
  const [activeFilter, setActiveFilter] = useState('todos'); // todos, al-dia, pendientes, urgentes

  // ✅ Usar datos del perfil de usePermissions
  const currentOperatorName = isAdmin ? 'Administrador' : (user?.displayName || user?.name || user?.email);
  const currentOperatorEmail = user?.email || authUser?.email;

  console.log('👤 Perfil actual sincronizado:', {
    email: currentOperatorEmail,
    nombre: currentOperatorName,
    hasUser: !!user,
    isAdmin
  });

  // ✅ CORRECCIÓN CRÍTICA: Escuchar cambios en CallStore para invalidar caché
  useEffect(() => {
    // Suscribirse a cambios en el CallStore
    const unsubscribe = useCallStore.subscribe((state) => {
      // Si cambia lastUpdated, significa que se cargaron nuevos datos del Excel
      if (state.lastUpdated) {
        console.log('🔄 [DASHBOARD] Detectado cambio en CallStore, invalidando caché...');
        // Invalidar caché para forzar recarga
        invalidateCache();
      }
    });

    return unsubscribe;
  }, []); // ✅ FIX: Array vacío para evitar rerenders infinitos

  // Cargar datos iniciales - CON PERSISTENCIA INTELIGENTE
  useEffect(() => {
    if (!user) return;
    
    const currentEmail = user?.email || authUser?.email;
    console.log('📊 Usuario autenticado, verificando datos...');
    console.log('🔍 Rol detectado:', user.role, 'Es admin:', isAdmin);
    console.log('📧 Email actual:', currentEmail);
    
    // Inicializar el store de seguimientos para sincronización en tiempo real
    initializeSubscription(user.uid || authUser.uid);
    
    // ✅ CORRECCIÓN: Verificar también la timestamp del CallStore
    const { lastUpdated: callStoreLastUpdated } = useCallStore.getState();
    const needsReloadDueToNewData = callStoreLastUpdated && (!dataLoaded || !lastLoadedEmail);
    
    // ✅ VERIFICAR SI NECESITAMOS RECARGAR usando el store persistente
    if (!needsReload(currentEmail) && !needsReloadDueToNewData) {
      console.log('✅ [DASHBOARD] Datos válidos en caché:', {
        beneficiarios: beneficiarios.length,
        seguimientos: seguimientos.length,
        email: currentEmail,
        callStoreUpdated: callStoreLastUpdated
      });
      setIsLoading(false);
      return; // Ya tenemos datos válidos para este usuario
    }
    
    // Si llegamos aquí, necesitamos cargar datos
    console.log('📥 [DASHBOARD] Cargando datos frescos para:', currentEmail, 
                needsReloadDueToNewData ? '(nuevos datos en CallStore)' : '');
    loadDashboardData();

    // ✅ NO limpiar el store al desmontar - mantener datos en caché
    // Esto evita que las métricas se reseteen al volver al dashboard
    return () => {
      console.log('📊 [DASHBOARD] Componente desmontado - datos PERSISTEN en store');
      // clearDashboard(); // NO LIMPIAR - mantener datos entre navegaciones
    };
  }, [user?.uid, authUser?.uid]); // ✅ FIX: Remover dataLoaded y lastLoadedEmail para evitar loop infinito

  /**
   * Carga todos los datos necesarios para el dashboard - CONEXIÓN DIRECTA A FIREBASE + EXCEL
   */
  const loadDashboardData = async () => {
    if (!user) {
      console.log('❌ No hay usuario autenticado');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('🔍 Cargando datos para:', authUser?.email, '(rol:', user?.role, ')');
      
      // 1. Obtener seguimientos manuales de Firebase
      const seguimientosFirebase = await seguimientoService.getSeguimientos(user.uid);
      console.log('📋 Seguimientos Firebase:', seguimientosFirebase.length);
      
      // 2. Obtener datos del Excel procesados (Historial de Seguimientos)
      // ✅ CORRECCIÓN CRÍTICA: Esperar a que las asignaciones estén disponibles
      const { getFollowUpData } = useCallStore.getState();
      let assignmentsToUse = getAllAssignments();
      
      // Si no hay asignaciones en el store, cargarlas desde Firebase directamente
      if (!assignmentsToUse || assignmentsToUse.length === 0) {
        console.warn('⚠️ No hay asignaciones en el store, recargando desde Firebase...');
        // Forzar recarga de datos del App.jsx
        if (typeof window !== 'undefined' && window.location) {
          // Dar tiempo para que App.jsx cargue los datos
          await new Promise(resolve => setTimeout(resolve, 500));
          assignmentsToUse = getAllAssignments();
        }
      }
      
      console.log('📦 Asignaciones disponibles para getFollowUpData:', assignmentsToUse.length);
      const seguimientosExcel = getFollowUpData(assignmentsToUse);
      console.log('📊 Seguimientos del Excel:', seguimientosExcel.length);
      
      let beneficiariosAsignados = [];
      
      if (isAdmin) {
        // Admin ve todos - usar store
        const allAssignments = getAllAssignments();
        beneficiariosAsignados = allAssignments;
        console.log('👑 Admin - Total:', beneficiariosAsignados.length);
      } else {
        // 🔥 TELEOPERADORA - CONSULTA DIRECTA A FIREBASE
        console.log('👤 Consultando Firebase directamente para teleoperadora:', user?.email);
        
        try {
          // Importar servicios de Firebase directamente
          const { operatorService, assignmentService } = await import('../../firestoreService');
          
          // 1. Obtener todos los operadores desde Firebase
          console.log('� Obteniendo operadores desde Firebase...');
          const operatorsFromFirebase = await operatorService.getAll();
          console.log('✅ Operadores obtenidos desde Firebase:', operatorsFromFirebase.length);
          
          // 2. Buscar operador que coincida con el usuario autenticado
          const userEmail = user?.email?.toLowerCase().trim();
          
          const matchingOperator = operatorsFromFirebase.find(op => {
            const opEmail = op.email?.toLowerCase().trim();
            const exactMatch = opEmail === userEmail;
            
            console.log(`🔍 Verificando operador ${op.name}:`, {
              opEmail,
              userEmail,
              exactMatch
            });
            
            return exactMatch;
          });
          
          if (matchingOperator) {
            console.log('✅ Operador encontrado en Firebase:', matchingOperator);
            
            // 3. Obtener todas las asignaciones desde Firebase
            console.log('📥 Obteniendo asignaciones desde Firebase...');
            const allAssignmentsFromFirebase = await assignmentService.getAll();
            console.log('✅ Asignaciones obtenidas desde Firebase:', allAssignmentsFromFirebase.length);
            
            // 4. Filtrar asignaciones de este operador específico
            const operatorAssignments = allAssignmentsFromFirebase.filter(assignment => 
              assignment.operatorId === matchingOperator.id
            );
            
            console.log(`🔍 DEBUGGING FILTRO - Buscando asignaciones para operatorId: ${matchingOperator.id}`);
            console.log('📋 Primeras 3 asignaciones de Firebase:', allAssignmentsFromFirebase.slice(0, 3));
            console.log('🔍 Estructura de primera asignación:', allAssignmentsFromFirebase[0]);
            
            // 🔧 DEBUGGING: Verificar todos los operatorId disponibles
            const allOperatorIds = [...new Set(allAssignmentsFromFirebase.map(a => a.operatorId))];
            console.log('📊 Todos los operatorId en Firebase:', allOperatorIds);
            console.log('🎯 Buscando operatorId:', matchingOperator.id);
            console.log('✅ ¿Existe el operatorId?', allOperatorIds.includes(matchingOperator.id));
            
            // 🔧 FALLBACK: Si no hay coincidencias por operatorId, intentar por nombre
            let finalAssignments = operatorAssignments;
            
            if (operatorAssignments.length === 0) {
              console.log('⚠️ No se encontraron asignaciones por operatorId, intentando búsqueda por nombre...');
              
              finalAssignments = allAssignmentsFromFirebase.filter(assignment => {
                const assignmentOperatorName = assignment.operator || assignment.operatorName || '';
                const matchingOperatorName = matchingOperator.name || '';
                
                const nameMatch = assignmentOperatorName.toLowerCase().includes(matchingOperatorName.toLowerCase()) ||
                                matchingOperatorName.toLowerCase().includes(assignmentOperatorName.toLowerCase());
                
                if (nameMatch) {
                  console.log('✅ Coincidencia por nombre:', {
                    assignmentOperator: assignmentOperatorName,
                    matchingOperator: matchingOperatorName
                  });
                }
                
                return nameMatch;
              });
              
              console.log(`🔄 Asignaciones encontradas por nombre: ${finalAssignments.length}`);
            }
            
            console.log(`✅ Asignaciones finales para ${matchingOperator.name}:`, finalAssignments.length);
            
            // 5. Mapear a formato esperado por el dashboard
            beneficiariosAsignados = finalAssignments.map(assignment => ({
              id: assignment.id,
              operator: matchingOperator.name,
              operatorName: matchingOperator.name,
              operatorEmail: matchingOperator.email,
              beneficiary: assignment.beneficiary,
              primaryPhone: assignment.primaryPhone || assignment.phone,
              commune: assignment.commune
            }));
            
            console.log(`🎯 RESULTADO FINAL: ${beneficiariosAsignados.length} beneficiarios para dashboard de ${matchingOperator.name}`);
            
          } else {
            console.warn('❌ No se encontró operador en Firebase para:', authUser?.email);
            
            // Mostrar operadores disponibles para debugging
            console.log('👥 Operadores disponibles en Firebase:', operatorsFromFirebase.map(op => ({
              name: op.name,
              email: op.email,
              id: op.id
            })));
          }
          
        } catch (firebaseError) {
          console.error('❌ Error consultando Firebase directamente:', firebaseError);
          
          // Fallback: intentar usar store como última opción
          console.log('🔄 Fallback: intentando usar store...');
          const { operators: currentOperators, operatorAssignments } = useAppStore.getState();
          
          if (currentOperators.length > 0) {
            console.log('📊 Store tiene operadores, usando fallback...');
            const userEmail = authUser?.email?.toLowerCase().trim();
            
            const matchingOperator = currentOperators.find(op => 
              op.email?.toLowerCase().trim() === userEmail
            );
            
            if (matchingOperator) {
              const assignments = operatorAssignments[matchingOperator.id] || [];
              beneficiariosAsignados = assignments.map(assignment => ({
                id: assignment.id,
                operator: matchingOperator.name,
                operatorName: matchingOperator.name,
                operatorEmail: matchingOperator.email,
                beneficiary: assignment.beneficiary,
                primaryPhone: assignment.primaryPhone || assignment.phone,
                commune: assignment.commune
              }));
              console.log(`✅ Fallback exitoso: ${beneficiariosAsignados.length} asignaciones`);
            }
          }
        }
      }

      // 3. Combinar seguimientos: Firebase + Excel filtrados por teleoperadora
      let seguimientosCombinados = [...seguimientosFirebase];
      
      if (!isAdmin) {
        // Para teleoperadora: filtrar seguimientos del Excel por operador
        const userEmail = user?.email?.toLowerCase().trim();
        
        console.log(`🔍 Filtrando seguimientos para: ${userEmail}`);
        console.log(`📊 Total seguimientos del Excel ANTES de filtrar: ${seguimientosExcel.length}`);
        
        // ✅ FILTRO ESTRICTO: Solo por email del operador
        let debugCount = 0;
        const seguimientosExcelFiltrados = seguimientosExcel.filter(seg => {
          const operatorEmail = seg.operatorEmail?.toLowerCase().trim();
          
          // Coincidencia EXACTA por email
          const emailMatch = operatorEmail && operatorEmail === userEmail;
          
          // Log de debug solo para los primeros 5
          if (emailMatch && debugCount < 5) {
            console.log('✅ Seguimiento VÁLIDO para esta teleoperadora:', {
              beneficiario: seg.beneficiary,
              operadorEmail: operatorEmail,
              operadorNombre: seg.operator,
              ultimaLlamada: seg.lastCall,
              llamadas: seg.callCount
            });
            debugCount++;
          }
          
          return emailMatch;
        });
        
        console.log(`🔗 Seguimientos Excel filtrados para ${userEmail}: ${seguimientosExcelFiltrados.length}`);
        
        // Verificación de datos
        if (seguimientosExcelFiltrados.length === 0) {
          console.error('❌ NO se encontraron seguimientos para este email');
          console.log('💡 Verificar que el operatorEmail en los datos del Excel sea:', userEmail);
          console.log('📋 Muestra de emails en los datos:', 
            seguimientosExcel.slice(0, 5).map(s => s.operatorEmail)
          );
        } else {
          console.log('📊 Muestra de seguimientos filtrados:', seguimientosExcelFiltrados.slice(0, 3));
        }
        
        // Convertir formato del Excel a formato compatible con Firebase
        const seguimientosExcelCompatibles = seguimientosExcelFiltrados.map((seg, index) => {
          // Determinar si es contacto exitoso basado en diferentes criterios
          const esExitoso = seg.lastCall?.toLowerCase().includes('exitoso') ||
                           seg.lastCall?.toLowerCase().includes('contactado') ||
                           seg.lastCall?.toLowerCase().includes('atendido') ||
                           seg.lastCall?.toLowerCase().includes('respondió') ||
                           seg.status === 'al-dia' ||
                           seg.callCount > 0;
          
          // Calcular fecha del contacto
          let fechaContacto;
          if (seg.lastCallDate) {
            fechaContacto = new Date(seg.lastCallDate).toISOString();
          } else if (seg.fecha) {
            fechaContacto = new Date(seg.fecha).toISOString();
          } else {
            // Usar fecha reciente para que aparezca como "al día" si es exitoso
            const fechaReciente = new Date();
            fechaReciente.setDate(fechaReciente.getDate() - (esExitoso ? 1 : 31)); // 1 día atrás si exitoso, 31 si no
            fechaContacto = fechaReciente.toISOString();
          }
          
          const seguimientoConvertido = {
            id: `excel_${seg.id || index}_${Math.random()}`,
            beneficiarioId: seg.beneficiary,
            beneficiario: seg.beneficiary,
            telefono: seg.phone || 'Sin teléfono',
            tipoContacto: 'llamada',
            tipoResultado: esExitoso ? 'exitoso' : 'no-respuesta',
            observaciones: `Registro del Excel: ${seg.lastCall || seg.status || 'Contacto registrado'}`,
            fechaContacto: fechaContacto,
            operadorEmail: user?.email,
            operadorNombre: user?.displayName || user?.email,
            source: 'excel' // Marcar como proveniente del Excel
          };
          
          // Debug específico para Sergio
          if (seg.beneficiary?.toLowerCase().includes('sergio') && 
              seg.beneficiary?.toLowerCase().includes('román')) {
            console.log('🎯 CONVERSIÓN SERGIO:', {
              original: seg,
              convertido: seguimientoConvertido
            });
          }
          
          return seguimientoConvertido;
        });
        
        seguimientosCombinados = [...seguimientosFirebase, ...seguimientosExcelCompatibles];
        console.log(`📊 Total seguimientos combinados: ${seguimientosCombinados.length} (Firebase: ${seguimientosFirebase.length}, Excel: ${seguimientosExcelCompatibles.length})`);
        
        // Debug específico para verificar Sergio Román Rojas
        const sergioSeguimientos = seguimientosCombinados.filter(s => 
          s.beneficiario?.toLowerCase().includes('sergio') && 
          s.beneficiario?.toLowerCase().includes('román')
        );
        if (sergioSeguimientos.length > 0) {
          console.log('🎯 SERGIO ROMÁN ROJAS encontrado en seguimientos:', sergioSeguimientos);
        }
      }

      setBeneficiarios(beneficiariosAsignados);
      setSeguimientos(seguimientosCombinados);
      
      // Debug final: verificar que Sergio tenga seguimientos
      console.log('🔚 VERIFICACIÓN FINAL:');
      console.log(`   Beneficiarios cargados: ${beneficiariosAsignados.length}`);
      console.log(`   Seguimientos totales: ${seguimientosCombinados.length}`);
      
      // 🎯 NUEVO: Obtener métricas reales del CallStore para verificar sincronización
      try {
        const { getOperatorMetrics } = useCallStore.getState();
        const allAssignments = getAllAssignments();
        const operatorMetrics = getOperatorMetrics(allAssignments);
        
        const userEmail = user?.email?.toLowerCase().trim();
        const currentMetrics = operatorMetrics.find(metric => {
          const metricEmail = metric.operatorInfo?.email?.toLowerCase().trim();
          return metricEmail === userEmail;
        });
        
        if (currentMetrics) {
          console.log('📊 MÉTRICAS REALES DEL CALLSTORE:');
          console.log(`   📞 Total Llamadas: ${currentMetrics.totalCalls}`);
          console.log(`   ✅ Llamadas Exitosas: ${currentMetrics.successfulCalls}`);
          console.log(`   ❌ Llamadas Fallidas: ${currentMetrics.failedCalls}`);
          console.log(`   📊 Tasa de Éxito: ${currentMetrics.successRate}%`);
          console.log(`   👥 Asignados: ${currentMetrics.assignedBeneficiaries}`);
          console.log(`   📞 Contactados: ${currentMetrics.contactedBeneficiaries}`);
          console.log(`   ⏱️ Min. Efectivos: ${currentMetrics.totalEffectiveMinutes}`);
        } else {
          console.log('⚠️ No se encontraron métricas en CallStore para este usuario');
        }
      } catch (error) {
        console.error('❌ Error verificando métricas del CallStore:', error);
      }
      
      const sergioEnBeneficiarios = beneficiariosAsignados.find(b => 
        b.beneficiary?.toLowerCase().includes('sergio') && 
        b.beneficiary?.toLowerCase().includes('román')
      );
      
      if (sergioEnBeneficiarios) {
        console.log('✅ Sergio encontrado en beneficiarios:', sergioEnBeneficiarios);
        const sergioSeguimientos = seguimientosCombinados.filter(s => 
          s.beneficiario?.toLowerCase().includes('sergio') && 
          s.beneficiario?.toLowerCase().includes('román')
        );
        console.log(`✅ Seguimientos de Sergio: ${sergioSeguimientos.length}`, sergioSeguimientos);
      } else {
        console.log('❌ Sergio NO encontrado en beneficiarios');
      }
      
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      const currentEmail = user?.email || authUser?.email;
      setIsLoading(false);
      setDataLoaded(true, currentEmail); // ✅ Marcar datos cargados con email del usuario
    }
  };

  /**
   * Guarda un nuevo seguimiento en Firebase usando el store de seguimientos
   */
  const handleSaveNewContact = async (contactData) => {
    try {
      console.log('💾 Guardando nuevo seguimiento:', contactData);
      
      // Convertir fecha a timestamp para consistencia con Firestore
      const convertToTimestamp = (dateTimeLocal) => {
        // dateTimeLocal viene como "YYYY-MM-DDTHH:mm" del input datetime-local
        const [date, time] = dateTimeLocal.split('T');
        const [year, month, day] = date.split('-');
        const [hours, minutes] = time.split(':');
        
        // Crear fecha específicamente en zona horaria de Chile
        const chileanDate = new Date();
        chileanDate.setFullYear(parseInt(year));
        chileanDate.setMonth(parseInt(month) - 1); // Los meses van de 0-11
        chileanDate.setDate(parseInt(day));
        chileanDate.setHours(parseInt(hours));
        chileanDate.setMinutes(parseInt(minutes));
        chileanDate.setSeconds(0);
        chileanDate.setMilliseconds(0);
        
        return chileanDate;
      };
      
      console.log('🕐 Fecha original:', contactData.fechaContacto);
      console.log('🇨🇱 Fecha convertida:', convertToTimestamp(contactData.fechaContacto));
      
      // Preparar datos para el store de seguimientos
      const seguimientoData = {
        beneficiarioId: contactData.beneficiarioId,
        beneficiarioNombre: contactData.beneficiario,
        telefono: contactData.telefono,
        tipoContacto: contactData.tipoContacto,
        resultado: contactData.tipoResultado, // Campo que usa el store para colores
        observaciones: contactData.observaciones,
        fechaContacto: convertToTimestamp(contactData.fechaContacto),
        operadorEmail: user?.email,
        operadorNombre: user?.displayName || user?.email
      };

      // Usar el store de seguimientos para guardar (incluye sincronización automática)
      await addSeguimiento(seguimientoData);

      console.log('✅ Seguimiento guardado exitosamente y sincronizado con calendario');
      
      // Recargar datos del dashboard local para mostrar el nuevo seguimiento
      await loadDashboardData();
      
      // Cerrar modal
      setShowNewContactForm(false);
      setSelectedBeneficiary(null);
      
    } catch (error) {
      console.error('❌ Error guardando seguimiento:', error);
      throw new Error('Error al guardar el contacto. Intenta nuevamente.');
    }
  };

  /**
   * Calcula el estado de cada beneficiario según las reglas de 15/30 días
   * ✅ CORRECCIÓN CRÍTICA: Consulta AMBAS fuentes de datos:
   *    1. Seguimientos manuales de Firebase (nuevos registros)
   *    2. Historial del Excel (datos históricos en callData)
   */
  // Función auxiliar para parsear fechas en formato chileno DD-MM-YYYY
  const parsearFechaChilena = (fechaStr) => {
    if (!fechaStr) return null;
    
    // Si ya es un objeto Date o timestamp ISO, retornarlo
    if (fechaStr instanceof Date) return fechaStr;
    if (typeof fechaStr === 'string' && fechaStr.includes('T')) {
      return new Date(fechaStr);
    }
    
    // Parsear formato DD-MM-YYYY (formato chileno del Excel)
    const partes = fechaStr.toString().split('-');
    if (partes.length === 3) {
      const dia = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10) - 1; // Meses en JS van de 0-11
      const anio = parseInt(partes[2], 10);
      return new Date(anio, mes, dia);
    }
    
    // Fallback: intentar parseo directo
    return new Date(fechaStr);
  };

  const calcularEstadoBeneficiario = (beneficiario) => {
    // 1. Obtener seguimientos manuales de Firebase
    const seguimientosBenef = seguimientos.filter(s => 
      s.beneficiarioId === beneficiario.id || 
      s.beneficiario === beneficiario.beneficiary
    );

    // 2. ✅ NUEVO: Obtener datos históricos del Excel (callData)
    // Buscar por nombre de beneficiario y/o teléfono
    const nombreBenef = (beneficiario.beneficiary || beneficiario.nombre || '').toLowerCase().trim();
    const telefonoBenef = (beneficiario.phone || beneficiario.telefono || '').replace(/\D/g, '');
    
    // ⚠️ DEBUG CRÍTICO: Verificar que callData tenga datos
    const esRosa = nombreBenef.includes('rosa') && nombreBenef.includes('aguilera');
    if (esRosa) {
      console.log('🚨 DEBUG INICIAL ROSA AGUILERA:');
      console.log('   callData existe?', !!callData);
      console.log('   callData.length:', callData?.length || 0);
      console.log('   Primeros 3 registros de callData:', callData?.slice(0, 3).map(c => ({
        beneficiario: c.beneficiario,
        telefono: c.telefono,
        resultado: c.resultado
      })));
    }
    
    const llamadasExcel = callData?.filter(call => {
      // Coincidencia por nombre
      const nombreCall = (call.beneficiario || call.beneficiary || call.nombre || '').toLowerCase().trim();
      const nombreMatch = nombreCall === nombreBenef;
      
      // Coincidencia por teléfono (últimos 8 dígitos)
      let telefonoMatch = false;
      if (telefonoBenef && telefonoBenef.length >= 8) {
        const telefonoCall = (call.telefono || call.phone || call.numero || '').toString().replace(/\D/g, '');
        if (telefonoCall.length >= 8) {
          const keyBenef = telefonoBenef.slice(-8);
          const keyCall = telefonoCall.slice(-8);
          telefonoMatch = keyBenef === keyCall;
        }
      }
      
      return nombreMatch || telefonoMatch;
    }) || [];

    
    if (esRosa) {
      console.log('🔍 DEBUG ROSA AGUILERA MESA:');
      console.log('   Beneficiario:', beneficiario.beneficiary);
      console.log('   Teléfono:', telefonoBenef);
      console.log('   Seguimientos Firebase:', seguimientosBenef.length);
      console.log('   Llamadas Excel encontradas:', llamadasExcel.length);
      if (llamadasExcel.length > 0) {
        console.log('   Primeras 3 llamadas del Excel:');
        llamadasExcel.slice(0, 3).forEach((call, i) => {
          console.log(`     ${i+1}. Fecha: ${call.fecha || call.date}, Resultado: ${call.resultado || call.result}`);
        });
      }
    }

    // 3. ✅ COMBINAR ambas fuentes de datos en un formato común
    const todosLosContactos = [];
    
    // Agregar seguimientos manuales de Firebase
    seguimientosBenef.forEach(seg => {
      todosLosContactos.push({
        fecha: seg.fechaContacto,
        resultado: seg.tipoResultado,
        esExitoso: seg.tipoResultado === 'exitoso',
        fuente: 'firebase'
      });
    });
    
    // Agregar llamadas del Excel
    llamadasExcel.forEach(call => {
      const resultado = call.resultado || call.result || call.estado || '';
      const duracion = parseInt(call.duracion || call.duration || 0);
      // Una llamada es exitosa si resultado es "Llamado exitoso" Y tiene duración > 0
      const esExitoso = (resultado === 'Llamado exitoso' || resultado === 'exitoso' || resultado === 'Exitoso') && duracion > 0;
      
      todosLosContactos.push({
        fecha: call.fecha || call.date,
        resultado: resultado,
        esExitoso: esExitoso,
        fuente: 'excel'
      });
    });

    if (esRosa) {
      console.log('   Total contactos combinados:', todosLosContactos.length);
      console.log('   Contactos exitosos:', todosLosContactos.filter(c => c.esExitoso).length);
    }

    // 4. Verificar si hay contactos
    if (todosLosContactos.length === 0) {
      if (esRosa) console.log('   ❌ Sin contactos en ninguna fuente - estado URGENTE');
      return { estado: 'urgente', ultimoContacto: null, diasSinContacto: null };
    }

    // 5. Encontrar el último contacto exitoso
    const contactosExitosos = todosLosContactos.filter(c => c.esExitoso);
    
    if (esRosa) {
      console.log('   Contactos exitosos encontrados:', contactosExitosos.length);
      contactosExitosos.slice(0, 3).forEach((c, i) => {
        console.log(`     ${i+1}. Fecha: ${c.fecha}, Fuente: ${c.fuente}`);
      });
    }
    
    if (contactosExitosos.length === 0) {
      if (esRosa) console.log('   ❌ Sin contactos exitosos - estado URGENTE');
      return { estado: 'urgente', ultimoContacto: null, diasSinContacto: null };
    }

    // 6. Ordenar por fecha y tomar el más reciente
    const ultimoContacto = contactosExitosos.sort((a, b) => {
      try {
        const fechaA = parsearFechaChilena(a.fecha);
        const fechaB = parsearFechaChilena(b.fecha);
        return fechaB - fechaA;
      } catch {
        return 0;
      }
    })[0];

    const fechaUltimoContacto = parsearFechaChilena(ultimoContacto.fecha);
    const diasSinContacto = Math.floor(
      (new Date() - fechaUltimoContacto) / (1000 * 60 * 60 * 24)
    );

    let estado;
    if (diasSinContacto <= 15) {
      estado = 'al-dia';
    } else if (diasSinContacto <= 30) {
      estado = 'pendiente';
    } else {
      estado = 'urgente';
    }
    
    if (esRosa) {
      console.log('   ✅ Último contacto exitoso:', ultimoContacto.fecha, `(fuente: ${ultimoContacto.fuente})`);
      console.log('   📅 Fecha parseada:', fechaUltimoContacto);
      console.log('   📅 Días sin contacto:', diasSinContacto);
      console.log('   🏷️ Estado final:', estado);
    }

    return {
      estado,
      ultimoContacto: ultimoContacto.fecha,
      diasSinContacto,
      totalSeguimientos: todosLosContactos.length,
      fuenteUltimoContacto: ultimoContacto.fuente // Para debugging
    };
  };

  /**
   * Métricas REALES del CallStore - Sincronizadas con Auditoría Avanzada
   */
  const metricasRealesCallStore = useMemo(() => {
    try {
      // ✅ VERIFICAR QUE NO ESTAMOS EN ESTADO DE CARGA
      if (isLoading) {
        console.log('⏳ [DASHBOARD] Datos en carga, esperando...');
        return {
          assignedBeneficiaries: 0,
          contactedBeneficiaries: 0,
          uncontactedBeneficiaries: 0,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          successRate: 0,
          totalEffectiveMinutes: 0,
          averageMinutesPerCall: 0,
          averageCallsPerBeneficiary: 0,
          hasRealData: false,
          isLoading: true
        };
      }
      
      // ✅ VALIDACIÓN SIMPLIFICADA: Solo necesitamos beneficiarios y seguimientos
      const hasValidBeneficiarios = beneficiarios && beneficiarios.length > 0;
      const hasValidSeguimientos = seguimientos && seguimientos.length > 0;
      
      console.log('🔍 [DASHBOARD] Validación de datos necesarios:', {
        isLoading,
        hasValidBeneficiarios,
        beneficiariosCount: beneficiarios?.length || 0,
        hasValidSeguimientos,
        seguimientosCount: seguimientos?.length || 0
      });
      
      // ⚠️ Si no hay beneficiarios NI seguimientos después de cargar, esperar
      if (!hasValidBeneficiarios && !hasValidSeguimientos) {
        console.log('⏳ [DASHBOARD] Sin datos disponibles aún...');
        return {
          assignedBeneficiaries: 0,
          contactedBeneficiaries: 0,
          uncontactedBeneficiaries: 0,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          successRate: 0,
          totalEffectiveMinutes: 0,
          averageMinutesPerCall: 0,
          averageCallsPerBeneficiary: 0,
          hasRealData: false
        };
      }
      
      // ✅ Si tenemos beneficiarios, calcular métricas básicas
      const totalBeneficiarios = beneficiarios?.length || 0;
      const totalSeguimientos = seguimientos?.length || 0;
      
      console.log('📊 [DASHBOARD] Calculando métricas con:', {
        totalBeneficiarios,
        totalSeguimientos
      });
      
      // ✅ CALCULAR MÉTRICAS DESDE SEGUIMIENTOS
      // ✅ SOLUCIÓN: Usar getOperatorMetrics del CallStore para consistencia con panel de admin
      const userEmail = user?.email?.toLowerCase().trim();
      
      // Obtener métricas reales del CallStore (mismo método que usa el panel de admin)
      const { getOperatorMetrics } = useCallStore.getState();
      const allAssignments = getAllAssignments();
      const operatorMetrics = getOperatorMetrics(allAssignments);
      
      console.log(`🔍 Buscando métricas para: ${userEmail}`);
      console.log(`📊 Total operadores en CallStore: ${operatorMetrics.length}`);
      
      // Buscar las métricas de esta teleoperadora específica por EMAIL o NOMBRE
      const currentMetrics = operatorMetrics.find(metric => {
        const metricEmail = metric.operatorInfo?.email?.toLowerCase().trim();
        const operatorName = metric.operatorName?.toLowerCase().trim();
        const userName = user?.displayName?.toLowerCase().trim();
        
        // Coincidencia por email (más confiable)
        const emailMatch = metricEmail && metricEmail === userEmail;
        
        // Coincidencia por nombre (fallback)
        const nameMatch = operatorName && userName && (
          operatorName === userName ||
          operatorName.includes(userName) ||
          userName.includes(operatorName)
        );
        
        if (emailMatch || nameMatch) {
          console.log(`✅ Match encontrado:`, {
            email: metricEmail,
            nombre: operatorName,
            matchType: emailMatch ? 'email' : 'nombre'
          });
        }
        
        return emailMatch || nameMatch;
      });
      
      if (currentMetrics) {
        console.log('📊 [DASHBOARD] Métricas REALES del CallStore:', {
          operador: currentMetrics.operatorName,
          asignados: currentMetrics.assignedBeneficiaries,
          contactados: currentMetrics.contactedBeneficiaries,
          cobertura: currentMetrics.coverageRate + '%',
          totalLlamadas: currentMetrics.totalCalls,
          exitosas: currentMetrics.successfulCalls,
          fallidas: currentMetrics.failedCalls,
          tasaExito: currentMetrics.successRate + '%'
        });
        
        return {
          assignedBeneficiaries: currentMetrics.assignedBeneficiaries,
          contactedBeneficiaries: currentMetrics.contactedBeneficiaries,
          uncontactedBeneficiaries: currentMetrics.pendingBeneficiaries,
          totalCalls: currentMetrics.totalCalls,
          successfulCalls: currentMetrics.successfulCalls,
          failedCalls: currentMetrics.failedCalls,
          successRate: currentMetrics.successRate,
          coverageRate: currentMetrics.coverageRate,
          totalEffectiveMinutes: currentMetrics.totalEffectiveMinutes,
          averageMinutesPerCall: Math.round(currentMetrics.averageDuration / 60),
          averageCallsPerBeneficiary: currentMetrics.assignedBeneficiaries > 0 ? 
            Math.round((currentMetrics.totalCalls / currentMetrics.assignedBeneficiaries) * 10) / 10 : 0,
          hasRealData: true
        };
      } else {
        console.warn('⚠️ [DASHBOARD] NO se encontraron métricas en CallStore para:', {
          userEmail,
          userName: user?.displayName,
          operatorsEnCallStore: operatorMetrics.map(m => m.operatorName)
        });
        
        // Fallback: calcular manualmente (método antiguo)
        console.log('📊 [DASHBOARD] Usando método de cálculo manual como fallback');
        
        // Calcular métricas manualmente desde seguimientos
        let totalLlamadas = 0;
        let llamadasExitosas = 0;
        let beneficiariosContactados = new Set();
        
        seguimientos.forEach(seg => {
          totalLlamadas++;
          const benefId = seg.beneficiarioId || seg.beneficiario || seg.id;
          if (benefId) {
            beneficiariosContactados.add(String(benefId).toUpperCase());
          }
          if (seg.tipoResultado === 'exitoso' || 
              seg.estado === 'exitoso' ||
              seg.resultado === 'exitoso') {
            llamadasExitosas++;
          }
        });
        
        const contactados = beneficiariosContactados.size;
        const sinContactar = totalBeneficiarios - contactados;
        const tasaExito = totalLlamadas > 0 ? Math.round((llamadasExitosas / totalLlamadas) * 100) : 0;
        
        console.log('📊 [DASHBOARD] Métricas calculadas manualmente (fallback):', {
          totalBeneficiarios,
          contactados,
          sinContactar,
          totalLlamadas,
          llamadasExitosas,
          tasaExito
        });
        
        return {
          assignedBeneficiaries: totalBeneficiarios,
          contactedBeneficiaries: contactados,
          uncontactedBeneficiaries: sinContactar,
          totalCalls: totalLlamadas,
          successfulCalls: llamadasExitosas,
          failedCalls: totalLlamadas - llamadasExitosas,
          successRate: tasaExito,
          totalEffectiveMinutes: 0,
          averageMinutesPerCall: 0,
          averageCallsPerBeneficiary: totalBeneficiarios > 0 ? Math.round((totalLlamadas / totalBeneficiarios) * 10) / 10 : 0,
          hasRealData: true
        };
      }
    } catch (error) {
      console.error('❌ [DASHBOARD] Error obteniendo métricas reales:', error);
      return {
        assignedBeneficiaries: beneficiarios.length,
        contactedBeneficiaries: 0,
        uncontactedBeneficiaries: beneficiarios.length,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        successRate: 0,
        totalEffectiveMinutes: 0,
        averageMinutesPerCall: 0,
        averageCallsPerBeneficiary: 0,
        hasRealData: false
      };
    }
  }, [isLoading, beneficiarios, seguimientos, currentOperatorEmail, currentOperatorName]);

  /**
   * Métricas calculadas del dashboard basadas en estado de seguimientos
   */
  const metricas = useMemo(() => {
    const beneficiariosConEstado = beneficiarios.map(benef => ({
      ...benef,
      ...calcularEstadoBeneficiario(benef)
    }));

    const alDia = beneficiariosConEstado.filter(b => b.estado === 'al-dia').length;
    const pendientes = beneficiariosConEstado.filter(b => b.estado === 'pendiente').length;
    const urgentes = beneficiariosConEstado.filter(b => b.estado === 'urgente').length;

    return {
      // Usar métricas REALES del CallStore
      total: metricasRealesCallStore.assignedBeneficiaries,
      contactados: metricasRealesCallStore.contactedBeneficiaries,
      sinContactar: metricasRealesCallStore.uncontactedBeneficiaries,
      
      // Métricas de seguimiento (15/30 días)
      alDia,
      pendientes,
      urgentes,
      
      // Métricas de llamadas reales
      totalLlamadas: metricasRealesCallStore.totalCalls,
      llamadasExitosas: metricasRealesCallStore.successfulCalls,
      llamadasFallidas: metricasRealesCallStore.failedCalls,
      tasaExito: metricasRealesCallStore.successRate,
      minutosEfectivos: metricasRealesCallStore.totalEffectiveMinutes,
      
      // Lista con estado
      beneficiariosConEstado,
      
      // Flag de datos reales
      tieneDataExcel: metricasRealesCallStore.hasRealData
    };
  }, [beneficiarios, seguimientos, metricasRealesCallStore]);

  /**
   * Beneficiarios filtrados según búsqueda y filtro activo
   */
  const beneficiariosFiltrados = useMemo(() => {
    let filtered = metricas.beneficiariosConEstado;

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(benef =>
        benef.beneficiary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        benef.primaryPhone?.includes(searchTerm) ||
        benef.commune?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por estado
    if (activeFilter !== 'todos') {
      filtered = filtered.filter(benef => {
        if (activeFilter === 'al-dia') return benef.estado === 'al-dia';
        if (activeFilter === 'pendientes') return benef.estado === 'pendiente';
        if (activeFilter === 'urgentes') return benef.estado === 'urgente';
        return true;
      });
    }

    return filtered;
  }, [metricas.beneficiariosConEstado, searchTerm, activeFilter]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-teal-600" />
                <h1 className="text-2xl font-bold text-gray-900">Seguimientos Periódicos</h1>
              </div>
              <p className="text-gray-600 mt-1">
                Cartera de beneficiarios - {currentOperatorEmail}
              </p>
            </div>

            {/* Botones de debug */}
            <div className="flex items-center gap-2">
              <motion.button
                onClick={async () => {
                  console.log('🔧 DEBUG COMPLETO - Estado actual:');
                  
                  console.log('👤 Usuario autenticado:', {
                    email: user?.email,
                    displayName: user?.displayName,
                    uid: user?.uid
                  });
                  
                  // Consultar Firebase directamente para debug
                  try {
                    const { operatorService, assignmentService } = await import('../../firestoreService');
                    
                    const operatorsFromFirebase = await operatorService.getAll();
                    console.log('� Operadores en Firebase:', operatorsFromFirebase.length, operatorsFromFirebase);
                    
                    const assignmentsFromFirebase = await assignmentService.getAll();
                    console.log('📊 Asignaciones en Firebase:', assignmentsFromFirebase.length);
                    
                  // Buscar Javiera específicamente
                  const javiera = operatorsFromFirebase.find(op => 
                    op.email?.toLowerCase().includes('javiera') || 
                    op.email?.toLowerCase() === 'reyesalvaradojaviera@gmail.com'
                  );
                  
                  if (javiera) {
                    console.log('✅ Javiera encontrada en Firebase:', javiera);
                    
                    // 🔍 DEBUGGING CRÍTICO: Examinar estructura de asignaciones
                    console.log('🔍 ESTRUCTURA DE ASIGNACIONES - Analizando...');
                    console.log('📊 Total asignaciones en Firebase:', assignmentsFromFirebase.length);
                    
                    // Mostrar diferentes operatorId existentes
                    const uniqueOperatorIds = [...new Set(assignmentsFromFirebase.map(a => a.operatorId))];
                    console.log('📋 OperatorIDs únicos en Firebase:', uniqueOperatorIds);
                    console.log('🎯 OperatorID de Javiera buscado:', javiera.id);
                    
                    // Verificar si hay asignaciones con el operatorId de Javiera
                    const javieraByOperatorId = assignmentsFromFirebase.filter(a => a.operatorId === javiera.id);
                    console.log(`📊 Asignaciones con operatorId ${javiera.id}:`, javieraByOperatorId.length);
                    
                    // Verificar si hay asignaciones por nombre de operador
                    const javieraByName = assignmentsFromFirebase.filter(a => {
                      const assignmentOperator = a.operator || a.operatorName || '';
                      return assignmentOperator.toLowerCase().includes('javiera') || 
                             assignmentOperator.toLowerCase().includes('reyes');
                    });
                    console.log('� Asignaciones con nombre "Javiera" o "Reyes":', javieraByName.length);
                    
                    // Mostrar estructura de las primeras asignaciones
                    console.log('🔍 ESTRUCTURA - Primeras 3 asignaciones:', assignmentsFromFirebase.slice(0, 3));
                    
                    // Verificar estructura específica de una asignación
                    if (assignmentsFromFirebase.length > 0) {
                      const sampleAssignment = assignmentsFromFirebase[0];
                      console.log('🔍 CAMPOS DE ASIGNACIÓN DISPONIBLES:', Object.keys(sampleAssignment));
                      console.log('🔍 ASIGNACIÓN COMPLETA EJEMPLO:', sampleAssignment);
                    }
                    
                    // Buscar asignaciones de Javiera de todas las formas posibles
                    const possibleJavieraAssignments = assignmentsFromFirebase.filter(assignment => {
                      const operatorId = assignment.operatorId;
                      const operator = assignment.operator || '';
                      const operatorName = assignment.operatorName || '';
                      const userId = assignment.userId;
                      
                      return operatorId === javiera.id ||
                             operator.toLowerCase().includes('javiera') ||
                             operator.toLowerCase().includes('reyes') ||
                             operatorName.toLowerCase().includes('javiera') ||
                             operatorName.toLowerCase().includes('reyes') ||
                             userId === javiera.id;
                    });
                    
                    console.log('🎯 ASIGNACIONES POSIBLES DE JAVIERA (todos los métodos):', possibleJavieraAssignments.length);
                    if (possibleJavieraAssignments.length > 0) {
                      console.log('✅ Primeras 3 asignaciones encontradas:', possibleJavieraAssignments.slice(0, 3));
                    }
                    
                  } else {
                    console.log('❌ Javiera NO encontrada en Firebase');
                  }                  } catch (error) {
                    console.error('❌ Error consultando Firebase:', error);
                  }
                  
                  // Estado del store local
                  const { operators, operatorAssignments } = useAppStore.getState();
                  console.log('� Store - Operadores:', operators.length);
                  console.log('📦 Store - Asignaciones:', Object.keys(operatorAssignments).length);
                  
                  console.log('📋 Beneficiarios cargados en dashboard:', beneficiarios.length);
                  
                  // Recargar datos
                  console.log('� Recargando dashboard...');
                  await loadDashboardData();
                }}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg transition-colors shadow-sm text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <AlertTriangle className="w-4 h-4" />
                Debug
              </motion.button>

              <motion.button
                onClick={async () => {
                  console.log('🔄 RECARGA COMPLETA - Firebase + Dashboard...');
                  setIsLoading(true);
                  try {
                    // Cargar store (para admin y compatibilidad)
                    const { loadOperators, loadAssignments } = useAppStore.getState();
                    await loadOperators();
                    await loadAssignments();
                    
                    // Cargar dashboard (consulta directa Firebase para teleoperadoras)
                    await loadDashboardData();
                    
                  } catch (error) {
                    console.error('❌ Error en recarga completa:', error);
                  }
                  setIsLoading(false);
                }}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors shadow-sm text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Download className="w-4 h-4" />
                Cargar Firebase
              </motion.button>

              <motion.button
                onClick={async () => {
                  console.log('🔍 DIAGNÓSTICO COMPLETO DE MATCHING - Analizando por qué no encuentra asignaciones para Javiera');
                  
                  // 1. Info del usuario actual
                  console.log('👤 USUARIO ACTUAL:', {
                    email: user?.email,
                    displayName: user?.displayName,
                    uid: user?.uid,
                    fullUser: user
                  });
                  
                  // 2. Verificar operadores directamente desde Firebase
                  console.log('� VERIFICANDO OPERADORES DIRECTAMENTE DESDE FIREBASE...');
                  try {
                    const { operatorService, assignmentService } = await import('../../firestoreService');
                    
                    const operatorsFromFirebase = await operatorService.getAll();
                    console.log('� OPERADORES DESDE FIREBASE DIRECTO:', operatorsFromFirebase.length, operatorsFromFirebase);
                    
                    const assignmentsFromFirebase = await assignmentService.getAll();
                    console.log('� ASIGNACIONES DESDE FIREBASE DIRECTO:', assignmentsFromFirebase.length);
                    
                    // Verificar si Javiera está entre los operadores
                    const javieraInFirebase = operatorsFromFirebase.find(op => 
                      op.email?.toLowerCase().includes('javiera') || 
                      op.name?.toLowerCase().includes('javiera') ||
                      op.email?.toLowerCase() === 'reyesalvaradojaviera@gmail.com'
                    );
                    
                    if (javieraInFirebase) {
                      console.log('✅ JAVIERA ENCONTRADA EN FIREBASE:', javieraInFirebase);
                      
                      // Buscar sus asignaciones
                      const javieraAssignments = assignmentsFromFirebase.filter(a => a.operatorId === javieraInFirebase.id);
                      console.log(`✅ ASIGNACIONES DE JAVIERA: ${javieraAssignments.length}`, javieraAssignments.slice(0, 3));
                      
                    } else {
                      console.warn('❌ JAVIERA NO ENCONTRADA EN FIREBASE');
                      console.log('� OPERADORES DISPONIBLES EN FIREBASE:', operatorsFromFirebase.map(op => ({
                        id: op.id,
                        name: op.name,
                        email: op.email
                      })));
                    }
                    
                  } catch (firebaseError) {
                    console.error('❌ Error accediendo Firebase directo:', firebaseError);
                  }
                  
                  // 3. Operadores en Store (el problema actual)
                  const { operators: currentOperators, operatorAssignments } = useAppStore.getState();
                  console.log('📦 OPERADORES EN STORE:', currentOperators.length, currentOperators);
                  console.log('📦 ASIGNACIONES EN STORE:', Object.keys(operatorAssignments).length, operatorAssignments);
                  
                  // 4. Forzar recarga del store
                  console.log('🔄 FORZANDO RECARGA DEL STORE...');
                  const { loadOperators, loadAssignments } = useAppStore.getState();
                  
                  await loadOperators();
                  await loadAssignments();
                  
                  // Verificar después de la recarga
                  const { operators: newOperators } = useAppStore.getState();
                  console.log('📦 OPERADORES DESPUÉS DE RECARGA:', newOperators.length, newOperators);
                  
                  if (newOperators.length > 0) {
                    console.log('✅ OPERADORES CARGADOS, RECARGANDO DASHBOARD...');
                    setTimeout(() => {
                      loadDashboardData();
                    }, 500);
                  }
                }}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg transition-colors shadow-sm text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Search className="w-4 h-4" />
                Diagnóstico
              </motion.button>

              <motion.button
                onClick={() => setShowNewContactForm(true)}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4" />
                Nuevo Contacto
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Métricas Principales - Datos Reales del Excel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Beneficiarios"
            value={metricas.total}
            subtitle="Mis beneficiarios asignados"
            icon={Users}
            color="blue"
          />
          <MetricCard
            title="Contactados"
            value={metricas.contactados}
            subtitle="Beneficiarios con contacto"
            percentage={metricas.total > 0 ? Math.round((metricas.contactados / metricas.total) * 100) : 0}
            icon={CheckCircle}
            color="green"
          />
          <MetricCard
            title="Sin Contactar"
            value={metricas.sinContactar}
            subtitle="Sin contacto registrado"
            percentage={metricas.total > 0 ? Math.round((metricas.sinContactar / metricas.total) * 100) : 0}
            icon={Clock}
            color="orange"
          />
          <MetricCard
            title="Urgentes"
            value={metricas.urgentes}
            subtitle="+30 días sin contacto"
            percentage={metricas.total > 0 ? Math.round((metricas.urgentes / metricas.total) * 100) : 0}
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* Métricas de Llamadas - Si hay datos del Excel */}
        {metricas.tieneDataExcel && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <MetricCard
              title="Total Llamadas"
              value={metricas.totalLlamadas}
              subtitle="Llamadas registradas"
              icon={Phone}
              color="purple"
            />
            <MetricCard
              title="Min. Efectivos"
              value={metricas.minutosEfectivos}
              subtitle={`${metricasRealesCallStore.averageMinutesPerCall} min/llamada`}
              icon={Clock}
              color="teal"
            />
          </div>
        )}

        {/* Alerta si NO hay datos del Excel */}
        {!metricas.tieneDataExcel && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-900">Sin datos de llamadas del Excel</p>
                <p className="text-sm text-yellow-700">
                  Las métricas de llamadas no están disponibles. Por favor, contacta al administrador para cargar el archivo Excel con tu historial de llamadas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar beneficiario, teléfono o comuna..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {[
                { key: 'todos', label: 'Todos', color: 'teal' },
                { key: 'al-dia', label: 'Al Día', color: 'green' },
                { key: 'pendientes', label: 'Pendientes', color: 'yellow' },
                { key: 'urgentes', label: 'Urgentes', color: 'red' }
              ].map(filter => (
                <motion.button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeFilter === filter.key
                      ? `bg-${filter.color}-100 text-${filter.color}-800 border border-${filter.color}-300`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {filter.label}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de beneficiarios */}
        {beneficiarios.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              🔍 No se encontraron asignaciones para tu usuario
            </h3>
            <div className="text-yellow-700 space-y-1">
              <p><strong>Usuario:</strong> {user?.email}</p>
              <p><strong>Nombre mostrado:</strong> {user?.displayName || 'No definido'}</p>
              <p><strong>Nombre de operadora buscado:</strong> {user?.email}</p>
              <p><strong>Total de asignaciones en sistema:</strong> {getAllAssignments().length}</p>
            </div>
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-yellow-800 font-medium">🔍 Ver operadoras disponibles</summary>
              <div className="mt-2 text-sm space-y-1">
                {operators.map(op => (
                  <div key={op.id} className="bg-yellow-100 p-2 rounded border">
                    <p><strong>Nombre:</strong> {op.name}</p>
                    <p><strong>Email:</strong> {op.email}</p>
                    <p><strong>Asignaciones:</strong> {useAppStore.getState().operatorAssignments[op.id]?.length || 0}</p>
                  </div>
                ))}
              </div>
            </details>
            <motion.button
              onClick={async () => {
                console.log('🔄 Recarga simple de datos...');
                await loadDashboardData();
              }}
              className="mt-4 flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg mx-auto transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="w-4 h-4" />
              Recargar asignaciones
            </motion.button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {beneficiariosFiltrados.map(beneficiario => {
                // Filtrar seguimientos específicos de este beneficiario
                const seguimientosBeneficiario = seguimientos.filter(seg => 
                  seg.beneficiarioId === beneficiario.id || 
                  seg.beneficiario === beneficiario.beneficiary
                );
                
                return (
                  <motion.div
                    key={beneficiario.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <BeneficiaryCard
                      beneficiario={beneficiario}
                      seguimientos={seguimientosBeneficiario}
                      onNewContact={() => {
                        setSelectedBeneficiary(beneficiario);
                        setShowNewContactForm(true);
                      }}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Footer con información */}
        {beneficiarios.length > 0 && (
          <div className="mt-8 text-center text-gray-500 text-sm">
            Mostrando {beneficiariosFiltrados.length} de {beneficiarios.length} beneficiarios
          </div>
        )}
      </div>

      {/* Modal para nuevo contacto */}
      <AnimatePresence>
        {showNewContactForm && (
          <NewContactForm
            beneficiario={selectedBeneficiary}
            beneficiarios={beneficiarios}
            onClose={() => {
              setShowNewContactForm(false);
              setSelectedBeneficiary(null);
            }}
            onSave={handleSaveNewContact}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeleoperadoraDashboard;