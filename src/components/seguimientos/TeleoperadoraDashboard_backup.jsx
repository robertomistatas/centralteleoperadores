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
  const { user } = useAuth();
  const { operators, getAllAssignments, getAssignmentsByEmail } = useAppStore();
  const { callData } = useCallStore();

  // Estados principales
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [seguimientos, setSeguimientos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de la UI
  const [activeFilter, setActiveFilter] = useState('todos'); // todos, al-dia, pendientes, urgentes

  // Determinar si el usuario es admin o teleoperadora
  const isAdmin = user?.role === USER_ROLES.ADMIN || user?.email?.includes('admin');
  const currentOperatorName = isAdmin ? 'Administrador' : user?.displayName || user?.email;

  // Cargar datos iniciales - SIMPLIFICADO para evitar bucles
  useEffect(() => {
    if (user) {
      console.log('📊 Usuario autenticado, iniciando carga de datos...');
      loadDashboardData();
    }
  }, [user?.uid]); // Solo depender del UID del usuario

  // 🔄 Cargar datos desde Firebase - SIMPLIFICADO
  useEffect(() => {
    const loadFirebaseData = async () => {
      if (!user?.uid) return;
      
      try {
        console.log('🔄 Cargando datos desde Firebase...');
        const { loadOperators, loadAssignments } = useAppStore.getState();
        
        await loadOperators();
        await loadAssignments();
        
        // Una sola recarga después de Firebase
        setTimeout(() => {
          loadDashboardData();
        }, 1000);
        
      } catch (error) {
        console.error('❌ Error cargando Firebase:', error);
      }
    };

    // Solo ejecutar una vez cuando se monta el componente
    loadFirebaseData();
  }, []); // Sin dependencias para evitar bucles

  /**
   * Carga todos los datos necesarios para el dashboard - SIMPLIFICADO
   */
  const loadDashboardData = async () => {
    if (!user) {
      console.log('❌ No hay usuario autenticado');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('🔍 Cargando datos para:', user?.email);
      
      // Obtener datos del store
      const { operators: currentOperators, operatorAssignments } = useAppStore.getState();
      const seguimientosData = await seguimientoService.getSeguimientos(user.uid);
      
      let beneficiariosAsignados = [];
      
      if (isAdmin) {
        // Admin ve todos
        const allAssignments = getAllAssignments();
        beneficiariosAsignados = allAssignments;
        console.log('👑 Admin - Total:', beneficiariosAsignados.length);
      } else {
        // Teleoperadora - buscar sus asignaciones
        console.log('👤 Buscando asignaciones para teleoperadora:', user?.email);
        
        // Buscar operador por email exacto
        const matchingOperator = currentOperators.find(op => 
          op.email?.toLowerCase() === user?.email?.toLowerCase()
        );
        
        if (matchingOperator) {
          const assignments = operatorAssignments[matchingOperator.id] || [];
          beneficiariosAsignados = assignments.map(assignment => ({
            id: assignment.id,
            operator: matchingOperator.name,
            operatorName: matchingOperator.name,
            operatorEmail: matchingOperator.email,
            beneficiary: assignment.beneficiary,
            primaryPhone: assignment.primaryPhone,
            commune: assignment.commune
          }));
          console.log(`✅ Encontradas ${beneficiariosAsignados.length} asignaciones para ${matchingOperator.name}`);
        } else {
          console.warn('❌ No se encontró operador para:', user?.email);
          console.log('👥 Operadores disponibles:', currentOperators.map(op => op.email));
        }
      }

      setBeneficiarios(beneficiariosAsignados);
      setSeguimientos(seguimientosData);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };
      
      // Primero asegurar que tenemos datos frescos de Firebase
      const { operators: currentOperators, operatorAssignments } = useAppStore.getState();
      
      // Si no hay operadores cargados, esperar a que se carguen
      if (currentOperators.length === 0) {
        console.log('⏳ No hay operadores cargados, esperando...');
        return; // Salir y esperar a que se carguen los datos
      }
      
      // Obtener asignaciones y seguimientos
      const assignments = getAllAssignments();
      const seguimientosData = await seguimientoService.getSeguimientos(user.uid);
      
      console.log('🔍 loadDashboardData - Datos disponibles:', {
        operatorsCount: currentOperators.length,
        totalAssignments: assignments.length,
        userEmail: user?.email,
        isAdmin: isAdmin
      });
      
      // Filtrar beneficiarios según el rol
      let beneficiariosAsignados = [];
      
      if (isAdmin) {
        // Admin ve todos los beneficiarios
        beneficiariosAsignados = assignments;
        console.log('👑 Admin - Mostrando todas las asignaciones:', beneficiariosAsignados.length);
      } else {
        // 🎯 TELEOPERADORA: Filtrar solo sus asignaciones
        console.log('� Teleoperadora - Filtrando asignaciones para:', user?.email);
        
        // Método 1: Usar getAssignmentsByEmail
        beneficiariosAsignados = getAssignmentsByEmail(user?.email);
        console.log(`✅ Método getAssignmentsByEmail encontró: ${beneficiariosAsignados.length} asignaciones`);
        
        // Método 2: Si no encuentra nada, buscar directamente en operatorAssignments
        if (beneficiariosAsignados.length === 0) {
          console.log('🔄 Método alternativo: Buscar en operatorAssignments...');
          
          // Buscar operador por email
          const matchingOperator = currentOperators.find(op => {
            const emailMatch = op.email?.toLowerCase() === user?.email?.toLowerCase();
            const nameMatch = user?.email?.toLowerCase().includes(op.name?.toLowerCase().split(' ')[0]) ||
                             user?.email?.toLowerCase().includes(op.name?.toLowerCase().split(' ')[1]);
            
            console.log(`🔍 Verificando operador ${op.name} (${op.email}):`, { emailMatch, nameMatch });
            return emailMatch || nameMatch;
          });
          
          if (matchingOperator) {
            console.log('✅ Operador encontrado:', matchingOperator);
            const operatorAssignments = operatorAssignments[matchingOperator.id] || [];
            
            beneficiariosAsignados = operatorAssignments.map(assignment => ({
              id: assignment.id,
              operator: matchingOperator.name,
              operatorName: matchingOperator.name,
              operatorEmail: matchingOperator.email,
              beneficiary: assignment.beneficiary,
              primaryPhone: assignment.primaryPhone,
              commune: assignment.commune
            }));
            
            console.log(`✅ Método alternativo encontró: ${beneficiariosAsignados.length} asignaciones`);
          }
        }
        
        // Si aún no encuentra nada, mostrar debug
        if (beneficiariosAsignados.length === 0) {
          console.warn('⚠️ NO SE ENCONTRARON ASIGNACIONES PARA:', user?.email);
          console.warn('🔍 Operadores disponibles:', currentOperators.map(op => ({
            id: op.id,
            name: op.name,
            email: op.email,
            assignmentsCount: operatorAssignments[op.id]?.length || 0
          })));
          
          // No mostrar todos los beneficiarios, mantener array vacío
          beneficiariosAsignados = [];
        }
      }

      console.log(`📊 Resultado final: ${beneficiariosAsignados.length} beneficiarios para ${user?.email}`);
      
      setBeneficiarios(beneficiariosAsignados);
      setSeguimientos(seguimientosData);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setIsLoading(false);
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

    if (seguimientosBenef.length === 0) {
      return { estado: 'urgente', ultimoContacto: null, diasSinContacto: null };
    }

    // Encontrar el último contacto exitoso
    const contactosExitosos = seguimientosBenef.filter(s => s.tipoResultado === 'exitoso');
    
    if (contactosExitosos.length === 0) {
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
        switch (activeFilter) {
          case 'al-dia': return benef.estado === 'al-dia';
          case 'pendientes': return benef.estado === 'pendiente';
          case 'urgentes': return benef.estado === 'urgente';
          default: return true;
        }
      });
    }

    return filtered;
  }, [metricas.beneficiariosConEstado, searchTerm, activeFilter]);

  /**
   * Maneja el registro de un nuevo contacto
   */
  const handleNewContact = async (contactData) => {
    try {
      await seguimientoService.createSeguimiento(user.uid, {
        ...contactData,
        operadorId: user.uid,
        operador: currentOperatorName,
        fechaContacto: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      // Recargar datos
      await loadDashboardData();
      setShowNewContactForm(false);
      setSelectedBeneficiary(null);
    } catch (error) {
      console.error('Error registrando contacto:', error);
    }
  };

  // Animaciones de Framer Motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin"></div>
          <span className="text-gray-600">Cargando seguimientos...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-teal-600" />
              Seguimientos Periódicos
            </h1>
            <p className="text-gray-600 mt-1">
              {isAdmin 
                ? 'Vista administrativa de todos los seguimientos' 
                : `Cartera de beneficiarios - ${currentOperatorName}`
              }
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <motion.button
              onClick={async () => {
                console.log('🔧 DEBUG MANUAL - Información completa del usuario:', {
                  user,
                  currentOperatorName,
                  isAdmin,
                  totalAssignments: getAllAssignments().length,
                  filteredBeneficiarios: beneficiarios.length
                });
                console.log('🔧 DEBUG MANUAL - Recargando datos...');
                loadDashboardData();
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
                console.log('🔄 FORZANDO CARGA DESDE FIREBASE...');
                setIsLoading(true);
                try {
                  const { loadOperators, loadAssignments } = useAppStore.getState();
                  
                  console.log('📥 Cargando operadores...');
                  await loadOperators();
                  
                  console.log('📥 Cargando asignaciones...');
                  await loadAssignments();
                  
                  console.log('🔄 Recargando dashboard...');
                  setTimeout(() => {
                    loadDashboardData();
                  }, 500);
                  
                } catch (error) {
                  console.error('❌ Error forzando carga:', error);
                } finally {
                  setIsLoading(false);
                }
              }}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors shadow-sm text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="w-4 h-4" />
              Cargar Firebase
            </motion.button>

            <motion.button
              onClick={() => {
                console.log('🔧 DEBUG CRÍTICO - Estado completo de la aplicación:');
                
                // 1. Estado Zustand
                const { operators: zOperators, operatorAssignments: zAssignments } = useAppStore.getState();
                console.log('📊 ZUSTAND STATE:', {
                  operators: zOperators,
                  operatorAssignments: zAssignments,
                  operatorsLength: zOperators?.length || 0,
                  assignmentsKeys: Object.keys(zAssignments || {})
                });
                
                // 2. Estado local desde App.jsx (acceder al contexto global si es posible)
                console.log('📊 BUSCANDO ESTADO LOCAL...');
                
                // 3. Debug manual de Firebase
                import('../../firestoreService').then(({ operatorService, assignmentService }) => {
                  console.log('🔥 PROBANDO ACCESO DIRECTO A FIREBASE...');
                  
                  operatorService.getAll().then(operators => {
                    console.log('🔥 OPERADORES DIRECTO DESDE FIREBASE:', operators);
                  }).catch(error => {
                    console.error('❌ Error operadores Firebase:', error);
                  });
                  
                  assignmentService.getAll().then(assignments => {
                    console.log('🔥 ASIGNACIONES DIRECTO DESDE FIREBASE:', assignments);
                  }).catch(error => {
                    console.error('❌ Error asignaciones Firebase:', error);
                  });
                });
              }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors shadow-sm text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <AlertTriangle className="w-4 h-4" />
              Debug Crítico
            </motion.button>

            <motion.button
              onClick={() => {
                console.log('🔍 DEBUG FILTRADO EMAIL - Analizando por qué muestra todos los beneficiarios:');
                
                // 1. Info del usuario actual
                const currentUserEmail = user?.email;
                const currentUserName = user?.displayName;
                console.log('👤 Usuario actual:', {
                  email: currentUserEmail,
                  displayName: currentUserName,
                  fullUser: user
                });
                
                // 2. Función getAssignmentsByEmail
                const { getAssignmentsByEmail, getAllAssignments, operators } = useAppStore.getState();
                const assignmentsByEmail = getAssignmentsByEmail(currentUserEmail);
                const allAssignments = getAllAssignments();
                
                console.log('📧 Resultados getAssignmentsByEmail:', {
                  inputEmail: currentUserEmail,
                  foundAssignments: assignmentsByEmail.length,
                  assignmentsSample: assignmentsByEmail.slice(0, 3)
                });
                
                console.log('📊 Comparación con getAllAssignments:', {
                  totalAssignments: allAssignments.length,
                  filteredAssignments: assignmentsByEmail.length,
                  shouldMatch: assignmentsByEmail.length < allAssignments.length ? 'CORRECTO' : 'PROBLEMA'
                });
                
                // 3. Verificar operadores disponibles
                console.log('👥 Operadores en base:', operators.map(op => ({
                  id: op.id,
                  name: op.name,
                  email: op.email,
                  matchesCurrentUser: op.email === currentUserEmail || op.name?.toLowerCase().includes(currentUserName?.toLowerCase())
                })));
                
                // 4. Verificar el estado actual de beneficiarios
                console.log('📋 Estado actual beneficiarios dashboard:', {
                  beneficiariosLength: beneficiarios.length,
                  shouldBe: assignmentsByEmail.length,
                  problem: beneficiarios.length === allAssignments.length ? 'MOSTRANDO TODOS EN LUGAR DE FILTRADOS' : 'OK'
                });
                
                // 5. Forzar recarga con filtrado correcto
                console.log('🔄 Forzando recarga con filtrado correcto...');
                if (assignmentsByEmail.length > 0 && assignmentsByEmail.length !== beneficiarios.length) {
                  setBeneficiarios(assignmentsByEmail);
                  console.log('✅ Beneficiarios actualizados manualmente:', assignmentsByEmail.length);
                }
              }}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg transition-colors shadow-sm text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Search className="w-4 h-4" />
              Debug Filtrado
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

            <motion.button
              onClick={async () => {
                console.log('🎯 SIMULANDO DATOS DE JAVIERA - Bypass Firebase');
                setIsLoading(true);
                
                try {
                  if (user?.email === 'reyesalvaradojaviera@gmail.com') {
                    console.log('🎯 Creando 286 beneficiarios simulados para Javiera...');
                    
                    // Crear beneficiarios simulados para Javiera
                    const beneficiariosSimulados = [];
                    for (let i = 1; i <= 286; i++) {
                      beneficiariosSimulados.push({
                        id: `sim-${i}`,
                        beneficiary: `Beneficiario Simulado ${i}`,
                        beneficiario: `Beneficiario Simulado ${i}`,
                        phone: `+569${8000000 + i}`,
                        primaryPhone: `+569${8000000 + i}`,
                        commune: `Comuna ${i % 20 + 1}`,
                        comuna: `Comuna ${i % 20 + 1}`,
                        operatorId: 'javiera-reyes',
                        operatorName: 'Javiera Reyes Alvarado',
                        operator: 'Javiera Reyes Alvarado',
                        fechaUltimoContacto: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                        estado: i % 3 === 0 ? 'urgente' : i % 3 === 1 ? 'pendiente' : 'al-dia',
                        isSimulated: true
                      });
                    }
                    
                    console.log(`🎯 DATOS SIMULADOS CREADOS: ${beneficiariosSimulados.length} beneficiarios`);
                    
                    // Forzar actualización del dashboard con datos simulados
                    setBeneficiarios(beneficiariosSimulados);
                    
                    console.log(`✅ ÉXITO: ${beneficiariosSimulados.length} beneficiarios simulados cargados para Javiera`);
                    console.log('⚠️ NOTA: Datos simulados - corregir permisos Firebase para datos reales');
                    
                  } else {
                    console.log('❌ Simulación solo disponible para Javiera');
                  }
                  
                } catch (error) {
                  console.error('❌ Error en simulación:', error);
                } finally {
                  setIsLoading(false);
                }
              }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors shadow-sm text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <AlertTriangle className="w-4 h-4" />
              Simular 286
            </motion.button>

            <motion.button
              onClick={async () => {
                console.log('🚀 ACCESO DIRECTO A FIREBASE - Manejando duplicados');
                setIsLoading(true);
                
                try {
                  // Importar servicios directamente
                  const { operatorService, assignmentService } = await import('../../firestoreService');
                  
                  console.log('📥 Obteniendo TODOS los operadores...');
                  const allOperators = await operatorService.getAll();
                  console.log('✅ Operadores obtenidos:', allOperators?.length || 0, allOperators);
                  
                  console.log('📥 Obteniendo TODAS las asignaciones...');
                  const allAssignments = await assignmentService.getAll();
                  console.log('✅ Asignaciones obtenidas:', allAssignments?.length || 0, allAssignments);
                  
                  // Buscar DIRECTAMENTE por email
                  const userEmail = user?.email?.toLowerCase();
                  console.log('🔍 Buscando por email:', userEmail);
                  
                  // 🔥 BUSCAR TODOS los registros que coincidan con el email (manejando duplicados)
                  const matchingOperators = allOperators?.filter(op => 
                    op.email?.toLowerCase() === userEmail
                  ) || [];
                  
                  console.log('👥 Operadores encontrados (incluyendo duplicados):', matchingOperators.length, matchingOperators);
                  
                  if (matchingOperators.length > 0) {
                    // 🎯 PRIORIZAR: registro con role='teleoperadora' y active=true
                    let operadorFinal = matchingOperators.find(op => 
                      op.role === 'teleoperadora' && op.active === true
                    );
                    
                    // Si no hay registro activo, usar el primero disponible
                    if (!operadorFinal) {
                      operadorFinal = matchingOperators[0];
                    }
                    
                    console.log('🎯 Operador seleccionado (prioritario):', operadorFinal);
                    
                    // 🔍 BUSCAR ASIGNACIONES usando TODOS los identificadores posibles
                    let todasLasAsignaciones = [];
                    
                    for (const operador of matchingOperators) {
                      console.log(`🔍 Buscando asignaciones para operador ${operador.id}...`);
                      
                      // Buscar por diferentes campos
                      const asignacionesPorId = allAssignments?.filter(assignment => 
                        assignment.operatorId === operador.id
                      ) || [];
                      
                      const asignacionesPorNombre = allAssignments?.filter(assignment => 
                        assignment.operatorName === operador.name ||
                        assignment.operator === operador.name
                      ) || [];
                      
                      const asignacionesPorUserId = allAssignments?.filter(assignment => 
                        assignment.userId === operador.userId
                      ) || [];
                      
                      console.log(`� Asignaciones encontradas para ${operador.id}:`);
                      console.log(`   - Por operatorId: ${asignacionesPorId.length}`);
                      console.log(`   - Por nombre: ${asignacionesPorNombre.length}`);
                      console.log(`   - Por userId: ${asignacionesPorUserId.length}`);
                      
                      // Combinar todas las asignaciones (sin duplicados)
                      const asignacionesOperador = [
                        ...asignacionesPorId,
                        ...asignacionesPorNombre,
                        ...asignacionesPorUserId
                      ];
                      
                      // Eliminar duplicados basado en ID
                      const asignacionesUnicas = asignacionesOperador.filter((asignacion, index, array) => 
                        array.findIndex(a => a.id === asignacion.id) === index
                      );
                      
                      todasLasAsignaciones = [...todasLasAsignaciones, ...asignacionesUnicas];
                    }
                    
                    // Eliminar duplicados finales
                    const asignacionesFinales = todasLasAsignaciones.filter((asignacion, index, array) => 
                      array.findIndex(a => a.id === asignacion.id) === index
                    );
                    
                    console.log('🎯 RESULTADO FINAL:');
                    console.log(`📊 Total asignaciones consolidadas: ${asignacionesFinales.length}`);
                    console.log('📋 Muestra de asignaciones:', asignacionesFinales.slice(0, 3));
                    
                    // 🔥 FORZAR ACTUALIZACIÓN del dashboard con datos consolidados
                    setBeneficiarios(asignacionesFinales || []);
                    
                    // Mostrar mensaje de éxito
                    console.log(`✅ ÉXITO: ${asignacionesFinales.length} beneficiarios cargados para ${operadorFinal.name}`);
                    
                  } else {
                    console.log('❌ No se encontró operador para:', userEmail);
                    setBeneficiarios([]);
                  }
                  
                } catch (error) {
                  console.error('❌ Error en acceso directo:', error);
                  setBeneficiarios([]);
                } finally {
                  setIsLoading(false);
                }
              }}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg transition-colors shadow-sm text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <AlertTriangle className="w-4 h-4" />
              Directo FB
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Métricas - Tarjetas KPI */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={itemVariants}
      >
        <MetricCard
          title="Total Beneficiarios"
          value={metricas.total}
          icon={Users}
          color="blue"
          subtitle={`${isAdmin ? 'Todos los' : 'Mis'} beneficiarios asignados`}
        />
        
        <MetricCard
          title="Al Día"
          value={metricas.alDia}
          icon={CheckCircle}
          color="green"
          subtitle="Contacto últimos 15 días"
          percentage={metricas.total > 0 ? Math.round((metricas.alDia / metricas.total) * 100) : 0}
        />
        
        <MetricCard
          title="Pendientes"
          value={metricas.pendientes}
          icon={Clock}
          color="yellow"
          subtitle="16-30 días sin contacto"
          percentage={metricas.total > 0 ? Math.round((metricas.pendientes / metricas.total) * 100) : 0}
        />
        
        <MetricCard
          title="Urgentes"
          value={metricas.urgentes}
          icon={AlertTriangle}
          color="red"
          subtitle="+30 días sin contacto"
          percentage={metricas.total > 0 ? Math.round((metricas.urgentes / metricas.total) * 100) : 0}
        />
      </motion.div>

      {/* 🚨 Alerta de debugging cuando no hay asignaciones */}
      {!isAdmin && metricas.total === 0 && (
        <motion.div 
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
          variants={itemVariants}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-yellow-800 font-medium mb-2">
                🔍 No se encontraron asignaciones para tu usuario
              </h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p><strong>Usuario:</strong> {user?.email || 'No definido'}</p>
                <p><strong>Nombre mostrado:</strong> {user?.displayName || 'No definido'}</p>
                <p><strong>Nombre de operadora buscado:</strong> {currentOperatorName}</p>
                <p><strong>Total de asignaciones en sistema:</strong> {getAllAssignments().length}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium">Ver operadoras disponibles</summary>
                  <div className="mt-2 max-h-32 overflow-y-auto bg-yellow-100 p-2 rounded text-xs">
                    {getAllAssignments().slice(0, 10).map((assignment, index) => (
                      <div key={index} className="mb-1">
                        <strong>{assignment.operator || assignment.operatorName}</strong> → {assignment.beneficiary}
                      </div>
                    ))}
                    {getAllAssignments().length > 10 && (
                      <div className="text-yellow-600">... y {getAllAssignments().length - 10} más</div>
                    )}
                  </div>
                </details>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => {
                    console.log('🔄 Forzando recarga de asignaciones...');
                    loadDashboardData();
                  }}
                  className="text-sm bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-3 py-1 rounded transition-colors"
                >
                  🔄 Recargar asignaciones
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filtros y Búsqueda */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-4 items-center justify-between"
        variants={itemVariants}
      >
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar beneficiario, teléfono o comuna..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900 shadow-sm transition-all duration-200"
          />
        </div>

        {/* Filtros por estado */}
        <div className="flex gap-2">
          {[
            { key: 'todos', label: 'Todos', icon: Target },
            { key: 'al-dia', label: 'Al Día', icon: CheckCircle },
            { key: 'pendientes', label: 'Pendientes', icon: Clock },
            { key: 'urgentes', label: 'Urgentes', icon: AlertTriangle }
          ].map(filter => (
            <motion.button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeFilter === filter.key
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <filter.icon className="w-4 h-4" />
              {filter.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Lista de Beneficiarios */}
      <motion.div variants={itemVariants}>
        {beneficiariosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              {searchTerm || activeFilter !== 'todos' 
                ? '🔍 No se encontraron beneficiarios con los filtros aplicados'
                : '📋 No tienes beneficiarios asignados'
              }
            </div>
            {!isAdmin && beneficiarios.length === 0 && (
              <p className="text-sm text-gray-400">
                Contacta al administrador para que te asigne beneficiarios
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {beneficiariosFiltrados.map((beneficiario, index) => (
                <motion.div
                  key={beneficiario.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <BeneficiaryCard
                    beneficiario={beneficiario}
                    seguimientos={seguimientos.filter(s => 
                      s.beneficiarioId === beneficiario.id || 
                      s.beneficiario === beneficiario.beneficiary
                    )}
                    onSelect={() => setSelectedBeneficiary(beneficiario)}
                    onNewContact={() => {
                      setSelectedBeneficiary(beneficiario);
                      setShowNewContactForm(true);
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Modal - Formulario de Nuevo Contacto */}
      <AnimatePresence>
        {showNewContactForm && (
          <NewContactForm
            beneficiario={selectedBeneficiary}
            beneficiarios={beneficiarios}
            onSave={handleNewContact}
            onClose={() => {
              setShowNewContactForm(false);
              setSelectedBeneficiary(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TeleoperadoraDashboard;
