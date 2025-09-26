/**
 * Dashboard de Teleoperadora Individual
 * Muestra métricas específicas y historial de llamadas de una teleoperadora
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useMetricsWithFallback } from '../../utils/fallbackMetrics';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Phone,
  PhoneCall,
  Clock,
  TrendingUp,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Search,
  Filter
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import useMetricsStore from '../../stores/useMetricsStore';

function TeleoperadoraDashboard({ operatorId }) {
  const {
    getTeleoperadoraMetrics,
    getBeneficiariesByOperator,
    loading,
    errors
  } = useMetricsStore();

  const [selectedPeriod, setSelectedPeriod] = useState('7'); // días
  const [searchTerm, setSearchTerm] = useState('');
  const [callsFilter, setCallsFilter] = useState('all'); // all, successful, failed

  // Usar fallback cuando sea necesario
  const fallbackMetrics = useMetricsWithFallback();
  const operatorMetrics = getTeleoperadoraMetrics(operatorId);
  const operatorBeneficiaries = getBeneficiariesByOperator(operatorId);
  
  const shouldUseFallback = errors.teleoperadoras || !operatorMetrics;
  const currentOperatorMetrics = shouldUseFallback ? fallbackMetrics.getTeleoperadoraMetrics(operatorId) : operatorMetrics;
  const currentBeneficiaries = shouldUseFallback ? fallbackMetrics.getBeneficiariesByOperator(operatorId) : operatorBeneficiaries;

  // Preparar datos de llamadas por período
  const prepareCallsData = () => {
    if (!currentOperatorMetrics?.calls) return [];

    const now = new Date();
    const daysAgo = new Date(now.getTime() - (parseInt(selectedPeriod) * 24 * 60 * 60 * 1000));
    
    const filteredCalls = currentOperatorMetrics.calls.filter(call => 
      new Date(call.fecha) >= daysAgo
    );

    // Agrupar por día
    const callsByDay = {};
    
    filteredCalls.forEach(call => {
      const date = new Date(call.fecha).toLocaleDateString('es-ES');
      if (!callsByDay[date]) {
        callsByDay[date] = {
          date,
          total: 0,
          successful: 0,
          failed: 0,
          duration: 0
        };
      }
      
      callsByDay[date].total++;
      if (call.exitosa) {
        callsByDay[date].successful++;
      } else {
        callsByDay[date].failed++;
      }
      callsByDay[date].duration += call.duracion || 0;
    });

    return Object.values(callsByDay).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Filtrar llamadas según criterios
  const getFilteredCalls = () => {
    if (!currentOperatorMetrics?.calls) return [];

    let filtered = [...currentOperatorMetrics.calls];

    // Filtrar por búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(call => 
        call.beneficiario?.toLowerCase().includes(searchLower) ||
        call.observaciones?.toLowerCase().includes(searchLower)
      );
    }

    // Filtrar por tipo
    if (callsFilter === 'successful') {
      filtered = filtered.filter(call => call.exitosa);
    } else if (callsFilter === 'failed') {
      filtered = filtered.filter(call => !call.exitosa);
    }

    return filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  };

  const callsData = prepareCallsData();
  const filteredCalls = getFilteredCalls();

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatPercentage = (value) => {
    return `${Math.round(value * 100) / 100}%`;
  };

  // Componente de métrica individual
  const MetricCard = ({ title, value, subtitle, icon: Icon, color = "blue", progress }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 text-${color}-600`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {progress !== undefined && (
            <Progress value={progress} className="mt-2" />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading.teleoperadoras) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando datos de teleoperadora...</span>
      </div>
    );
  }

  if (!operatorMetrics) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Teleoperadora no encontrada</h3>
          <p className="text-gray-500">No se encontraron datos para esta teleoperadora</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {currentOperatorMetrics.nombreOriginal}
              </h1>
              {shouldUseFallback && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  Modo Demo
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {shouldUseFallback 
                ? "Mostrando datos simulados - Inicialice la base de datos para datos reales"
                : "Dashboard individual de teleoperadora"
              }
            </p>
            {currentOperatorMetrics.lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Última actualización: {new Date(currentOperatorMetrics.lastUpdated).toLocaleString('es-ES')}
              </p>
            )}
          </div>
          
          {/* Badge de performance */}
          <Badge variant={
            currentOperatorMetrics.successRate >= 80 ? "success" : 
            currentOperatorMetrics.successRate >= 60 ? "warning" : "danger"
          }>
            {formatPercentage(currentOperatorMetrics.successRate)} de éxito
          </Badge>
        </div>
      </motion.div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Llamadas"
          value={currentOperatorMetrics.totalCalls.toLocaleString()}
          subtitle="Llamadas realizadas"
          icon={PhoneCall}
          color="blue"
        />
        <MetricCard
          title="Llamadas Exitosas"
          value={currentOperatorMetrics.successfulCalls.toLocaleString()}
          subtitle={`${formatPercentage(currentOperatorMetrics.successRate)} de éxito`}
          icon={CheckCircle}
          color="green"
          progress={currentOperatorMetrics.successRate}
        />
        <MetricCard
          title="Tiempo Total"
          value={formatDuration(currentOperatorMetrics.totalDuration)}
          subtitle={`Promedio: ${formatDuration(currentOperatorMetrics.averageDuration)}`}
          icon={Clock}
          color="purple"
        />
        <MetricCard
          title="Beneficiarios Atendidos"
          value={currentBeneficiaries.length}
          subtitle="Clientes únicos"
          icon={User}
          color="orange"
        />
      </div>

      {/* Controles de filtrado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Filtros y Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              {/* Selector de período */}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="border rounded px-3 py-1 text-sm"
                >
                  <option value="7">Últimos 7 días</option>
                  <option value="15">Últimos 15 días</option>
                  <option value="30">Últimos 30 días</option>
                  <option value="90">Últimos 3 meses</option>
                </select>
              </div>

              {/* Búsqueda */}
              <div className="flex items-center space-x-2 flex-1 max-w-md">
                <Search className="h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar beneficiario o observaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border rounded px-3 py-1 text-sm w-full"
                />
              </div>

              {/* Filtro de tipo de llamada */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <select
                  value={callsFilter}
                  onChange={(e) => setCallsFilter(e.target.value)}
                  className="border rounded px-3 py-1 text-sm"
                >
                  <option value="all">Todas las llamadas</option>
                  <option value="successful">Solo exitosas</option>
                  <option value="failed">Solo fallidas</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Gráficos de análisis */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Evolución temporal */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Evolución de Llamadas</CardTitle>
              <CardDescription>
                Progreso diario en los últimos {selectedPeriod} días
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={callsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="successful" 
                    stackId="1"
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.8}
                    name="Exitosas"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="failed" 
                    stackId="1"
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.8}
                    name="Fallidas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Duración por día */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Duración de Llamadas</CardTitle>
              <CardDescription>
                Tiempo total por día (minutos)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={callsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="duration" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Historial de llamadas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Historial de Llamadas</CardTitle>
            <CardDescription>
              {filteredCalls.length} llamadas {callsFilter === 'all' ? '' : callsFilter === 'successful' ? 'exitosas' : 'fallidas'}
              {searchTerm && ` con "${searchTerm}"`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredCalls.slice(0, 50).map((call, index) => (
                <motion.div
                  key={call.id || index}
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
                        <h4 className="font-medium">{call.beneficiario}</h4>
                        <Badge variant={call.exitosa ? "success" : "danger"}>
                          {call.exitosa ? "Exitosa" : "Fallida"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Fecha y hora:</p>
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
                    
                    <div className="flex items-center space-x-2">
                      {call.exitosa ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {filteredCalls.length === 0 && (
                <div className="text-center py-8">
                  <PhoneCall className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay llamadas que coincidan con los filtros</p>
                </div>
              )}
              
              {filteredCalls.length > 50 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando primeras 50 de {filteredCalls.length} llamadas
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Beneficiarios atendidos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Beneficiarios Atendidos</CardTitle>
            <CardDescription>
              Lista de beneficiarios con sus respectivos estados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 max-h-64 overflow-y-auto">
              {currentBeneficiaries.slice(0, 20).map((beneficiary, index) => (
                <motion.div
                  key={beneficiary.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{beneficiary.nombreOriginal}</p>
                    <p className="text-sm text-muted-foreground">
                      {beneficiary.totalCalls} llamadas • 
                      Última: {beneficiary.lastCall ? 
                        new Date(beneficiary.lastCall).toLocaleDateString('es-ES') : 
                        'Nunca'
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      beneficiary.status === 'Al día' ? "success" :
                      beneficiary.status === 'Pendiente' ? "warning" : "danger"
                    }>
                      {beneficiary.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPercentage(beneficiary.successRate)} éxito
                    </p>
                  </div>
                </motion.div>
              ))}
              
              {currentBeneficiaries.length > 20 && (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">
                    Mostrando primeros 20 de {currentBeneficiaries.length} beneficiarios
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default TeleoperadoraDashboard;