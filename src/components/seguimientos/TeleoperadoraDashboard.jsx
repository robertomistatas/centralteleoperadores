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
import { useCallStore, useAppStore, USER_ROLES } from '../../stores';
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
  const { callData } = useCallStore();
  const { 
    addSeguimiento, 
    initializeSubscription, 
    clearStore 
  } = useSeguimientosStore();

  // Estados principales
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [seguimientos, setSeguimientos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de la UI
  const [activeFilter, setActiveFilter] = useState('todos'); // todos, al-dia, pendientes, urgentes

  // Usar datos de usePermissions que ya tiene la lógica de admin corregida
  const currentOperatorName = isAdmin ? 'Administrador' : user?.displayName || user?.email;

  // Cargar datos iniciales - DIRECTO DESDE FIREBASE
  useEffect(() => {
    if (user) {
      console.log('📊 Usuario autenticado, cargando datos directamente desde Firebase...');
      console.log('🔍 Rol detectado:', user.role, 'Es admin:', isAdmin);
      
      // Inicializar el store de seguimientos para sincronización en tiempo real
      initializeSubscription(user.uid || authUser.uid);
      
      loadDashboardData();
    }

    // Cleanup al desmontar el componente
    return () => {
      clearStore();
    };
  }, [user?.uid || authUser?.uid, initializeSubscription, clearStore, isAdmin]);

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
      const { getFollowUpData } = useCallStore.getState();
      const assignmentsToUse = getAllAssignments();
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
        const seguimientosExcelFiltrados = seguimientosExcel.filter(seg => {
          const operatorEmail = seg.operatorEmail?.toLowerCase().trim();
          const operatorMatch = operatorEmail === userEmail || 
                               seg.operator?.toLowerCase().includes(user?.displayName?.toLowerCase() || '') ||
                               seg.operator?.toLowerCase().includes('javiera') || // Temporal para Javiera
                               seg.operator?.toLowerCase().includes('reyes');
          
          if (operatorMatch) {
            console.log('📞 Seguimiento del Excel para esta teleoperadora:', {
              beneficiario: seg.beneficiary,
              operador: seg.operator,
              ultimaLlamada: seg.lastCall
            });
          }
          
          return operatorMatch;
        });
        
        console.log(`🔗 Seguimientos Excel filtrados para ${user?.email}:`, seguimientosExcelFiltrados.length);
        
        // Debug: mostrar muestra de datos del Excel
        if (seguimientosExcelFiltrados.length > 0) {
          console.log('📊 Muestra de seguimientos del Excel:', seguimientosExcelFiltrados.slice(0, 3));
          
          // Específico para Sergio
          const sergioExcel = seguimientosExcelFiltrados.find(s => 
            s.beneficiary?.toLowerCase().includes('sergio') && 
            s.beneficiary?.toLowerCase().includes('román')
          );
          if (sergioExcel) {
            console.log('🎯 SERGIO en datos Excel:', sergioExcel);
          }
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
      setIsLoading(false);
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
   */
  const calcularEstadoBeneficiario = (beneficiario) => {
    const seguimientosBenef = seguimientos.filter(s => 
      s.beneficiarioId === beneficiario.id || 
      s.beneficiario === beneficiario.beneficiary
    );

    // Debug específico para Sergio Román Rojas
    const esSergio = beneficiario.beneficiary?.toLowerCase().includes('sergio') && 
                    beneficiario.beneficiary?.toLowerCase().includes('román');
    
    if (esSergio) {
      console.log('🎯 DEBUG SERGIO ROMÁN ROJAS:');
      console.log('   Beneficiario:', beneficiario.beneficiary);
      console.log('   ID:', beneficiario.id);
      console.log('   Seguimientos encontrados:', seguimientosBenef.length);
      console.log('   Seguimientos:', seguimientosBenef);
      console.log('   Total seguimientos disponibles:', seguimientos.length);
    }

    if (seguimientosBenef.length === 0) {
      if (esSergio) console.log('   ❌ Sin seguimientos - estado URGENTE');
      return { estado: 'urgente', ultimoContacto: null, diasSinContacto: null };
    }

    // Encontrar el último contacto exitoso
    const contactosExitosos = seguimientosBenef.filter(s => s.tipoResultado === 'exitoso');
    
    if (esSergio) {
      console.log('   Contactos exitosos:', contactosExitosos.length);
      contactosExitosos.forEach(c => console.log('     -', c.fechaContacto, c.tipoResultado));
    }
    
    if (contactosExitosos.length === 0) {
      if (esSergio) console.log('   ❌ Sin contactos exitosos - estado URGENTE');
      return { estado: 'urgente', ultimoContacto: null, diasSinContacto: null };
    }

    const ultimoContacto = contactosExitosos.sort((a, b) => 
      new Date(b.fechaContacto) - new Date(a.fechaContacto)
    )[0];

    const diasSinContacto = Math.floor(
      (new Date() - new Date(ultimoContacto.fechaContacto)) / (1000 * 60 * 60 * 24)
    );

    let estado;
    if (diasSinContacto <= 15) {
      estado = 'al-dia';
    } else if (diasSinContacto <= 30) {
      estado = 'pendiente';
    } else {
      estado = 'urgente';
    }
    
    if (esSergio) {
      console.log('   ✅ Último contacto:', ultimoContacto.fechaContacto);
      console.log('   📅 Días sin contacto:', diasSinContacto);
      console.log('   🏷️ Estado final:', estado);
    }

    return {
      estado,
      ultimoContacto: ultimoContacto.fechaContacto,
      diasSinContacto,
      totalSeguimientos: seguimientosBenef.length
    };
  };

  /**
   * Métricas calculadas del dashboard
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
      total: beneficiarios.length,
      alDia,
      pendientes,
      urgentes,
      beneficiariosConEstado
    };
  }, [beneficiarios, seguimientos]);

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
                Cartera de beneficiarios - {user?.email || currentOperatorName}
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
        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Beneficiarios"
            value={metricas.total}
            subtitle="Mis beneficiarios asignados"
            icon={Users}
            color="blue"
          />
          <MetricCard
            title="Al Día"
            value={metricas.alDia}
            subtitle="Contacto últimos 15 días"
            percentage={metricas.total > 0 ? Math.round((metricas.alDia / metricas.total) * 100) : 0}
            icon={CheckCircle}
            color="green"
          />
          <MetricCard
            title="Pendientes"
            value={metricas.pendientes}
            subtitle="16-30 días sin contacto"
            percentage={metricas.total > 0 ? Math.round((metricas.pendientes / metricas.total) * 100) : 0}
            icon={Clock}
            color="yellow"
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