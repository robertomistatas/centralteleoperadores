/**
 * Dashboard de Beneficiarios
 * Muestra información detallada de beneficiarios, su historial y estado
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  User,
  Phone,
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import useMetricsStore from '../../stores/useMetricsStore';

const STATUS_COLORS = {
  'Al día': '#10b981',
  'Pendiente': '#f59e0b', 
  'Urgente': '#ef4444'
};

function BeneficiaryDashboard({ beneficiaryId }) {
  const {
    getBeneficiaryMetrics,
    beneficiariosMetrics,
    searchBeneficiaries,
    getBeneficiariesByStatus,
    loading,
    errors
  } = useMetricsStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);

  // Si se pasa un beneficiaryId específico, cargar esos datos
  useEffect(() => {
    if (beneficiaryId) {
      const beneficiary = getBeneficiaryMetrics(beneficiaryId);
      setSelectedBeneficiary(beneficiary);
    }
  }, [beneficiaryId, getBeneficiaryMetrics]);

  // Obtener beneficiarios filtrados
  const getFilteredBeneficiaries = () => {
    let beneficiaries = Object.values(beneficiariosMetrics);

    // Filtrar por búsqueda
    if (searchTerm) {
      beneficiaries = searchBeneficiaries(searchTerm);
    }

    // Filtrar por estado
    if (statusFilter !== 'all') {
      beneficiaries = beneficiaries.filter(b => b.status === statusFilter);
    }

    return beneficiaries.sort((a, b) => {
      // Priorizar urgentes, luego por fecha de última llamada
      if (a.status !== b.status) {
        const statusPriority = { 'Urgente': 3, 'Pendiente': 2, 'Al día': 1 };
        return statusPriority[b.status] - statusPriority[a.status];
      }
      
      const aDate = a.lastCall ? new Date(a.lastCall) : new Date(0);
      const bDate = b.lastCall ? new Date(b.lastCall) : new Date(0);
      return bDate - aDate;
    });
  };

  // Preparar datos para gráficos de un beneficiario específico
  const prepareBeneficiaryCharts = (beneficiary) => {
    if (!beneficiary?.calls) return { timelineData: [], operatorData: [] };

    // Datos de timeline (últimas llamadas)
    const timelineData = beneficiary.calls
      .slice(-10) // Últimas 10 llamadas
      .map((call, index) => ({
        index: index + 1,
        fecha: new Date(call.fecha).toLocaleDateString('es-ES'),
        exitosa: call.exitosa ? 1 : 0,
        duracion: call.duracion || 0,
        teleoperadora: call.teleoperadora
      }));

    // Datos por teleoperadora
    const operatorStats = {};
    beneficiary.calls.forEach(call => {
      const operator = call.teleoperadora || 'Sin asignar';
      if (!operatorStats[operator]) {
        operatorStats[operator] = { name: operator, total: 0, exitosas: 0 };
      }
      operatorStats[operator].total++;
      if (call.exitosa) operatorStats[operator].exitosas++;
    });

    const operatorData = Object.values(operatorStats).map(op => ({
      ...op,
      successRate: op.total > 0 ? (op.exitosas / op.total) * 100 : 0
    }));

    return { timelineData, operatorData };
  };

  // Preparar estadísticas generales
  const prepareGeneralStats = () => {
    const allBeneficiaries = Object.values(beneficiariosMetrics);
    
    const statusCounts = allBeneficiaries.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {});

    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      color: STATUS_COLORS[status] || '#8884d8'
    }));

    // Distribución de llamadas por día de la semana
    const dayDistribution = {};
    allBeneficiaries.forEach(beneficiary => {
      beneficiary.calls?.forEach(call => {
        const dayName = new Date(call.fecha).toLocaleDateString('es-ES', { weekday: 'long' });
        dayDistribution[dayName] = (dayDistribution[dayName] || 0) + 1;
      });
    });

    const dayData = Object.entries(dayDistribution).map(([day, count]) => ({
      day,
      llamadas: count
    }));

    return { statusData, dayData };
  };

  const filteredBeneficiaries = getFilteredBeneficiaries();
  const { statusData, dayData } = prepareGeneralStats();

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatPercentage = (value) => {
    return `${Math.round(value * 100) / 100}%`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Al día': return <CheckCircle className="h-4 w-4" />;
      case 'Pendiente': return <Clock className="h-4 w-4" />;
      case 'Urgente': return <AlertTriangle className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  if (loading.beneficiarios) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando datos de beneficiarios...</span>
      </div>
    );
  }

  // Vista detallada de un beneficiario específico
  if (selectedBeneficiary) {
    const { timelineData, operatorData } = prepareBeneficiaryCharts(selectedBeneficiary);
    
    return (
      <div className="space-y-6">
        {/* Header con botón de regreso */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => setSelectedBeneficiary(null)}
                className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
              >
                ← Volver a la lista
              </button>
              <h1 className="text-3xl font-bold tracking-tight">
                {selectedBeneficiary.nombreOriginal}
              </h1>
              <p className="text-muted-foreground">
                Historial detallado del beneficiario
              </p>
            </div>
            
            <Badge variant={
              selectedBeneficiary.status === 'Al día' ? "success" :
              selectedBeneficiary.status === 'Pendiente' ? "warning" : "danger"
            } className="text-lg px-4 py-2">
              {getStatusIcon(selectedBeneficiary.status)}
              <span className="ml-2">{selectedBeneficiary.status}</span>
            </Badge>
          </div>
        </motion.div>

        {/* Métricas del beneficiario */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Llamadas</CardTitle>
              <Phone className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedBeneficiary.totalCalls}</div>
              <p className="text-xs text-muted-foreground">
                {selectedBeneficiary.successfulCalls} exitosas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPercentage(selectedBeneficiary.successRate)}
              </div>
              <Progress value={selectedBeneficiary.successRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Última Llamada</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {selectedBeneficiary.lastCall ? 
                  new Date(selectedBeneficiary.lastCall).toLocaleDateString('es-ES') : 
                  'Nunca'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Exitosa: {selectedBeneficiary.lastSuccessfulCall ? 
                  new Date(selectedBeneficiary.lastSuccessfulCall).toLocaleDateString('es-ES') :
                  'Nunca'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teléfonos</CardTitle>
              <Phone className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{selectedBeneficiary.telefonos?.length || 0}</div>
              <div className="text-xs text-muted-foreground space-y-1">
                {selectedBeneficiary.telefonos?.slice(0, 2).map((phone, index) => (
                  <div key={index}>{phone}</div>
                ))}
                {selectedBeneficiary.telefonos?.length > 2 && (
                  <div>+{selectedBeneficiary.telefonos.length - 2} más</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Timeline de llamadas */}
          <Card>
            <CardHeader>
              <CardTitle>Últimas Llamadas</CardTitle>
              <CardDescription>Historial reciente de contactos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="exitosa" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Éxito"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance por teleoperadora */}
          <Card>
            <CardHeader>
              <CardTitle>Teleoperadoras</CardTitle>
              <CardDescription>Rendimiento por operadora</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={operatorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="successRate" fill="#3b82f6" name="% Éxito" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Historial detallado */}
        <Card>
          <CardHeader>
            <CardTitle>Historial Completo de Llamadas</CardTitle>
            <CardDescription>
              {selectedBeneficiary.calls?.length || 0} llamadas registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedBeneficiary.calls?.map((call, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`border rounded-lg p-4 ${
                    call.exitosa ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant={call.exitosa ? "success" : "danger"}>
                          {call.exitosa ? "Exitosa" : "Fallida"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {call.teleoperadora || 'Sin asignar'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Fecha:</p>
                          <p>{new Date(call.fecha).toLocaleString('es-ES')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Duración:</p>
                          <p>{formatDuration(call.duracion || 0)}</p>
                        </div>
                      </div>
                      
                      {call.observaciones && (
                        <div className="mt-2">
                          <p className="text-muted-foreground text-sm">Observaciones:</p>
                          <p className="text-sm">{call.observaciones}</p>
                        </div>
                      )}
                    </div>
                    
                    {call.exitosa ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista general de beneficiarios
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Beneficiarios</h1>
        <p className="text-muted-foreground">
          Gestión y seguimiento de beneficiarios del sistema
        </p>
      </motion.div>

      {/* Estadísticas generales */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beneficiarios</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(beneficiariosMetrics).length}
            </div>
            <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {getBeneficiariesByStatus('Urgente').length}
            </div>
            <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Al Día</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {getBeneficiariesByStatus('Al día').length}
            </div>
            <p className="text-xs text-muted-foreground">Contactados recientemente</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos generales */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribución por estado */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
            <CardDescription>Estado actual de los beneficiarios</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Actividad por día */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad por Día</CardTitle>
            <CardDescription>Llamadas realizadas por día de la semana</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="llamadas" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Beneficiarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <Search className="h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border rounded px-3 py-2 text-sm w-full"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">Todos los estados</option>
                <option value="Al día">Al día</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de beneficiarios */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Beneficiarios</CardTitle>
          <CardDescription>
            {filteredBeneficiaries.length} beneficiarios encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredBeneficiaries.slice(0, 50).map((beneficiary, index) => (
              <motion.div
                key={beneficiary.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedBeneficiary(beneficiary)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium">{beneficiary.nombreOriginal}</h4>
                      <Badge variant={
                        beneficiary.status === 'Al día' ? "success" :
                        beneficiary.status === 'Pendiente' ? "warning" : "danger"
                      }>
                        {getStatusIcon(beneficiary.status)}
                        <span className="ml-1">{beneficiary.status}</span>
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Llamadas:</p>
                        <p>{beneficiary.totalCalls} ({beneficiary.successfulCalls} exitosas)</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tasa de éxito:</p>
                        <p>{formatPercentage(beneficiary.successRate)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Última llamada:</p>
                        <p>{beneficiary.lastCall ? 
                          new Date(beneficiary.lastCall).toLocaleDateString('es-ES') : 
                          'Nunca'
                        }</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Teléfonos:</p>
                        <p>{beneficiary.telefonos?.length || 0} registrados</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={beneficiary.successRate} 
                      className="w-20 h-2"
                    />
                    <span className="text-xs text-muted-foreground">
                      {formatPercentage(beneficiary.successRate)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {filteredBeneficiaries.length === 0 && (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay beneficiarios que coincidan con los filtros</p>
              </div>
            )}
            
            {filteredBeneficiaries.length > 50 && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando primeros 50 de {filteredBeneficiaries.length} beneficiarios
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BeneficiaryDashboard;