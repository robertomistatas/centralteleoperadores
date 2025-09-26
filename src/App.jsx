import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, Users, Clock, TrendingUp, TrendingDown, Upload, Search, Filter, BarChart3, PieChart, Calendar, AlertCircle, Plus, Edit, Trash2, UserPlus, FileSpreadsheet, Save, X, LogOut, User, Zap, Database, Activity, Settings } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from './AuthContext';
import { operatorService, assignmentService, callDataService } from './firestoreService';
import { useCallStore, useAppStore } from './stores';
import AuditDemo from './components/examples/AuditDemo';
import ErrorBoundary from './components/ErrorBoundary';
import ZustandTest from './test/ZustandTest';
import BeneficiariosBase from './components/BeneficiariosBase';
import MetricsTestPanel from './components/MetricsTestPanel';
import TeleoperadoraDashboard from './components/seguimientos/TeleoperadoraDashboard';
import SuperAdminDashboard from './components/admin/SuperAdminDashboard';
import usePermissions from './hooks/usePermissions';

const TeleasistenciaApp = () => {
  const { user, logout } = useAuth();
  
  // ✅ SISTEMA DE PERMISOS INTEGRADO
  const {
    user: userProfile,
    isSuperAdmin,
    visibleModules,
    defaultTab,
    canViewConfig,
    checkModuleAccess
  } = usePermissions();
  
  // ✅ FUNCIÓN UTILITARIA CENTRALIZADA: Formatear fechas al formato chileno DD-MM-YYYY
  const formatToChileanDate = (dateValue) => {
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
  
  // Zustand stores
  const {
    callData: zustandCallData,
    processedData,
    callMetrics: zustandCallMetrics,
    setCallData: setZustandCallData,
    analyzeCallData,
    forceReanalysis,
    getOperatorMetrics,
    getHourlyDistribution,
    getFollowUpData,
    hasData: hasCallData,
    isLoading,
    loadingStage,
    loadingMessage,
    setLoadingStage
  } = useCallStore();

  const {
    operators: zustandOperators,
    operatorAssignments: zustandOperatorAssignments,
    activeTab: zustandActiveTab,
    setOperators: setZustandOperators,
    setOperatorAssignments: setZustandOperatorAssignments,
    setActiveTab: setZustandActiveTab,
    getAllAssignments: getZustandAllAssignments
  } = useAppStore();

  // Estados locales (mantenemos algunos para compatibilidad durante la transición)
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // ✅ ACTUALIZAR TAB POR DEFECTO SEGÚN PERMISOS
  useEffect(() => {
    if (defaultTab && activeTab === 'dashboard' && !checkModuleAccess('dashboard')) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, checkModuleAccess]);
  
  const [callData, setCallData] = useState([]);
  const [assignments, setAssignments] = useState([]);
  // ✅ ELIMINADO: followUpHistory - ahora usamos solo datos de Zustand con formateo correcto de fechas
  const [firebaseStatus, setFirebaseStatus] = useState('connecting'); // 'connecting', 'connected', 'demo'
  const [dashboardMetrics, setDashboardMetrics] = useState({
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    beneficiaries: 0,
    activeAssignments: 0,
    operators: 0,
    protocolCompliance: 0,
    pendingFollowUps: 0
  });
  const [operatorMetrics, setOperatorMetrics] = useState([]);
  const [hourlyDistribution, setHourlyDistribution] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para el módulo de Asignaciones
  const [operators, setOperators] = useState([]);
  const [showCreateOperator, setShowCreateOperator] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [operatorForm, setOperatorForm] = useState({ name: '', email: '', phone: '' });
  const [operatorAssignments, setOperatorAssignments] = useState({});
  const [uploadingFor, setUploadingFor] = useState(null);
  
  // 🔥 SINCRONIZACIÓN AUTOMÁTICA: Sincronizar estado local con Zustand cada vez que cambie
  useEffect(() => {
    if (operators.length > 0) {
      // console.log('🔄 Sincronizando operators locales con Zustand:', operators.length);
      setZustandOperators(operators);
    }
  }, [operators, setZustandOperators]);
  
  useEffect(() => {
    if (Object.keys(operatorAssignments).length > 0) {
      // console.log('🔄 Sincronizando operatorAssignments locales con Zustand:', Object.keys(operatorAssignments).length);
      setZustandOperatorAssignments(operatorAssignments);
    }
  }, [operatorAssignments, setZustandOperatorAssignments]);
  
  // Estados para búsqueda de beneficiarios
  const [showBeneficiarySearch, setShowBeneficiarySearch] = useState(false);
  const [beneficiarySearchTerm, setBeneficiarySearchTerm] = useState('');
  const [beneficiarySearchResults, setBeneficiarySearchResults] = useState([]);

  // Datos de ejemplo para las asignaciones
  const sampleAssignments = [
    { id: 1, operator: 'María González', beneficiary: 'Juan Pérez', phone: '987654321', commune: 'Santiago' },
    { id: 2, operator: 'Ana Rodríguez', beneficiary: 'Carmen Silva', phone: '987654322', commune: 'Valparaíso' },
    { id: 3, operator: 'Luis Martínez', beneficiary: 'Pedro López', phone: '987654323', commune: 'Concepción' },
    { id: 4, operator: 'María González', beneficiary: 'Rosa Morales', phone: '987654324', commune: 'Santiago' },
    { id: 5, operator: 'Ana Rodríguez', beneficiary: 'Carlos Díaz', phone: '987654325', commune: 'Valparaíso' },
  ];

  // Ref para controlar si ya se están cargando los datos
  const loadingRef = useRef(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (user && !dataLoaded && !loadingRef.current) {
      loadUserData();
    }
  }, [user, dataLoaded]);

  // 🔥 SINCRONIZACIÓN INICIAL: Forzar sincronización al cargar la app
  useEffect(() => {
    if (dataLoaded && operators.length > 0) {
      // Logs comentados para evitar spam en consola
      // console.log('🔥 FORZANDO SINCRONIZACIÓN INICIAL CON ZUSTAND');
      // console.log('📊 Operators locales:', operators.length);
      // console.log('📊 OperatorAssignments locales:', Object.keys(operatorAssignments).length);
      
      setZustandOperators(operators);
      setZustandOperatorAssignments(operatorAssignments);
      
      // Verificar sincronización sin spam
      setTimeout(() => {
        const { operators: zOperators, operatorAssignments: zAssignments } = useAppStore.getState();
        // console.log('✅ Verificación post-sincronización:', {
        //   zustandOperators: zOperators?.length || 0,
        //   zustandAssignments: Object.keys(zAssignments || {}).length
        // });
      }, 500);
    }
  }, [dataLoaded, operators, operatorAssignments, setZustandOperators, setZustandOperatorAssignments]);

  // OPTIMIZACIÓN: Re-analizar solo cuando sea necesario con debounce
  useEffect(() => {
    if (zustandCallData.length > 0 && Object.keys(zustandOperatorAssignments).length > 0) {
      // Usar timeout para evitar re-análisis excesivos
      const timeoutId = setTimeout(() => {
        // console.log('🔄 Re-analizando datos tras actualización de asignaciones (optimizado)...');
        // El store optimizado manejará esto de manera eficiente
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [zustandOperatorAssignments]);

  // Cargar datos del usuario desde Firestore de manera optimizada
  const loadUserData = async () => {
    if (loadingRef.current) return; // Evitar cargas múltiples
    
    loadingRef.current = true;
    setFirebaseStatus('connecting');
    
    try {
      // 🔥 CARGAR DATOS GENERALES DEL SISTEMA PRIMERO
      console.log('📥 Cargando datos generales del sistema...');
      const { loadOperators, loadAssignments } = useAppStore.getState();
      
      // Cargar todos los operadores y asignaciones del sistema
      await Promise.all([
        loadOperators(),
        loadAssignments()
      ]);
      
      // ✅ Verificar datos cargados
      const { operators: allOperators, operatorAssignments: allAssignments } = useAppStore.getState();
      console.log('🎯 DATOS GENERALES CARGADOS:', {
        operadores: allOperators?.length || 0,
        asignacionesGrupos: Object.keys(allAssignments || {}).length,
        totalAsignaciones: Object.values(allAssignments || {}).flat().length
      });
      
      // OPTIMIZACIÓN: Cargar datos específicos del usuario en paralelo
      const [userOperators, userAssignments, userCallData] = await Promise.all([
        operatorService.getByUser(user.uid),
        assignmentService.getAllUserAssignments(user.uid),
        callDataService.getCallData(user.uid)
      ]);
      
      // Verificar si la operación fue exitosa
      if (userOperators !== null) {
        // OPTIMIZACIÓN: Actualizar estados de manera batch
        setOperators(userOperators || []);
        setOperatorAssignments(userAssignments || {});
        setCallData(userCallData || []);

        // OPTIMIZACIÓN: Usar Zustand stores para datos principales
        setZustandOperators(userOperators || []);
        setZustandOperatorAssignments(userAssignments || {});

        // Generar assignments generales para compatibilidad
        generateGeneralAssignments(userAssignments || {}, userOperators || []);
        
        // OPTIMIZACIÓN: Usar store optimizado para análisis de datos
        if (userCallData && userCallData.length > 0) {
          console.log('📊 Cargando datos en Zustand store optimizado...');
          setZustandCallData(userCallData, 'firebase'); // Esto ejecuta el análisis optimizado automáticamente
        } else {
          console.log('📝 No hay datos de llamadas, inicializando métricas por defecto...');
          generateSampleData();
        }
        
        setFirebaseStatus('connected');
        setDataLoaded(true);
        console.log('✅ Conectado a Firebase - datos cargados con optimización');
      } else {
        // Permisos insuficientes, usar datos de ejemplo
        throw new Error('Insufficient permissions');
      }
      
    } catch (error) {
      setFirebaseStatus('demo');
      setDataLoaded(true);
      // En caso de error, inicializar con datos de ejemplo
      initializeWithSampleData();
    } finally {
      loadingRef.current = false;
    }
  };

  // Generar assignments generales a partir de operator assignments
  const generateGeneralAssignments = (operatorAssignments, operators) => {
    const allAssignments = [];
    
    Object.entries(operatorAssignments).forEach(([operatorId, assignments]) => {
      const operator = operators.find(op => op.id === operatorId);
      if (operator && assignments) {
        assignments.forEach(assignment => {
          allAssignments.push({
            id: assignment.id,
            operator: operator.name,
            beneficiary: assignment.beneficiary,
            phone: assignment.primaryPhone,
            commune: assignment.commune
          });
        });
      }
    });
    
    setAssignments(allAssignments);
  };

  // Inicializar con datos de ejemplo (fallback)
  const initializeWithSampleData = () => {
    console.log('🔄 Inicializando con datos de ejemplo...');
    setAssignments(sampleAssignments);
    
    // ✅ SINCRONIZAR asignaciones de muestra con Zustand
    // Crear estructura de operadorAssignments para Zustand basada en sampleAssignments
    const operatorAssignmentsForZustand = {};
    
    sampleAssignments.forEach(assignment => {
      // Buscar o crear operador ID basado en el nombre
      const operatorName = assignment.operator;
      let operatorId = `operator-${operatorName.toLowerCase().replace(/\s+/g, '-')}`;
      
      if (!operatorAssignmentsForZustand[operatorId]) {
        operatorAssignmentsForZustand[operatorId] = [];
      }
      
      operatorAssignmentsForZustand[operatorId].push({
        id: assignment.id,
        beneficiary: assignment.beneficiary,
        beneficiario: assignment.beneficiary, // Agregar campo alternativo
        primaryPhone: assignment.phone,
        phone: assignment.phone, // Agregar campo alternativo
        commune: assignment.commune,
        comuna: assignment.commune // Agregar campo alternativo
      });
    });
    
    // Crear operadores para Zustand basado en sampleAssignments
    const operatorsForZustand = [...new Set(sampleAssignments.map(a => a.operator))].map((operatorName, index) => ({
      id: `operator-${operatorName.toLowerCase().replace(/\s+/g, '-')}`,
      name: operatorName,
      email: `${operatorName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      phone: `+56${index + 1}12345678`
    }));
    
    // Sincronizar con Zustand
    setZustandOperators(operatorsForZustand);
    setZustandOperatorAssignments(operatorAssignmentsForZustand);
    
    console.log('✅ Datos sincronizados con Zustand:', {
      operators: operatorsForZustand,
      assignments: operatorAssignmentsForZustand
    });
    
    initializeOperators();
    generateSampleData();
    console.log('✅ Datos de ejemplo inicializados');
  };

  // Inicializar operadores de ejemplo
  const initializeOperators = () => {
    const sampleOperators = [
      { 
        id: 'sample-1', 
        name: 'María González', 
        email: 'maria.gonzalez@central.cl', 
        phone: '987654321',
        userId: user?.uid || 'demo-user'
      },
      { 
        id: 'sample-2', 
        name: 'Ana Rodríguez', 
        email: 'ana.rodriguez@central.cl', 
        phone: '987654322',
        userId: user?.uid || 'demo-user'
      },
      { 
        id: 'sample-3', 
        name: 'Luis Martínez', 
        email: 'luis.martinez@central.cl', 
        phone: '987654323',
        userId: user?.uid || 'demo-user'
      },
      { 
        id: 'sample-4', 
        name: 'Carmen Torres', 
        email: 'carmen.torres@central.cl', 
        phone: '987654324',
        userId: user?.uid || 'demo-user'
      },
      { 
        id: 'sample-5', 
        name: 'Pedro Sánchez', 
        email: 'pedro.sanchez@central.cl', 
        phone: '987654325',
        userId: user?.uid || 'demo-user'
      },
    ];
    
    // Filtrar elementos null o inválidos antes de setear
    const validOperators = sampleOperators.filter(op => op && op.id && op.name);
    setOperators(validOperators);
  };

  // Funciones para gestión de operadores
  const handleCreateOperator = async () => {
    if (operatorForm.name.trim() === '') return;
    
    try {
      const newOperator = await operatorService.create(user.uid, operatorForm);
      setOperators([...operators, newOperator]);
      setOperatorForm({ name: '', email: '', phone: '' });
      setShowCreateOperator(false);
    } catch (error) {
      console.error('Error creating operator:', error);
      alert('Error al crear teleoperador. Intenta nuevamente.');
    }
  };

  const handleDeleteOperator = async (operatorId) => {
    try {
      await operatorService.delete(operatorId);
      await assignmentService.deleteOperatorAssignments(user.uid, operatorId);
      
      setOperators(operators.filter(op => op.id !== operatorId));
      // También eliminar sus asignaciones
      const newAssignments = { ...operatorAssignments };
      delete newAssignments[operatorId];
      setOperatorAssignments(newAssignments);
      
      // Actualizar assignments generales
      const filteredAssignments = assignments.filter(a => !a.id.toString().startsWith(`${operatorId}-`));
      setAssignments(filteredAssignments);
    } catch (error) {
      console.error('Error deleting operator:', error);
      alert('Error al eliminar teleoperador. Intenta nuevamente.');
    }
  };

  const handleFileUploadForOperator = (event, operatorId) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        processOperatorAssignments(jsonData, operatorId);
      };
      reader.readAsArrayBuffer(file);
    }
    // Limpiar el input
    event.target.value = '';
  };

  const processOperatorAssignments = async (data, operatorId) => {
    if (data.length < 2) return;
    
    const operator = operators.find(op => op.id === operatorId);
    if (!operator) return;

    const processedData = data.slice(1).map((row, index) => {
      // Procesar teléfonos (separados por |, - o espacios)
      const phones = row[1] ? String(row[1]).split(/[\|\-\s]+/).filter(phone => phone.trim().length === 9) : [];
      
      return {
        id: `${operatorId}-${index}`,
        operatorId: operatorId,
        operatorName: operator.name,
        beneficiary: row[0] || '',
        phones: phones,
        primaryPhone: phones[0] || '',
        commune: row[2] || ''
      };
    }).filter(item => item.beneficiary && item.primaryPhone);

    try {
      // Guardar en Firestore
      await assignmentService.saveOperatorAssignments(user.uid, operatorId, processedData);

      // Actualizar estado local
      setOperatorAssignments(prev => ({
        ...prev,
        [operatorId]: processedData
      }));

      // Actualizar assignments generales para compatibilidad
      const newGeneralAssignments = processedData.map(item => ({
        id: item.id,
        operator: item.operatorName,
        beneficiary: item.beneficiary,
        phone: item.primaryPhone,
        commune: item.commune
      }));

      setAssignments(prev => {
        // Eliminar asignaciones anteriores de este operador
        const filteredPrev = prev.filter(a => !a.id.toString().startsWith(`${operatorId}-`));
        return [...filteredPrev, ...newGeneralAssignments];
      });

      setUploadingFor(null);
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('Error al guardar asignaciones. Intenta nuevamente.');
    }
  };

  const clearOperatorAssignments = async (operatorId) => {
    try {
      await assignmentService.deleteOperatorAssignments(user.uid, operatorId);
      
      const newAssignments = { ...operatorAssignments };
      delete newAssignments[operatorId];
      setOperatorAssignments(newAssignments);

      // También eliminar de assignments generales
      setAssignments(prev => prev.filter(a => !a.id.toString().startsWith(`${operatorId}-`)));
    } catch (error) {
      console.error('Error clearing assignments:', error);
      alert('Error al limpiar asignaciones. Intenta nuevamente.');
    }
  };

  const generateSampleData = () => {
    // Solo generar datos de ejemplo si no hay datos reales de llamadas
    if (callData.length > 0) {
      console.log('📊 Datos reales disponibles, omitiendo generación de datos de ejemplo');
      return;
    }
    
    console.log('📝 Generando datos de ejemplo...');
    
    // Generar datos de ejemplo
    const operatorNames = operators.length > 0 
      ? operators.map(op => op.name)
      : ['María González', 'Ana Rodríguez', 'Luis Martínez', 'Carmen Torres', 'Pedro Sánchez'];
    
    const sampleMetrics = operatorNames.map(op => ({
      operator: op,
      totalCalls: Math.floor(Math.random() * 50) + 20,
      totalMinutes: Math.floor(Math.random() * 500) + 100,
      avgDuration: Math.floor(Math.random() * 10) + 3
    }));

    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      calls: Math.floor(Math.random() * 20) + 1
    }));

    setOperatorMetrics(sampleMetrics);
    setHourlyDistribution(hourlyData);
    
    // Actualizar métricas del dashboard con valores de ejemplo
    setDashboardMetrics({
      totalCalls: 150,
      successfulCalls: 120,
      failedCalls: 30,
      beneficiaries: 85,
      activeAssignments: assignments.length || 5,
      operators: operators.length || 5,
      protocolCompliance: 85,
      pendingFollowUps: 12
    });

    // Generar historial de seguimientos
    const statuses = ['al-dia', 'pendiente', 'urgente'];
    const statusColors = {
      'al-dia': 'bg-green-100 text-green-800',
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'urgente': 'bg-red-100 text-red-800'
    };
    
    const assignmentsToUse = assignments.length > 0 ? assignments : sampleAssignments;
    // ✅ ELIMINADO: La generación de sampleFollowUps ya no es necesaria
    // Los datos de seguimiento se obtienen directamente de Zustand con formateo correcto
  };

  // Función para buscar beneficiarios en las asignaciones
  const searchBeneficiaries = (searchTerm) => {
    if (!searchTerm.trim()) {
      setBeneficiarySearchResults([]);
      return;
    }

    console.log('🔍 Iniciando búsqueda para:', searchTerm);
    const allAssignments = [];
    
    // 1. Buscar en asignaciones locales (operatorAssignments) - FUENTE PRINCIPAL
    Object.entries(operatorAssignments).forEach(([operatorId, assignments]) => {
      const operator = operators.find(op => op.id === operatorId);
      if (assignments && Array.isArray(assignments)) {
        assignments.forEach(assignment => {
          // Crear una entrada unificada con todos los campos posibles
          allAssignments.push({
            // Campos de beneficiario
            beneficiary: assignment.beneficiary || assignment.beneficiario,
            beneficiario: assignment.beneficiary || assignment.beneficiario,
            
            // Campos de operador
            operatorName: operator?.name || assignment.operator || assignment.operatorName || 'Operador no encontrado',
            operator: operator?.name || assignment.operator || assignment.operatorName,
            
            // Campos de teléfono (múltiples opciones)
            phone: assignment.primaryPhone || assignment.phone || assignment.telefono || assignment.numero_cliente || 
                   (assignment.phones && assignment.phones[0]) || 'N/A',
            primaryPhone: assignment.primaryPhone,
            phones: assignment.phones || [],
            telefono: assignment.telefono,
            numero_cliente: assignment.numero_cliente,
            
            // Comuna
            commune: assignment.commune || assignment.comuna || 'N/A',
            comuna: assignment.comuna,
            
            // Metadatos
            operatorId: operatorId,
            source: 'operatorAssignments',
            id: assignment.id
          });
        });
      }
    });
    
    // 2. Buscar en datos de Zustand como respaldo
    const zustandAssignments = getZustandAllAssignments();
    console.log('📊 Asignaciones de Zustand:', zustandAssignments);
    zustandAssignments.forEach(assignment => {
      allAssignments.push({
        beneficiary: assignment.beneficiary || assignment.beneficiario,
        beneficiario: assignment.beneficiary || assignment.beneficiario,
        operatorName: assignment.operator || assignment.operatorName || assignment.name || 'Sin asignar',
        operator: assignment.operator || assignment.operatorName || assignment.name,
        phone: assignment.phone || assignment.telefono || assignment.numero_cliente || 'N/A',
        commune: assignment.commune || assignment.comuna || 'N/A',
        operatorId: assignment.operatorId || 'zustand',
        source: 'zustand'
      });
    });

    console.log('📋 Total asignaciones encontradas:', allAssignments.length);
    console.log('📋 Muestra de asignaciones:', allAssignments.slice(0, 3));
    
    // Filtrar por término de búsqueda (búsqueda muy flexible)
    const searchLower = searchTerm.toLowerCase().trim();
    const filteredResults = allAssignments.filter(assignment => {
      // Obtener todos los campos de texto para búsqueda
      const beneficiaryName = (assignment.beneficiary || assignment.beneficiario || '').toLowerCase();
      const operatorName = (assignment.operatorName || assignment.operator || '').toLowerCase();
      const commune = (assignment.commune || assignment.comuna || '').toLowerCase();
      
      // Buscar en todos los teléfonos posibles
      const allPhones = [
        assignment.phone,
        assignment.primaryPhone,
        assignment.telefono,
        assignment.numero_cliente,
        ...(assignment.phones || [])
      ].filter(phone => phone && phone !== 'N/A').join(' ').toLowerCase();
      
      // Verificar coincidencias
      const matchesBeneficiary = beneficiaryName.includes(searchLower);
      const matchesOperator = operatorName.includes(searchLower);
      const matchesPhone = allPhones.includes(searchLower);
      const matchesCommune = commune.includes(searchLower);
      
      const hasMatch = matchesBeneficiary || matchesOperator || matchesPhone || matchesCommune;
      
      if (hasMatch) {
        console.log('✅ Coincidencia encontrada:', {
          beneficiary: beneficiaryName,
          operator: operatorName,
          phones: allPhones,
          commune: commune,
          searchTerm: searchLower,
          matches: { beneficiaryName: matchesBeneficiary, operatorName: matchesOperator, phones: matchesPhone, commune: matchesCommune },
          source: assignment.source
        });
      }
      
      return hasMatch;
    });
    
    console.log('🎯 Resultados filtrados:', filteredResults.length);
    setBeneficiarySearchResults(filteredResults);
  };

  // Ref para el timeout del debouncing
  const searchTimeoutRef = useRef(null);

  // Cleanup del timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Manejar cambio en el término de búsqueda con debouncing
  const handleBeneficiarySearch = (term) => {
    // Actualizar inmediatamente el estado del input para que sea responsive
    setBeneficiarySearchTerm(term);
    
    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Si el término está vacío, limpiar resultados inmediatamente
    if (!term.trim()) {
      setBeneficiarySearchResults([]);
      return;
    }
    
    // Debouncing: esperar 300ms antes de ejecutar la búsqueda
    searchTimeoutRef.current = setTimeout(() => {
      searchBeneficiaries(term);
    }, 300);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Establecer estado inicial de carga
      setLoadingStage('uploading', `Subiendo archivo: ${file.name}`);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Establecer estado de procesamiento
          setLoadingStage('processing', 'Leyendo datos del archivo Excel...');
          
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Procesar datos del Excel
          processExcelData(jsonData);
        } catch (error) {
          console.error('Error al procesar archivo Excel:', error);
          setLoadingStage('error', 'Error al procesar el archivo Excel');
        }
      };
      
      reader.onerror = () => {
        setLoadingStage('error', 'Error al leer el archivo');
      };
      
      reader.readAsArrayBuffer(file);
    }
    
    // Limpiar el input para permitir cargar el mismo archivo nuevamente
    event.target.value = '';
  };

  const processExcelData = async (data) => {
    if (data.length < 2) {
      setLoadingStage('error', 'El archivo Excel no contiene datos válidos');
      return;
    }
    
    try {
      // Actualizar estado de procesamiento
      setLoadingStage('processing', `Procesando ${data.length - 1} filas de datos...`);
      
      // Función para detectar qué columna contiene los operadores reales
      const detectOperatorColumn = (data) => {
      const testRows = data.slice(1, Math.min(6, data.length)); // Analizar las primeras 5 filas de datos
      
      // Función auxiliar para determinar si un valor parece ser un nombre de operador
      const looksLikeOperatorName = (value) => {
        if (!value || typeof value !== 'string') return false;
        
        // Rechazar si es claramente una hora (formato HH:MM)
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) return false;
        
        // Rechazar si es claramente una fecha
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value) || !isNaN(Date.parse(value))) return false;
        
        // Rechazar si es solo números
        if (/^\d+$/.test(value)) return false;
        
        // Rechazar si es muy corto (menos de 3 caracteres)
        if (value.trim().length < 3) return false;
        
        // Aceptar si contiene al menos 2 palabras (nombre y apellido)
        const words = value.trim().split(/\s+/).filter(word => word.length > 1);
        if (words.length >= 2) return true;
        
        // Aceptar si contiene caracteres típicos de nombres
        if (/^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s\-\.]+$/.test(value)) return true;
        
        return false;
      };
      
      // Evaluar cada columna para ver cuántos valores parecen nombres de operadores
      const columnScores = {};
      
      for (let colIndex = 0; colIndex < 15; colIndex++) { // Revisar hasta la columna O
        let score = 0;
        const values = testRows.map(row => row[colIndex]).filter(v => v != null);
        
        if (values.length === 0) continue;
        
        for (const value of values) {
          if (looksLikeOperatorName(String(value))) {
            score++;
          }
        }
        
        if (score > 0) {
          columnScores[colIndex] = {
            score,
            percentage: (score / values.length) * 100,
            sampleValues: values.slice(0, 3)
          };
        }
      }
      
      console.log('📊 Análisis de columnas para detectar operadores:', columnScores);
      
      // Encontrar la columna con mejor score
      let bestColumn = 7; // Default: columna H
      let bestScore = 0;
      
      for (const [colIndex, data] of Object.entries(columnScores)) {
        if (data.score > bestScore || (data.score === bestScore && data.percentage > 50)) {
          bestScore = data.score;
          bestColumn = parseInt(colIndex);
        }
      }
      
      console.log(`🎯 Columna de operadores detectada: ${bestColumn} (puntuación: ${bestScore})`);
      return bestColumn;
    };
    
    // Detectar automáticamente la columna de operadores
    const operatorColumn = detectOperatorColumn(data);
    
    // Convertir datos de Excel al formato esperado por Zustand
    const processedData = data.slice(1).map((row, index) => {
      // Debug: Log de las primeras 3 filas para verificar el mapeo
      if (index < 3) {
        console.log(`Fila ${index}:`, {
          col0: row[0], col1: row[1], col2: row[2], col3: row[3], 
          col4: row[4], col5: row[5], col6: row[6], col7: row[7], 
          col8: row[8], col9: row[9], col10: row[10], col11: row[11],
          operadorDetectado: row[operatorColumn]
        });
      }
      
      // Obtener el operador de la columna detectada automáticamente
      let operadorValue = row[operatorColumn];
      
      // Validación adicional: si el valor detectado parece ser hora, buscar en otras columnas
      if (operadorValue && /^\d{1,2}:\d{2}/.test(String(operadorValue))) {
        console.warn(`⚠️ Valor de operador parece ser hora: "${operadorValue}". Buscando en otras columnas...`);
        
        // Buscar en columnas adyacentes
        for (let i = 0; i < row.length; i++) {
          const value = row[i];
          if (value && typeof value === 'string' && 
              !/^\d{1,2}:\d{2}/.test(value) && 
              !/^\d+$/.test(value) &&
              value.trim().split(/\s+/).length >= 2) {
            operadorValue = value;
            console.log(`✅ Operador encontrado en columna ${i}: "${operadorValue}"`);
            break;
          }
        }
      }
      
      // Usar la función centralizada para formatear fechas
      const formatDateFromExcel = formatToChileanDate;
      
      return {
        id: row[0] || `call-${index}-${Date.now()}`,
        fecha: formatDateFromExcel(row[1]), // ✅ CORREGIDO: Formatear fecha de forma consistente
        beneficiario: row[2], // Beneficiario en columna C
        comuna: row[3],
        tipo_llamada: row[4] === 'Entrante' ? 'entrante' : 'saliente',
        numero_cliente: row[5],
        hora: row[6] || '09:00:00',
        operador: operadorValue || 'No identificado', // Operador detectado automáticamente
        duracion: parseInt(row[8]) || 0,
        categoria: row[9] === 'Llamado exitoso' ? 'exitosa' : 'fallida',
        resultado: row[9],
        observacion: row[10],
        apiId: row[11]
      };
    });

    // Guardar datos en Firebase
    try {
      if (firebaseStatus === 'connected') {
        const success = await callDataService.saveCallData(user.uid, processedData);
        if (success) {
          console.log('✅ Datos de llamadas guardados en Firebase');
        }
      }
    } catch (error) {
      console.error('Error guardando datos en Firebase:', error);
    }

    // ✅ USAR ZUSTAND COMO FUENTE ÚNICA DE VERDAD
    setZustandCallData(processedData, 'excel');
    
    // ✅ SINCRONIZAR operadoras detectadas con asignaciones si no hay asignaciones previas
    if (allAssignments.length === 0 && processedData.length > 0) {
      console.log('🔄 No hay asignaciones previas, creando asignaciones basadas en operadoras detectadas...');
      createAssignmentsFromCallData(processedData);
    }
    
    console.log(`📊 Procesados ${processedData.length} registros en Zustand`);
    } catch (error) {
      console.error('Error durante el procesamiento de datos:', error);
      setLoadingStage('error', 'Error al procesar los datos del Excel');
    }
  };

  // Crear asignaciones automáticas basadas en datos de llamadas cuando no hay asignaciones previas
  const createAssignmentsFromCallData = (callData) => {
    try {
      const operatorBeneficiaryMap = {};
      
      // Función para validar nombres de operadoras
      const isValidOperatorName = (name) => {
        if (!name || typeof name !== 'string') return false;
        return name.trim().length > 2 &&
               !/^\d{1,2}:\d{2}/.test(name) &&
               !/^\d+$/.test(name) &&
               !/^(si|no|exitoso|fallido|pendiente|hangup|solo)$/i.test(name) &&
               /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s\-\.]{3,}$/.test(name);
      };
      
      // Analizar llamadas para extraer relaciones operadora-beneficiario
      callData.forEach(call => {
        const beneficiary = call.beneficiario || call.beneficiary;
        const operatorName = call.operador || call.operator || call.teleoperadora;
        
        if (beneficiary && operatorName && isValidOperatorName(operatorName)) {
          if (!operatorBeneficiaryMap[operatorName]) {
            operatorBeneficiaryMap[operatorName] = new Set();
          }
          operatorBeneficiaryMap[operatorName].add(beneficiary);
        }
      });
      
      // Crear operadores únicos
      const detectedOperators = Object.keys(operatorBeneficiaryMap).map((operatorName, index) => ({
        id: `auto-operator-${index + 1}`,
        name: operatorName,
        email: `${operatorName.toLowerCase().replace(/\s+/g, '.')}@auto.com`,
        phone: `+56${index + 1}87654321`
      }));
      
      // Crear asignaciones automáticas
      const autoAssignments = {};
      const allAssignmentsList = [];
      
      Object.entries(operatorBeneficiaryMap).forEach(([operatorName, beneficiariesSet], operatorIndex) => {
        const operatorId = `auto-operator-${operatorIndex + 1}`;
        autoAssignments[operatorId] = [];
        
        Array.from(beneficiariesSet).forEach((beneficiary, beneficiaryIndex) => {
          const assignment = {
            id: `auto-${operatorId}-${beneficiaryIndex + 1}`,
            beneficiary: beneficiary,
            beneficiario: beneficiary,
            primaryPhone: 'N/A',
            phone: 'N/A',
            commune: 'N/A',
            comuna: 'N/A'
          };
          
          autoAssignments[operatorId].push(assignment);
          allAssignmentsList.push({
            ...assignment,
            operator: operatorName
          });
        });
      });
      
      // Sincronizar con Zustand y estado local
      if (detectedOperators.length > 0) {
        setZustandOperators(detectedOperators);
        setZustandOperatorAssignments(autoAssignments);
        setAssignments(allAssignmentsList);
        
        console.log('✅ Asignaciones automáticas creadas:', {
          operators: detectedOperators.length,
          assignments: allAssignmentsList.length,
          operatorMap: operatorBeneficiaryMap
        });
      }
      
    } catch (error) {
      console.error('Error creando asignaciones automáticas:', error);
    }
  };

  // OPTIMIZACIÓN: Función de análisis simplificada
  const analyzeCallDataLegacy = (data) => {
    if (!data || data.length === 0) return;
    
    const successfulCalls = data.filter(call => call.result === 'Llamado exitoso');
    const failedCalls = data.filter(call => call.result !== 'Llamado exitoso');
    const uniqueBeneficiaries = new Set(data.map(call => call.beneficiary)).size;
    
    // Actualizar métricas de manera eficiente
    setDashboardMetrics(prev => ({
      ...prev,
      totalCalls: data.length,
      successfulCalls: successfulCalls.length,
      failedCalls: failedCalls.length,
      beneficiaries: uniqueBeneficiaries,
      activeAssignments: assignments.length,
      operators: operators.length,
      protocolCompliance: data.length > 0 ? Math.round((successfulCalls.length / data.length) * 100) : 0,
      pendingFollowUps: failedCalls.length
    }));

    // Análisis simplificado por operadora
    const operatorAnalysis = {};
    
    operators.forEach(op => {
      operatorAnalysis[op.name] = {
        operator: op.name,
        totalCalls: 0,
        totalMinutes: 0,
        avgDuration: 0
      };
    });
    
    // Procesar llamadas de manera optimizada
    data.forEach(call => {
      const assignment = assignments.find(a => a.beneficiary === call.beneficiary);
      if (assignment && operatorAnalysis[assignment.operator]) {
        operatorAnalysis[assignment.operator].totalCalls++;
        const duration = parseInt(call.duration) || 0;
        operatorAnalysis[assignment.operator].totalMinutes += duration / 60;
      }
    });

    // Calcular promedios
    Object.values(operatorAnalysis).forEach(op => {
      op.avgDuration = op.totalCalls > 0 ? Math.round(op.totalMinutes / op.totalCalls) : 0;
      op.totalMinutes = Math.round(op.totalMinutes);
    });

    setOperatorMetrics(Object.values(operatorAnalysis));
    generateHourlyDistribution(data);
  };

  // ✅ ELIMINADO: generateFollowUpHistory ahora usa datos de Zustand directamente
  // La función getFollowUpData en Zustand ya maneja el formateo de fechas correctamente

  // Generar distribución horaria basada en datos reales
  const generateHourlyDistribution = (callData) => {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      calls: 0
    }));
    
    callData.forEach(call => {
      if (call.startTime) {
        const hour = parseInt(call.startTime.split(':')[0]) || 0;
        if (hour >= 0 && hour < 24) {
          hourlyData[hour].calls++;
        }
      }
    });
    
    setHourlyDistribution(hourlyData);
  };

  // 🔧 CORRECCIÓN: Usar operatorAssignments directamente en lugar de Zustand
  // Crear array de asignaciones desde operatorAssignments local (fuente de verdad)
  const createAssignmentsFromLocal = () => {
    const localAssignments = [];
    
    // Logs de render comentados para evitar ciclos infinitos
    // console.log('🔍 App.jsx - operatorAssignments (fuente de verdad):', operatorAssignments);
    // console.log('🔍 App.jsx - operators disponibles:', operators);
    
    Object.entries(operatorAssignments).forEach(([operatorId, assignments]) => {
      const operator = operators.find(op => op.id === operatorId);
      if (operator && assignments && Array.isArray(assignments)) {
        // console.log(`� Procesando asignaciones para ${operator.name}:`, assignments.length);
        assignments.forEach(assignment => {
          const assignmentData = {
            id: assignment.id,
            operator: operator.name,           // ⭐ Campo principal
            operatorName: operator.name,      // ⭐ Campo alternativo
            beneficiary: assignment.beneficiary,
            phone: assignment.primaryPhone,
            commune: assignment.commune
          };
          localAssignments.push(assignmentData);
        });
      } else {
        // Solo log de errores críticos
        if (operators.length > 0) {
          console.warn(`⚠️ Problemas con operador ${operatorId}:`, {
            operatorFound: !!operator,
            assignmentsType: typeof assignments,
            isArray: Array.isArray(assignments)
          });
        }
      }
    });
    
    // Logs de diagnóstico comentados para evitar spam
    // console.log('📊 Total asignaciones locales:', localAssignments.length);
    // console.log('🔍 DIAGNÓSTICO - Buscando Hermes Eduardo Valbuena Romero en resultado final...');
    // const hermesInFinal = localAssignments.find(ass => 
    //   ass.beneficiary?.includes('Hermes') || 
    //   ass.beneficiary?.includes('HERMES')
    // );
    // if (hermesInFinal) {
    //   console.log('🎯 Hermes encontrado en resultado final:', hermesInFinal);
    // } else {
    //   console.log('❌ Hermes NO encontrado en resultado final');
    //   console.log('📋 Primeros 5 beneficiarios disponibles:', localAssignments.slice(0, 5).map(a => a.beneficiary));
    // }
    
    return localAssignments;
  };
  
  const assignmentsToUse = createAssignmentsFromLocal();
  
  // Debug logs comentados para evitar ciclos infinitos
  // console.log('🎯 App.jsx - assignmentsToUse final:', assignmentsToUse);
  
  const followUpData = getFollowUpData(assignmentsToUse);
  
  // console.log('📊 App.jsx - followUpData resultado:', followUpData);
  
  // Filtros para historial de seguimientos
  const filteredFollowUps = followUpData.filter(item => {
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    const matchesSearch = item.beneficiary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.operator.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const MetricCard = ({ title, value, subtitle, icon: Icon, trend, color = "blue" }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600 mb-1`}>{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="flex items-center">
          <Icon className={`w-8 h-8 text-${color}-500 mr-2`} />
          {trend && (
            <div className={`flex items-center ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const Sidebar = () => {
    // Mapeo de iconos para los módulos
    const iconMap = {
      dashboard: BarChart3,
      calls: Phone,
      assignments: Users,
      beneficiaries: Database,
      seguimientos: Activity,
      history: Clock,
      audit: BarChart3,
      reports: PieChart,
      config: Settings
    };

    return (
      <div className="w-64 bg-white shadow-lg h-full flex flex-col">
        <div className="p-6 flex-1">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Mistatas - Seguimiento de llamadas</h2>
          <p className="text-xs text-gray-500 mb-6">© 2025</p>
          
          <nav className="space-y-2">
            {visibleModules.map((module) => {
              const IconComponent = iconMap[module.id] || BarChart3;
              return (
                <SidebarItem 
                  key={module.id}
                  icon={IconComponent} 
                  label={module.label} 
                  active={activeTab === module.id}
                  onClick={() => setActiveTab(module.id)}
                />
              );
            })}
          </nav>
          
          {/* Indicador de rol para debugging */}
          {userProfile && (
            <div className="mt-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                Rol: <span className="font-medium">{userProfile.role}</span>
              </p>
              {isSuperAdmin && (
                <p className="text-xs text-blue-600 font-medium">
                  ⚡ Super Administrador
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* User Info and Logout */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.displayName || userProfile?.name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          
          {/* Indicador de estado de conexión */}
          <div className="mb-4 p-2 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                firebaseStatus === 'connected' ? 'bg-green-500' : 
                firebaseStatus === 'connecting' ? 'bg-yellow-500' : 'bg-orange-500'
              }`}></div>
              <span className="text-xs text-gray-600">
                {firebaseStatus === 'connected' ? 'Firebase conectado' : 
                 firebaseStatus === 'connecting' ? 'Conectando...' : 'Modo demo'}
              </span>
            </div>
            {callData.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {callData.length} llamadas cargadas
              </p>
            )}
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  };

  const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
        active 
          ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500' 
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      <span className="text-sm">{label}</span>
    </button>
  );

  // Componente de estado de datos
  const DataStatusBanner = () => {
    // Usar zustandCallData como prioridad, callData local como respaldo
    const effectiveCallData = zustandCallData?.length > 0 ? zustandCallData : callData;
    
    const getStatusInfo = () => {
      if (firebaseStatus === 'connecting') {
        return {
          color: 'bg-yellow-50 border-yellow-200',
          icon: '🔄',
          title: 'Conectando...',
          message: 'Conectando con Firebase para cargar datos'
        };
      }
      
      if (firebaseStatus === 'connected') {
        if (effectiveCallData.length > 0) {
          return {
            color: 'bg-green-50 border-green-200',
            icon: '✅',
            title: 'Datos reales activos',
            message: `Mostrando datos reales de ${effectiveCallData.length} llamadas registradas`
          };
        } else {
          return {
            color: 'bg-blue-50 border-blue-200',
            icon: 'ℹ️',
            title: 'Firebase conectado - Sin datos de llamadas',
            message: 'Conectado a Firebase. Sube un archivo Excel para ver datos reales'
          };
        }
      }
      
      return {
        color: 'bg-orange-50 border-orange-200',
        icon: '⚠️',
        title: 'Modo demostración',
        message: 'Mostrando datos de ejemplo. Configura Firebase para persistencia completa'
      };
    };

    const status = getStatusInfo();
    
    const handleRefreshData = async () => {
      if (firebaseStatus === 'connected') {
        setDataLoaded(false);
        await loadUserData();
      }
    };
    
    return (
      <div className={`${status.color} border rounded-lg p-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-lg mr-3">{status.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-800">{status.title}</h3>
              <p className="text-sm text-gray-600">{status.message}</p>
              {/* DEBUG INFO */}
              <p className="text-xs text-gray-500 mt-1">
                Métricas: {zustandCallMetrics ? `${zustandCallMetrics.successfulCalls}/${zustandCallMetrics.totalCalls} exitosas` : 'Sin métricas'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {firebaseStatus === 'connected' && (
              <button
                onClick={handleRefreshData}
                className="px-3 py-1 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                title="Recargar datos desde Firebase"
              >
                🔄 Sincronizar
              </button>
            )}
            {/* BOTÓN DEBUG TEMPORAL */}
            {effectiveCallData.length > 0 && (
              <>
                <button
                  onClick={() => {
                    console.log('🔧 DEBUG: Forzando re-análisis...');
                    console.log('📊 Datos antes del re-análisis:', zustandCallMetrics);
                    forceReanalysis();
                  }}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  title="Forzar re-análisis de datos"
                >
                  🔧 Re-analizar
                </button>
                <button
                  onClick={() => {
                    console.log('🔍 DIAGNÓSTICO: Analizando datos reales...');
                    const callData = useCallStore.getState().callData;
                    if (callData && callData.length > 0) {
                      if (window.analyzeRealData) {
                        window.analyzeRealData(callData);
                      } else {
                        console.log('⚠️ Función de diagnóstico no disponible');
                        console.log('Datos disponibles:', callData.length, 'llamadas');
                        console.log('Muestra de datos:', callData.slice(0, 3));
                      }
                    } else {
                      console.log('❌ No hay datos disponibles para analizar');
                    }
                  }}
                  className="px-3 py-1 text-xs bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                  title="Diagnosticar datos reales del Excel (ver consola)"
                >
                  🔍 Diagnosticar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Dashboard = () => {
    // 🔧 SINCRONIZACIÓN: Si Zustand no tiene datos pero el estado local sí, sincronizar
    React.useEffect(() => {
      if (callData.length > 0 && (!zustandCallData || zustandCallData.length === 0)) {
        console.log('🔄 Sincronizando datos locales con Zustand:', callData.length);
        setZustandCallData(callData, 'sync');
      }
    }, [callData, zustandCallData, setZustandCallData]);

    // ✅ USAR MÉTRICAS DE ZUSTAND EN LUGAR DE ESTADO LOCAL
    const metrics = zustandCallMetrics || {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageDuration: 0,
      uniqueBeneficiaries: 0,
      protocolCompliance: 0
    };

    const operatorCount = zustandOperators.length;
    const activeAssignments = zustandOperatorAssignments ? Object.keys(zustandOperatorAssignments).length : 0;

    // 📊 ANÁLISIS OPTIMIZADO - Usar funciones del store optimizado sin logs excesivos
    const operatorMetrics = getOperatorMetrics(assignmentsToUse);
    const hourlyDistribution = getHourlyDistribution();
    
    // 🚨 OPTIMIZACIÓN: Métricas de emergencia simplificadas
    let finalOperatorMetrics = operatorMetrics;
    
    if (!operatorMetrics || operatorMetrics.length === 0) {
      // Crear métricas básicas sin loops complejos
      const emergencyMetrics = Object.entries(operatorAssignments).map(([operatorId, assignments]) => {
        const operator = operators.find(op => op.id === operatorId);
        if (operator && assignments && Array.isArray(assignments)) {
          const assignmentCount = assignments.length;
          const totalCalls = Math.max(1, Math.floor(metrics.totalCalls * (assignmentCount / Math.max(1, assignmentsToUse.length))));
          const successfulCalls = Math.floor(totalCalls * 0.6); // Estimación simplificada
          
          return {
            operatorName: operator.name,
            totalCalls: totalCalls,
            successfulCalls: successfulCalls,
            failedCalls: totalCalls - successfulCalls,
            averageDuration: 60,
            successRate: Math.round((successfulCalls / totalCalls) * 100),
            isEmergencyData: true
          };
        }
        return null;
      }).filter(Boolean);
      
      finalOperatorMetrics = emergencyMetrics;
    }
    
    // Asegurar que finalOperatorMetrics nunca sea undefined
    if (!finalOperatorMetrics || !Array.isArray(finalOperatorMetrics)) {
      finalOperatorMetrics = [];
    }
    
    // OPTIMIZACIÓN: Cálculos simplificados de rendimiento
    const successRate = metrics.totalCalls > 0 ? ((metrics.successfulCalls / metrics.totalCalls) * 100).toFixed(1) : 0;
    const failureRate = metrics.totalCalls > 0 ? ((metrics.failedCalls / metrics.totalCalls) * 100).toFixed(1) : 0;
    const avgCallsPerOperator = operatorCount > 0 ? (metrics.totalCalls / operatorCount).toFixed(1) : 0;
    const contactabilityRate = metrics.uniqueBeneficiaries > 0 ? ((metrics.successfulCalls / metrics.uniqueBeneficiaries) * 100).toFixed(1) : 0;

    // OPTIMIZACIÓN: Top performers con sort simplificado
    const topPerformers = finalOperatorMetrics
      .sort((a, b) => b.successfulCalls - a.successfulCalls)
      .slice(0, 3);

    const operatorWithMostCalls = finalOperatorMetrics.length > 0 ?
      finalOperatorMetrics.reduce((prev, current) => (prev.totalCalls > current.totalCalls) ? prev : current) : null;

    return (
    <div className="space-y-8">
      {/* Banner de estado de datos */}
      <DataStatusBanner />
      
      {/* 🎯 RESUMEN EJECUTIVO - Similar a análisis de IA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">📊 Resumen Ejecutivo de Teleasistencia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold">{successRate}%</div>
            <div className="text-sm opacity-90">Tasa de Éxito</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold">{metrics.uniqueBeneficiaries}</div>
            <div className="text-sm opacity-90">Beneficiarios Atendidos</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold">{avgCallsPerOperator}</div>
            <div className="text-sm opacity-90">Llamadas por Operadora</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold">{contactabilityRate}%</div>
            <div className="text-sm opacity-90">Tasa de Contactabilidad</div>
          </div>
        </div>
      </div>

      {/* 📈 MÉTRICAS PRINCIPALES CON ANÁLISIS PROFUNDO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Llamadas Exitosas</h3>
              <p className="text-3xl font-bold text-green-600">{metrics.successfulCalls}</p>
              <p className="text-sm text-gray-500">de {metrics.totalCalls} total</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Phone className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">{successRate}% de éxito</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Llamadas Fallidas</h3>
              <p className="text-3xl font-bold text-red-600">{metrics.failedCalls}</p>
              <p className="text-sm text-gray-500">sin contacto efectivo</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <Phone className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center text-sm">
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-red-600 font-medium">{failureRate}% de fallas</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Beneficiarios Únicos</h3>
              <p className="text-3xl font-bold text-blue-600">{metrics.uniqueBeneficiaries}</p>
              <p className="text-sm text-gray-500">personas atendidas</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-blue-600 font-medium">Cobertura poblacional</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Tiempo Promedio</h3>
              <p className="text-3xl font-bold text-purple-600">{Math.round(metrics.averageDuration / 60)}min</p>
              <p className="text-sm text-gray-500">por llamada</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 text-purple-500 mr-1" />
              <span className="text-purple-600 font-medium">Eficiencia temporal</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🏆 ANÁLISIS DE RENDIMIENTO POR OPERADORA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
            🏆 Top Performers
          </h3>
          {topPerformers.length > 0 ? (
            <div className="space-y-3">
              {topPerformers.map((operator, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-3 ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{operator.operatorName}</p>
                      <p className="text-sm text-gray-500">
                        {operator.totalCalls} llamadas
                        {operator.isEmergencyData && (
                          <span className="ml-1 text-xs text-yellow-600">(estimado)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{operator.successfulCalls}</p>
                    <p className="text-sm text-gray-500">exitosas</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-2">No hay datos de operadoras disponibles</p>
              <p className="text-sm text-gray-400">
                {operatorAssignments && Object.keys(operatorAssignments).length > 0 
                  ? '⚠️ Verifica que haya datos de llamadas cargados'
                  : '⚠️ Necesitas crear operadoras y asignar beneficiarios en el módulo Asignaciones'
                }
              </p>
            </div>
          )}
        </div>

        {/* Análisis de Productividad */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
            📊 Análisis de Productividad
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Operadora más activa</p>
              <p className="font-bold text-lg">{operatorWithMostCalls?.operatorName || 'N/A'}</p>
              <p className="text-sm text-blue-600">{operatorWithMostCalls?.totalCalls || 0} llamadas realizadas</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Tasa de éxito promedio</p>
              <p className="font-bold text-lg">{successRate}%</p>
              <p className="text-sm text-green-600">Indicador de calidad del servicio</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Cumplimiento de protocolo</p>
              <p className="font-bold text-lg">{metrics.protocolCompliance}%</p>
              <p className="text-sm text-purple-600">Adherencia a procedimientos</p>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 MÓDULOS DE ACCESO RÁPIDO */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-6">🚀 Acceso Rápido a Módulos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={() => setActiveTab('calls')}
            className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200 cursor-pointer hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center">
                <Phone className="w-8 h-8 text-white" />
              </div>
            </div>
            <h4 className="text-lg font-semibold text-green-800 mb-2">Registro de Llamadas</h4>
            <p className="text-sm text-green-700">Sube historiales Excel, analiza resultados y clasifica por beneficiario y teleoperadora.</p>
          </div>
          
          <div 
            onClick={() => setActiveTab('assignments')}
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200 cursor-pointer hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
            <h4 className="text-lg font-semibold text-blue-800 mb-2">Asignaciones</h4>
            <p className="text-sm text-blue-700">Gestiona relaciones entre beneficiarios y teleoperadoras de manera eficiente.</p>
          </div>
          
          <div 
            onClick={() => setActiveTab('history')}
            className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200 cursor-pointer hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center">
                <Clock className="w-8 h-8 text-white" />
              </div>
            </div>
            <h4 className="text-lg font-semibold text-purple-800 mb-2">Historial de Seguimientos</h4>
            <p className="text-sm text-purple-700">Clasifica beneficiarios por frecuencia y estado de contacto para seguimiento.</p>
          </div>
        </div>
      </div>

      {/* 📊 TABLA DETALLADA DE OPERADORAS */}
      {finalOperatorMetrics.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 text-indigo-500 mr-2" />
            📊 Detalle Completo por Teleoperadora
            {finalOperatorMetrics.some(m => m.isEmergencyData) && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                Datos Estimados
              </span>
            )}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operadora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Llamadas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exitosas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fallidas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasa Éxito
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rendimiento
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {finalOperatorMetrics.map((operator, index) => {
                  const operatorSuccessRate = operator.totalCalls > 0 ? ((operator.successfulCalls / operator.totalCalls) * 100).toFixed(1) : 0;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-indigo-600 font-semibold text-sm">
                              {operator.operatorName?.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{operator.operatorName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {operator.totalCalls}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {operator.successfulCalls}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {operator.failedCalls}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          parseFloat(operatorSuccessRate) >= 70 ? 'bg-green-100 text-green-800' : 
                          parseFloat(operatorSuccessRate) >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {operatorSuccessRate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                parseFloat(operatorSuccessRate) >= 70 ? 'bg-green-500' : 
                                parseFloat(operatorSuccessRate) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(parseFloat(operatorSuccessRate), 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {parseFloat(operatorSuccessRate) >= 70 ? '🎯 Excelente' : 
                             parseFloat(operatorSuccessRate) >= 50 ? '⚠️ Regular' : '📉 Revisar'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    );
  };

  const ModuleCard = ({ title, description, icon: Icon, color, onClick }) => (
    <div className={`bg-${color}-50 rounded-lg p-6 border border-${color}-200`}>
      <div className="flex items-center justify-center mb-4">
        <div className={`w-16 h-16 bg-${color}-500 rounded-lg flex items-center justify-center`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
      <h4 className="text-lg font-semibold text-gray-800 mb-2">{title}</h4>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <button
        onClick={onClick}
        className={`w-full bg-${color}-500 text-white py-2 px-4 rounded-lg hover:bg-${color}-600 transition-colors`}
      >
        Entrar
      </button>
    </div>
  );

  const CallsRegistry = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Registro de Llamadas</h3>
        <p className="text-gray-600 mb-6">
          Sube el archivo Excel con el registro de llamadas para realizar el análisis automático.
        </p>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <label className="cursor-pointer">
            <span className="text-blue-600 font-medium">Seleccionar archivo Excel</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <p className="text-sm text-gray-500 mt-2">
            Formatos soportados: .xlsx, .xls
          </p>
        </div>
        
        {/* Estado de Carga */}
        {isLoading && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <div>
                <h4 className="text-sm font-medium text-blue-900">
                  {loadingStage === 'uploading' && '📤 Subiendo archivo...'}
                  {loadingStage === 'processing' && '⚙️ Procesando datos...'}
                  {loadingStage === 'analyzing' && '📊 Analizando llamadas...'}
                </h4>
                <p className="text-sm text-blue-700">
                  {loadingMessage}
                </p>
              </div>
            </div>
            
            {/* Barra de progreso visual */}
            <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width: loadingStage === 'uploading' ? '25%' : 
                         loadingStage === 'processing' ? '50%' : 
                         loadingStage === 'analyzing' ? '75%' : '100%'
                }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Estado de Éxito */}
        {loadingStage === 'complete' && !isLoading && zustandCallData.length > 0 && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-green-900">
                  ✅ Análisis completado exitosamente
                </h4>
                <p className="text-sm text-green-700">
                  {loadingMessage}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Estado de Error */}
        {loadingStage === 'error' && !isLoading && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-red-900">
                  ❌ Error en el procesamiento
                </h4>
                <p className="text-sm text-red-700">
                  {loadingMessage}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Por favor, verifica el formato del archivo e intenta nuevamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {zustandCallData.length > 0 && (
        <>
          {/* Resumen de datos procesados */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Resumen del Análisis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{zustandCallData.length}</div>
                <div className="text-sm text-gray-600">Total Llamadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {zustandCallData.filter(call => call.categoria === 'exitosa' || call.resultado === 'Llamado exitoso').length}
                </div>
                <div className="text-sm text-gray-600">Exitosas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {zustandCallData.filter(call => call.categoria !== 'exitosa' && call.resultado !== 'Llamado exitoso').length}
                </div>
                <div className="text-sm text-gray-600">Fallidas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {new Set(zustandCallData.map(call => call.beneficiario).filter(Boolean)).size}
                </div>
                <div className="text-sm text-gray-600">Beneficiarios</div>
              </div>
            </div>
          </div>
          
          {/* Tabla de datos */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Datos Procesados</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Beneficiario</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Comuna</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Operador</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Tipo</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Resultado</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {zustandCallData.slice(0, 10).map((call, index) => (
                    <tr key={call.id || index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{call.id || `call-${index}`}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{call.fecha || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{call.beneficiario || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{call.comuna || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{call.operador || 'No identificado'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          call.tipo_llamada === 'entrante' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {call.tipo_llamada === 'entrante' ? 'Entrante' : 'Saliente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          call.resultado === 'Llamado exitoso' || call.categoria === 'exitosa'
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {call.resultado || (call.categoria === 'exitosa' ? 'Exitoso' : 'Fallido')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{call.duracion || 0}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Mostrar información adicional */}
              <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                <span>Mostrando {Math.min(10, zustandCallData.length)} de {zustandCallData.length} llamadas procesadas</span>
                {zustandCallData.length > 10 && (
                  <span className="text-blue-600">Mostrando solo las primeras 10 filas</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const Assignments = () => (
    <div className="space-y-6">
      {/* Header con botón para crear operador */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">Gestión de Asignaciones</h3>
            <p className="text-gray-600 mt-1">
              Gestiona teleoperadores y sus asignaciones de beneficiarios
            </p>
          </div>
          <button
            onClick={() => setShowCreateOperator(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Crear Teleoperador
          </button>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Teleoperadores</p>
                <p className="text-2xl font-bold text-blue-600">{operators.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Beneficiarios Asignados</p>
                <p className="text-2xl font-bold text-green-600">
                  {Object.values(operatorAssignments).reduce((acc, assignments) => acc + assignments.length, 0)}
                </p>
              </div>
              <Phone className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Operadores con Asignaciones</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Object.keys(operatorAssignments).length}
                </p>
              </div>
              <FileSpreadsheet className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Buscador de Beneficiarios */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-800">Búsqueda de Beneficiarios</h4>
            <p className="text-sm text-gray-600">Encuentra rápidamente qué teleoperadora está asignada a un beneficiario</p>
          </div>
          <button
            onClick={() => setShowBeneficiarySearch(!showBeneficiarySearch)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              showBeneficiarySearch 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            <Search className="w-4 h-4" />
            {showBeneficiarySearch ? 'Cerrar Búsqueda' : 'Buscar Beneficiario'}
          </button>
        </div>

        {showBeneficiarySearch && (
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Buscar por nombre del beneficiario, teleoperadora, teléfono o comuna..."
                  value={beneficiarySearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleBeneficiarySearch(value);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  setBeneficiarySearchTerm('');
                  setBeneficiarySearchResults([]);
                }}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resultados de búsqueda */}
            {beneficiarySearchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto">
                <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                  {beneficiarySearchResults.length} resultado(s) encontrado(s)
                </div>
                {beneficiarySearchResults.map((result, index) => (
                  <div key={`${result.id || index}-${result.source}`} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-semibold text-gray-900">
                            {result.beneficiary || result.beneficiario}
                          </h5>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                            Beneficiario
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {result.source}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span><strong>Teleoperadora:</strong> {result.operatorName || result.operator || 'Sin asignar'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span><strong>Teléfono Principal:</strong> {result.primaryPhone || result.phone || result.telefono || result.numero_cliente || 'N/A'}</span>
                          </div>
                          {result.phones && result.phones.length > 1 && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span><strong>Otros Teléfonos:</strong> {result.phones.slice(1).join(', ')}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                            <span><strong>Comuna:</strong> {result.commune || result.comuna || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {beneficiarySearchTerm && beneficiarySearchResults.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>No se encontraron beneficiarios que coincidan con "{beneficiarySearchTerm}"</p>
                <p className="text-sm mt-1">Intenta con otro término de búsqueda</p>
              </div>
            )}

            {!beneficiarySearchTerm && (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>Escribe el nombre de un beneficiario, teleoperadora, teléfono o comuna para buscar</p>
                <p className="text-sm mt-1">La búsqueda incluye todas las asignaciones registradas</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para crear operador */}
      {showCreateOperator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold">Crear Nuevo Teleoperador</h4>
              <button
                onClick={() => setShowCreateOperator(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={operatorForm.name}
                  onChange={(e) => setOperatorForm({...operatorForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: María González"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={operatorForm.email}
                  onChange={(e) => setOperatorForm({...operatorForm, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="maria.gonzalez@central.cl"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={operatorForm.phone}
                  onChange={(e) => setOperatorForm({...operatorForm, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="987654321"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateOperator}
                disabled={!operatorForm.name.trim()}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Crear Teleoperador
              </button>
              <button
                onClick={() => setShowCreateOperator(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de operadores */}
      <div className="space-y-4">
        {operators.filter(operator => operator && operator.id).map((operator) => (
          <div key={operator.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-lg font-semibold text-gray-900">{operator.name || 'Operador sin nombre'}</h4>
                  {operatorAssignments[operator.id] && (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                      {operatorAssignments[operator.id].length} beneficiarios
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  {operator.email && <p>📧 {operator.email}</p>}
                  {operator.phone && <p>📞 {operator.phone}</p>}
                </div>
              </div>
              
              <div className="flex gap-2">
                <label className="cursor-pointer bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm">
                  <Upload className="w-4 h-4" />
                  Subir Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileUploadForOperator(e, operator.id)}
                    className="hidden"
                  />
                </label>
                
                {operatorAssignments[operator.id] && (
                  <button
                    onClick={() => clearOperatorAssignments(operator.id)}
                    className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpiar
                  </button>
                )}
                
                <button
                  onClick={() => handleDeleteOperator(operator.id)}
                  className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>

            {/* Formato de Excel esperado */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Formato Excel esperado:</h5>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Columna A:</strong> Nombre del beneficiario</p>
                <p><strong>Columna B:</strong> Teléfono(s) - separados por |, - o espacios (9 dígitos cada uno)</p>
                <p><strong>Columna C:</strong> Comuna</p>
              </div>
            </div>

            {/* Mostrar asignaciones si existen */}
            {operatorAssignments[operator.id] && operatorAssignments[operator.id].length > 0 && (
              <div className="border-t pt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-3">
                  Beneficiarios Asignados ({operatorAssignments[operator.id].length})
                </h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Beneficiario</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Teléfono Principal</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Otros Teléfonos</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Comuna</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operatorAssignments[operator.id].slice(0, 5).map((assignment) => (
                        <tr key={assignment.id} className="border-b">
                          <td className="px-3 py-2 text-gray-900">{assignment.beneficiary}</td>
                          <td className="px-3 py-2 text-gray-900">{assignment.primaryPhone}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {assignment.phones.length > 1 ? 
                              assignment.phones.slice(1).join(', ') : 
                              '-'
                            }
                          </td>
                          <td className="px-3 py-2 text-gray-900">{assignment.commune}</td>
                        </tr>
                      ))}
                      {operatorAssignments[operator.id].length > 5 && (
                        <tr>
                          <td colSpan="4" className="px-3 py-2 text-center text-gray-500 text-sm">
                            ... y {operatorAssignments[operator.id].length - 5} beneficiarios más
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}

        {operators.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No hay teleoperadores</h4>
            <p className="text-gray-600 mb-4">Crea tu primer teleoperador para comenzar a gestionar asignaciones</p>
            <button
              onClick={() => setShowCreateOperator(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto"
            >
              <UserPlus className="w-4 h-4" />
              Crear Primer Teleoperador
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const FollowUpHistory = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Historial de Seguimientos</h3>
        <p className="text-gray-600 mb-6">
          Clasifica beneficiarios por frecuencia y estado de contacto.
        </p>
        
        {/* Estadísticas de seguimiento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-800 font-semibold">Al día</p>
                <p className="text-2xl font-bold text-green-600">
                  {followUpData.filter(f => f.status === 'al-dia').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-800 font-semibold">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {followUpData.filter(f => f.status === 'pendiente').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">⏳</span>
              </div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-800 font-semibold">Urgentes</p>
                <p className="text-2xl font-bold text-red-600">
                  {followUpData.filter(f => f.status === 'urgente').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">⚠</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="al-dia">Al día</option>
              <option value="pendiente">Pendiente</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar beneficiario o teleoperadora..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Tarjetas de seguimiento */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFollowUps.length === 0 ? (
            <div className="col-span-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center">
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No hay datos de seguimiento
                </h4>
                <p className="text-gray-600 mb-4 max-w-md">
                  {!hasCallData ? 
                    'Para ver el historial de seguimientos, sube un archivo Excel con datos de llamadas desde el Panel Principal.' :
                    'No se encontraron seguimientos que coincidan con los filtros aplicados.'
                  }
                </p>
                {!hasCallData && (
                  <div className="text-sm text-gray-500">
                    💡 Ve al <strong>Panel Principal</strong> → <strong>Cargar Excel</strong> para comenzar
                  </div>
                )}
              </div>
            </div>
          ) : (
            filteredFollowUps.map((item) => (
            <div key={item.id} className={`border-2 rounded-lg p-4 hover:shadow-md transition-shadow ${
              item.status === 'al-dia' ? 'border-green-200 bg-green-50' :
              item.status === 'pendiente' ? 'border-yellow-200 bg-yellow-50' :
              'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{item.beneficiary}</h4>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.status === 'al-dia' 
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : item.status === 'pendiente'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {item.status === 'al-dia' ? '✅ Al día' : 
                   item.status === 'pendiente' ? '⏳ Pendiente' : '⚠️ Urgente'}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-700">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium">Teleoperadora:</span>
                  <span className="ml-1">{item.operator}</span>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <Phone className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium">Teléfono:</span>
                  <span className="ml-1">{item.phone}</span>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <Clock className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium">Última llamada:</span>
                  <span className="ml-1">{item.lastCall}</span>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <BarChart3 className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium">Llamadas:</span>
                  <span className="ml-1">{item.callCount} total ({item.successfulCallCount || 0} exitosas)</span>
                </div>
                
                {item.daysSinceLastCall !== null && (
                  <div className="flex items-center text-gray-700">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="font-medium">Hace:</span>
                    <span className="ml-1">{item.daysSinceLastCall} días</span>
                  </div>
                )}
                
                {item.lastCallResult && item.lastCallResult !== 'Sin resultado' && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                    <span className="font-medium">Último resultado:</span>
                    <span className="ml-1">{item.lastCallResult}</span>
                  </div>
                )}
              </div>
              
              {item.statusReason && (
                <div className={`mt-3 p-2 rounded text-xs ${
                  item.status === 'al-dia' ? 'bg-green-100 text-green-700' :
                  item.status === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  <div className="flex items-start">
                    {item.status === 'urgente' && <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />}
                    <span>{item.statusReason}</span>
                  </div>
                </div>
              )}
            </div>
          )))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === 'dashboard' && 'Panel principal'}
              {activeTab === 'calls' && 'Registro de Llamadas'}
              {activeTab === 'assignments' && 'Asignaciones'}
              {activeTab === 'beneficiaries' && 'Beneficiarios Base'}
              {activeTab === 'seguimientos' && 'Seguimientos Periódicos'}
              {activeTab === 'history' && 'Historial de Seguimientos'}
              {activeTab === 'audit' && 'Auditoría Avanzada'}
              {activeTab === 'metrics' && 'Métricas Avanzadas'}
              {activeTab === 'config' && 'Configuración del Sistema'}
            </h1>
          </div>

          {/* Firebase Status Alert */}
          {firebaseStatus === 'demo' && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-blue-800 font-medium">Modo Local</h3>
                  <p className="text-blue-700 text-sm mt-1">
                    La aplicación funciona con datos locales. Para persistencia en la nube, completa la configuración de Firebase.
                  </p>
                  <p className="text-blue-600 text-xs mt-2">
                    📖 Consulta FIREBASE_SETUP.md para instrucciones de configuración
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {firebaseStatus === 'connecting' && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-slate-700 text-sm">Verificando configuración de Firebase...</span>
              </div>
            </div>
          )}
          
          {activeTab === 'dashboard' && (
            <ErrorBoundary>
              <Dashboard />
            </ErrorBoundary>
          )}
          {activeTab === 'calls' && <CallsRegistry />}
          {activeTab === 'assignments' && <Assignments />}
          {activeTab === 'beneficiaries' && (
            <ErrorBoundary>
              <BeneficiariosBase />
            </ErrorBoundary>
          )}
          {activeTab === 'seguimientos' && (
            <ErrorBoundary>
              <TeleoperadoraDashboard />
            </ErrorBoundary>
          )}
          {activeTab === 'history' && <FollowUpHistory />}
          {activeTab === 'audit' && (
            <ErrorBoundary>
              <AuditDemo />
            </ErrorBoundary>
          )}
          {activeTab === 'metrics' && (
            <ErrorBoundary>
              <MetricsTestPanel />
            </ErrorBoundary>
          )}
          {activeTab === 'config' && canViewConfig && (
            <ErrorBoundary>
              <SuperAdminDashboard />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeleasistenciaApp;