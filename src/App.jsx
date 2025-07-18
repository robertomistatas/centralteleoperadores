import React, { useState, useEffect, useRef } from 'react';
import { Phone, Users, Clock, TrendingUp, TrendingDown, Upload, Search, Filter, BarChart3, PieChart, Calendar, AlertCircle, Plus, Edit, Trash2, UserPlus, FileSpreadsheet, Save, X, LogOut, User } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from './AuthContext';
import { operatorService, assignmentService, callDataService } from './firestoreService';

const TeleasistenciaApp = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [callData, setCallData] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [followUpHistory, setFollowUpHistory] = useState([]);
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

  // Cargar datos del usuario desde Firestore
  const loadUserData = async () => {
    if (loadingRef.current) return; // Evitar cargas múltiples
    
    loadingRef.current = true;
    setFirebaseStatus('connecting');
    
    try {
      // Cargar operadores
      const userOperators = await operatorService.getByUser(user.uid);
      
      // Verificar si la operación fue exitosa
      if (userOperators !== null) {
        setOperators(userOperators || []);

        // Cargar asignaciones
        const userAssignments = await assignmentService.getAllUserAssignments(user.uid);
        setOperatorAssignments(userAssignments || {});

        // Cargar datos de llamadas
        const userCallData = await callDataService.getCallData(user.uid);
        setCallData(userCallData || []);

        // Generar assignments generales para compatibilidad
        generateGeneralAssignments(userAssignments || {}, userOperators || []);
        
        // Generar datos de métricas
        generateSampleData();
        
        setFirebaseStatus('connected');
        setDataLoaded(true);
        console.log('✅ Conectado a Firebase - persistencia habilitada');
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
    // Generar datos de ejemplo
    const operators = ['María González', 'Ana Rodríguez', 'Luis Martínez', 'Carmen Torres', 'Pedro Sánchez'];
    const sampleMetrics = operators.map(op => ({
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
    
    // Actualizar métricas del dashboard
    setDashboardMetrics({
      totalCalls: 150,
      successfulCalls: 120,
      failedCalls: 30,
      beneficiaries: 85,
      activeAssignments: 5,
      operators: 5,
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
    
    const sampleFollowUps = sampleAssignments.map(assignment => ({
      ...assignment,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      lastCall: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      callCount: Math.floor(Math.random() * 10) + 1,
      colorClass: statusColors[statuses[Math.floor(Math.random() * statuses.length)]]
    }));

    setFollowUpHistory(sampleFollowUps);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Procesar datos del Excel
        processExcelData(jsonData);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processExcelData = (data) => {
    if (data.length < 2) return;
    
    const processedData = data.slice(1).map(row => ({
      id: row[0],
      date: row[1],
      beneficiary: row[2],
      commune: row[3],
      event: row[4],
      phone: row[5],
      startTime: row[6],
      endTime: row[7],
      duration: row[8],
      result: row[9],
      observation: row[10],
      apiId: row[11]
    }));

    setCallData(processedData);
    
    // Analizar datos y actualizar métricas
    analyzeCallData(processedData);
  };

  const analyzeCallData = (data) => {
    const successfulCalls = data.filter(call => call.result === 'Llamado exitoso');
    const incomingCalls = successfulCalls.filter(call => call.event === 'Entrante');
    const outgoingCalls = successfulCalls.filter(call => call.event === 'Saliente');
    
    // Actualizar métricas
    setDashboardMetrics(prev => ({
      ...prev,
      totalCalls: data.length,
      successfulCalls: successfulCalls.length,
      failedCalls: data.length - successfulCalls.length
    }));

    // Análisis por teleoperadora
    const operatorAnalysis = {};
    successfulCalls.forEach(call => {
      const assignment = assignments.find(a => a.beneficiary === call.beneficiary);
      if (assignment) {
        if (!operatorAnalysis[assignment.operator]) {
          operatorAnalysis[assignment.operator] = {
            operator: assignment.operator,
            totalCalls: 0,
            totalMinutes: 0,
            avgDuration: 0
          };
        }
        operatorAnalysis[assignment.operator].totalCalls++;
        operatorAnalysis[assignment.operator].totalMinutes += parseInt(call.duration) / 60 || 0;
      }
    });

    // Calcular promedio de duración
    Object.values(operatorAnalysis).forEach(op => {
      op.avgDuration = op.totalCalls > 0 ? op.totalMinutes / op.totalCalls : 0;
    });

    setOperatorMetrics(Object.values(operatorAnalysis));
  };

  const filteredFollowUps = followUpHistory.filter(item => {
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

  const Sidebar = () => (
    <div className="w-64 bg-white shadow-lg h-full flex flex-col">
      <div className="p-6 flex-1">
        <h2 className="text-xl font-bold text-gray-800 mb-2">WebApp de Seguimiento de Llamadas</h2>
        <p className="text-xs text-gray-500 mb-6">© 2025</p>
        
        <nav className="space-y-2">
          <SidebarItem 
            icon={BarChart3} 
            label="Panel principal" 
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
          <SidebarItem 
            icon={Phone} 
            label="Registro de Llamadas" 
            active={activeTab === 'calls'}
            onClick={() => setActiveTab('calls')}
          />
          <SidebarItem 
            icon={Users} 
            label="Asignaciones" 
            active={activeTab === 'assignments'}
            onClick={() => setActiveTab('assignments')}
          />
          <SidebarItem 
            icon={Clock} 
            label="Historial de Seguimientos" 
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
          />
        </nav>
      </div>
      
      {/* User Info and Logout */}
      <div className="p-6 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.displayName || 'Usuario'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
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

  const Dashboard = () => (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Llamadas totales"
          value={dashboardMetrics.totalCalls}
          subtitle="Cantidad total de llamadas registradas"
          icon={Phone}
          color="blue"
        />
        <MetricCard
          title="Llamadas exitosas"
          value={dashboardMetrics.successfulCalls}
          subtitle="Llamadas con resultado exitoso"
          icon={Phone}
          trend={1}
          color="green"
        />
        <MetricCard
          title="Llamadas no exitosas"
          value={dashboardMetrics.failedCalls}
          subtitle="No contestadas, fallidas u otro"
          icon={Phone}
          trend={-1}
          color="red"
        />
        <MetricCard
          title="Beneficiarios"
          value={dashboardMetrics.beneficiaries}
          subtitle="Personas beneficiarias en la base de datos"
          icon={Users}
          color="purple"
        />
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Asignaciones activas"
          value={dashboardMetrics.activeAssignments}
          subtitle="Relaciones vigentes beneficiario-teleoperadora"
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Teleoperadoras"
          value={dashboardMetrics.operators}
          subtitle="Cantidad de teleoperadoras registradas"
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Cumplimiento protocolo"
          value={`${dashboardMetrics.protocolCompliance}%`}
          subtitle="Promedio de cumplimiento en llamadas"
          icon={BarChart3}
          color="blue"
        />
        <MetricCard
          title="Seguimientos pendientes"
          value={dashboardMetrics.pendingFollowUps}
          subtitle="Seguimientos aún no realizados"
          icon={Clock}
          trend={-1}
          color="red"
        />
      </div>

      {/* Módulos principales */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-6">Módulos principales</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ModuleCard
            title="Registro de Llamadas"
            description="Sube historiales, analiza resultados y clasifica por beneficiario y teleoperadora."
            icon={Phone}
            color="green"
            onClick={() => setActiveTab('calls')}
          />
          <ModuleCard
            title="Asignaciones"
            description="Gestiona relaciones entre beneficiarios y teleoperadoras."
            icon={Users}
            color="blue"
            onClick={() => setActiveTab('assignments')}
          />
          <ModuleCard
            title="Historial de Seguimientos"
            description="Clasifica beneficiarios por frecuencia y estado de contacto."
            icon={Clock}
            color="orange"
            onClick={() => setActiveTab('history')}
          />
        </div>
      </div>

      {/* Detalle por Teleoperadora */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Detalle por Teleoperadora</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Teleoperadora</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Cantidad de llamados</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Minutos totales</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Tiempo promedio</th>
              </tr>
            </thead>
            <tbody>
              {operatorMetrics.map((metric, index) => (
                <tr key={index} className="border-b">
                  <td className="px-4 py-3 text-sm text-gray-900">{metric.operator}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{metric.totalCalls}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{Math.round(metric.totalMinutes)} min</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{Math.round(metric.avgDuration)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

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
      </div>

      {callData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Datos Procesados</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">ID</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Beneficiario</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Evento</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Resultado</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Duración</th>
                </tr>
              </thead>
              <tbody>
                {callData.slice(0, 10).map((call, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-3 text-sm text-gray-900">{call.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{call.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{call.beneficiary}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{call.event}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        call.result === 'Llamado exitoso' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {call.result}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{call.duration}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
          {filteredFollowUps.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900">{item.beneficiary}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.status === 'al-dia' 
                    ? 'bg-green-100 text-green-800'
                    : item.status === 'pendiente'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {item.status === 'al-dia' ? 'Al día' : 
                   item.status === 'pendiente' ? 'Pendiente' : 'Urgente'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Teleoperadora: {item.operator}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Última llamada: {item.lastCall}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Total llamadas: {item.callCount}
              </p>
              <p className="text-sm text-gray-600">
                Teléfono: {item.phone}
              </p>
              {item.status === 'urgente' && (
                <div className="mt-2 flex items-center text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Requiere atención inmediata
                </div>
              )}
            </div>
          ))}
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
              {activeTab === 'history' && 'Historial de Seguimientos'}
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
          
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'calls' && <CallsRegistry />}
          {activeTab === 'assignments' && <Assignments />}
          {activeTab === 'history' && <FollowUpHistory />}
        </div>
      </div>
    </div>
  );
};

export default TeleasistenciaApp;