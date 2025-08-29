import React, { useState, useEffect, useRef } from 'react';
import { Phone, Users, Clock, TrendingUp, TrendingDown, Upload, Search, Filter, BarChart3, PieChart, Calendar, AlertCircle, Plus, Edit, Trash2, UserPlus, FileSpreadsheet, Save, X, LogOut, User, Zap, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from './AuthContext';
import { operatorService, assignmentService, callDataService } from './firestoreService';
import { useCallStore, useAppStore } from './stores';
import ErrorBoundary from './components/ErrorBoundary';

// Importaciones directas sin lazy loading
import AuditDemo from './components/examples/AuditDemo';
import ZustandTest from './test/ZustandTest';

// Componente de loading simple
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Cargando...</span>
  </div>
);

function Dashboard() {
  const { 
    callMetrics, 
    isLoading, 
    loadingMessage,
    getOperatorMetrics 
  } = useCallStore();
  
  const { operators, getAllAssignments } = useAppStore();

  // Estado para métricas de operadores
  const [operatorMetrics, setOperatorMetrics] = useState([]);

  // Cargar métricas de operadores cuando cambien los datos
  useEffect(() => {
    if (!isLoading) {
      const assignments = getAllAssignments();
      const metrics = getOperatorMetrics(assignments);
      setOperatorMetrics(metrics);
    }
  }, [callMetrics, isLoading, getAllAssignments, getOperatorMetrics]);

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
        {loadingMessage && (
          <p className="text-center text-gray-600 mt-4">{loadingMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Tarjetas de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Phone className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Llamadas</p>
              <p className="text-2xl font-bold text-gray-900">{callMetrics.totalCalls}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Llamadas Exitosas</p>
              <p className="text-2xl font-bold text-gray-900">{callMetrics.successfulCalls}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Llamadas Fallidas</p>
              <p className="text-2xl font-bold text-gray-900">{callMetrics.failedCalls}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Duración Promedio</p>
              <p className="text-2xl font-bold text-gray-900">{callMetrics.averageDuration}s</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detalle por Teleoperadora */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Detalle por Teleoperadora</h3>
        {operatorMetrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
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
                    Duración Prom.
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {operatorMetrics.map((operator, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {operator.operatorName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {operator.totalCalls}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {operator.successfulCalls}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {operator.failedCalls}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {operator.successRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {operator.averageDuration}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            No hay datos de operadores disponibles
          </p>
        )}
      </div>
    </div>
  );
}

function BeneficiarySearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { getAllAssignments } = useAppStore();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const assignments = getAllAssignments();
      const results = Object.values(assignments)
        .flat()
        .filter(assignment => 
          assignment.beneficiary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assignment.operatorName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error en búsqueda:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Búsqueda de Beneficiarios</h2>
        
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre de beneficiario u operadora..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beneficiario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operadora Asignada
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchResults.map((result, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.beneficiary}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.operatorName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {searchTerm && searchResults.length === 0 && !isSearching && (
          <p className="text-gray-500 text-center py-4">
            No se encontraron resultados para "{searchTerm}"
          </p>
        )}
      </div>
    </div>
  );
}

function CallHistory() {
  const { processedData, getFilteredData, setFilters, filters } = useCallStore();

  const handleFilterChange = (filterType, value) => {
    setFilters({ [filterType]: value });
  };

  const filteredData = getFilteredData();

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Historial de Llamadas</h2>
        
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="successful">Exitosas</option>
              <option value="failed">Fallidas</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Operador</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.operator}
              onChange={(e) => handleFilterChange('operator', e.target.value)}
            >
              <option value="all">Todos</option>
              {[...new Set(processedData.map(call => call.operator))].map(operator => (
                <option key={operator} value={operator}>{operator}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comuna</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.commune}
              onChange={(e) => handleFilterChange('commune', e.target.value)}
            >
              <option value="all">Todas</option>
              {[...new Set(processedData.map(call => call.commune))].map(commune => (
                <option key={commune} value={commune}>{commune}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla de llamadas */}
        {filteredData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beneficiario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comuna
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resultado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duración
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.slice(0, 100).map((call, index) => (
                  <tr key={call.id || index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(call.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {call.beneficiary}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.operator}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.commune}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        call.isSuccessful 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {call.result}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.duration}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            No hay llamadas que coincidan con los filtros seleccionados
          </p>
        )}
      </div>
    </div>
  );
}

function Reports() {
  return (
    <div className="p-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Reportes y Análisis</h2>
        <p className="text-gray-600">Módulo de reportes en desarrollo...</p>
      </div>
    </div>
  );
}

function OperatorManagement() {
  const { operators, addOperator, updateOperator, deleteOperator } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    isActive: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingOperator) {
        await updateOperator(editingOperator.id, formData);
      } else {
        await addOperator(formData);
      }
      setShowForm(false);
      setEditingOperator(null);
      setFormData({ name: '', email: '', phone: '', isActive: true });
    } catch (error) {
      console.error('Error al guardar operador:', error);
    }
  };

  const handleEdit = (operator) => {
    setEditingOperator(operator);
    setFormData({
      name: operator.name,
      email: operator.email,
      phone: operator.phone,
      isActive: operator.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (operatorId) => {
    if (window.confirm('¿Está seguro de que desea eliminar este operador?')) {
      try {
        await deleteOperator(operatorId);
      } catch (error) {
        console.error('Error al eliminar operador:', error);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Gestión de Operadores</h2>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo Operador
          </button>
        </div>

        {/* Lista de operadores */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {operators.map((operator) => (
                <tr key={operator.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {operator.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {operator.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {operator.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      operator.isActive 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {operator.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(operator)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(operator.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal de formulario */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingOperator ? 'Editar Operador' : 'Nuevo Operador'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingOperator(null);
                    setFormData({ name: '', email: '', phone: '', isActive: true });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Activo</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingOperator ? 'Actualizar' : 'Crear'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingOperator(null);
                      setFormData({ name: '', email: '', phone: '', isActive: true });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AssignmentManagement() {
  const { assignments, addAssignment, updateAssignment, deleteAssignment, operators } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [formData, setFormData] = useState({
    operatorId: '',
    beneficiary: '',
    zone: '',
    isActive: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAssignment) {
        await updateAssignment(editingAssignment.id, formData);
      } else {
        await addAssignment(formData);
      }
      setShowForm(false);
      setEditingAssignment(null);
      setFormData({ operatorId: '', beneficiary: '', zone: '', isActive: true });
    } catch (error) {
      console.error('Error al guardar asignación:', error);
    }
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      operatorId: assignment.operatorId,
      beneficiary: assignment.beneficiary,
      zone: assignment.zone,
      isActive: assignment.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (assignmentId) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta asignación?')) {
      try {
        await deleteAssignment(assignmentId);
      } catch (error) {
        console.error('Error al eliminar asignación:', error);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Gestión de Asignaciones</h2>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Asignación
          </button>
        </div>

        {/* Lista de asignaciones */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beneficiario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zona
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignments.map((assignment) => {
                const operator = operators.find(op => op.id === assignment.operatorId);
                return (
                  <tr key={assignment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {operator?.name || 'Operador no encontrado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.beneficiary}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.zone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        assignment.isActive 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {assignment.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(assignment)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(assignment.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal de formulario */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingAssignment ? 'Editar Asignación' : 'Nueva Asignación'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingAssignment(null);
                    setFormData({ operatorId: '', beneficiary: '', zone: '', isActive: true });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operador
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.operatorId}
                    onChange={(e) => setFormData({ ...formData, operatorId: e.target.value })}
                  >
                    <option value="">Seleccionar operador</option>
                    {operators.filter(op => op.isActive).map(operator => (
                      <option key={operator.id} value={operator.id}>
                        {operator.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beneficiario
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.beneficiary}
                    onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zona
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Activa</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingAssignment ? 'Actualizar' : 'Crear'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingAssignment(null);
                      setFormData({ operatorId: '', beneficiary: '', zone: '', isActive: true });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DataManagement() {
  const fileInputRef = useRef(null);
  const { setCallData, callData, isLoading, callMetrics } = useCallStore();
  const { loadOperators, loadAssignments } = useAppStore();

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log('Datos cargados desde Excel:', jsonData);
        setCallData(jsonData, 'excel');
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleLoadFirebaseData = async () => {
    try {
      await loadOperators();
      await loadAssignments();
      console.log('Datos de Firebase cargados exitosamente');
    } catch (error) {
      console.error('Error cargando datos de Firebase:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Gestión de Datos</h2>

        {/* Carga de archivos */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                disabled={isLoading}
              >
                <FileSpreadsheet className="h-5 w-5" />
                {isLoading ? 'Procesando...' : 'Cargar Archivo Excel'}
              </button>
              <p className="mt-2 text-sm text-gray-500">
                Selecciona un archivo Excel (.xlsx, .xls) con datos de llamadas
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Botón para cargar datos de Firebase */}
        <div className="mb-6">
          <button
            onClick={handleLoadFirebaseData}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Database className="h-5 w-5" />
            Cargar Datos de Firebase
          </button>
          <p className="mt-2 text-sm text-gray-500">
            Sincronizar operadores y asignaciones desde la base de datos
          </p>
        </div>

        {/* Estado actual de datos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Phone className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">Llamadas Cargadas</p>
                <p className="text-lg font-bold text-blue-600">{callData.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Llamadas Exitosas</p>
                <p className="text-lg font-bold text-green-600">{callMetrics.successfulCalls}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">Beneficiarios Únicos</p>
                <p className="text-lg font-bold text-purple-600">{callMetrics.uniqueBeneficiaries}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { user, logout } = useAuth();
  const [activeModule, setActiveModule] = useState('dashboard');

  // Cargar datos iniciales cuando el usuario se autentica
  useEffect(() => {
    if (user) {
      const { loadOperators, loadAssignments } = useAppStore.getState();
      loadOperators().catch(console.error);
      loadAssignments().catch(console.error);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Central Teleoperadores
          </h1>
          <AuthLoading />
        </div>
      </div>
    );
  }

  const modules = [
    { id: 'dashboard', name: 'Panel Principal', icon: BarChart3 },
    { id: 'search', name: 'Búsqueda Beneficiarios', icon: Search },
    { id: 'history', name: 'Historial Llamadas', icon: Clock },
    { id: 'reports', name: 'Reportes', icon: PieChart },
    { id: 'operators', name: 'Operadores', icon: Users },
    { id: 'assignments', name: 'Asignaciones', icon: UserPlus },
    { id: 'data', name: 'Gestión Datos', icon: Database },
    { id: 'audit', name: 'Auditoría', icon: Zap },
    { id: 'test', name: 'Test Zustand', icon: AlertCircle }
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'search':
        return <BeneficiarySearch />;
      case 'history':
        return <CallHistory />;
      case 'reports':
        return <Reports />;
      case 'operators':
        return <OperatorManagement />;
      case 'assignments':
        return <AssignmentManagement />;
      case 'data':
        return <DataManagement />;
      case 'audit':
        return <AuditDemo />;
      case 'test':
        return <ZustandTest />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Phone className="h-8 w-8 text-blue-600" />
                <h1 className="ml-3 text-2xl font-bold text-gray-900">
                  Central Teleoperadores
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-700">{user.email}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-600 hover:text-red-600"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-64">
              <nav className="bg-white rounded-lg shadow p-6">
                <ul className="space-y-2">
                  {modules.map((module) => {
                    const Icon = module.icon;
                    return (
                      <li key={module.id}>
                        <button
                          onClick={() => setActiveModule(module.id)}
                          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            activeModule === module.id
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <Icon className="mr-3 h-5 w-5" />
                          {module.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {renderModule()}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
