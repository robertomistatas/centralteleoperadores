/**
 * Dashboard Global de Métricas
 * Muestra KPIs generales del sistema y gráficos de análisis
 * 
 * FASE 4 - TAREA 1: Integrado con metricsEngine.js
 * - Usa computeGlobalMetrics() para cálculos unificados
 * - Elimina cálculos locales duplicados
 * - Sincronizado con Auditoría y Historial
 */

import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMetricsWithFallback } from '../../utils/fallbackMetrics';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Phone,
  PhoneCall,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import useMetricsStore from '../../stores/useMetricsStore';
import { getExecutiveSnapshot } from '../../services/metricsService';
import { useCallStore } from '../../stores';
import { useSeguimientosStore } from '../../stores/useSeguimientosStore';
import useAppStore from '../../stores/useAppStore';
import logger from '../../utils/logger';

const COLORS = {
  'Al día': '#10b981',
  'Pendiente': '#f59e0b',
  'Urgente': '#ef4444'
};

const DAYS_SPANISH = {
  'monday': 'Lunes',
  'tuesday': 'Martes',
  'wednesday': 'Miércoles',
  'thursday': 'Jueves',
  'friday': 'Viernes',
  'saturday': 'Sábado',
  'sunday': 'Domingo'
};

function GlobalDashboard() {
  const {
    globalMetrics,
    teleoperadorasMetrics,
    beneficiariosMetrics,
    noAsignadosMetrics,
    loading,
    errors,
    initializeListeners,
    cleanup
  } = useMetricsStore();
  
  // ⭐ FASE 4: Obtener todos los registros (callData, seguimientos, análisis Excel)
  // para calcular métricas unificadas con metricsEngine
  const callData = useCallStore((state) => state.callData) || [];
  const seguimientos = useSeguimientosStore((state) => state.seguimientos) || [];
  const operators = useAppStore((state) => state.operators) || [];
  const operatorAssignments = useAppStore((state) => state.operatorAssignments) || {};
  
  // Usar fallback cuando haya errores o no haya datos
  const fallbackMetrics = useMetricsWithFallback();

  const snapshot = useMemo(() => {
    try {
      return getExecutiveSnapshot({
        calls: callData,
        seguimientos,
        operators,
        operatorAssignments,
      });
    } catch (error) {
      logger.error('[GlobalDashboard] Error obteniendo snapshot de métricas', error);
      return null;
    }
  }, [callData, seguimientos, operators, operatorAssignments]);

  const currentMetrics = snapshot?.summary || null;
  const perOperator = snapshot?.perOperator || {};
  const chartSeries = snapshot?.timeSeries?.byDate || [];
  const topOperators = snapshot?.topOperators || [];
  const shouldUseFallback = errors.global || !currentMetrics || currentMetrics.totalCalls === 0;

  // Inicializar listeners al montar el componente
  useEffect(() => {
    initializeListeners();
    return cleanup; // Limpiar al desmontar
  }, [initializeListeners, cleanup]);

  // ⭐ FASE 4 - TAREA 1: Calcular métricas unificadas con metricsEngine
  // Usar métricas del servicio o fallback
  const summaryStats = useMemo(() => {
    if (!currentMetrics) {
      return shouldUseFallback ? fallbackMetrics.getSummaryStats() : {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        successRate: 0,
        totalDuration: 0,
        averageDuration: 0,
        uniqueBeneficiaries: 0,
        beneficiariesByStatus: {}
      };
    }

    return {
      totalCalls: currentMetrics.totalCalls || 0,
      successfulCalls: currentMetrics.successfulCalls || 0,
      failedCalls: currentMetrics.failedCalls || 0,
      sinIdentificar: 0,
      successRate: currentMetrics.successRate || 0,
      totalDuration: currentMetrics.effectiveMinutes || 0,
      averageDuration: currentMetrics.avgMinutesPerCall || 0,
      uniqueBeneficiaries: currentMetrics.uniqueBeneficiariesContacted || 0,
      beneficiariesByStatus: {}
    };
  }, [currentMetrics, shouldUseFallback, fallbackMetrics]);

  const urgentBeneficiaries = shouldUseFallback ? fallbackMetrics.getBeneficiariesByStatus('Urgente') : [];

  // ⭐ Preparar datos para gráficos desde metricsService
  const prepareChartData = () => {
    if (!currentMetrics) {
      return { dayData: [], hourData: [], statusData: [], operatorData: [] };
    }

    const dateData = chartSeries
      .map((item) => ({
        fecha: item.date,
        llamadas: item.total,
        exitosas: item.successful,
        fallidas: item.failed,
        tasaExito: item.total > 0 ? (item.successful / item.total) * 100 : 0,
      }))
      .slice(-30);

    const operatorData = Object.values(perOperator)
      .map((op) => ({
        operadora: op.displayName,
        total: op.calls.totalCalls,
        exitosas: op.calls.successfulCalls,
        fallidas: op.calls.failedCalls,
        tasaExito: op.calls.totalCalls > 0 ? (op.calls.successfulCalls / op.calls.totalCalls) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const statusData = [
      { name: 'Exitosas', value: currentMetrics.successfulCalls || 0, color: COLORS['Al día'] || '#10b981' },
      { name: 'Fallidas', value: currentMetrics.failedCalls || 0, color: COLORS['Urgente'] || '#ef4444' },
    ].filter((item) => item.value > 0);

    const dayDistribution = {};
    chartSeries.forEach((item) => {
      const date = new Date(item.date);
      const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
      const dayKey = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      dayDistribution[dayKey] = (dayDistribution[dayKey] || 0) + item.total;
    });

    const dayData = Object.entries(dayDistribution).map(([day, count]) => ({ day, llamadas: count }));

    return { dayData, dateData, hourData: [], statusData, operatorData };
  };

  const { dayData, dateData, statusData, operatorData } = prepareChartData();

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatPercentage = (value) => {
    return `${Math.round(value * 100) / 100}%`;
  };

  // Componente de KPI Card
  const KPICard = ({ title, value, subtitle, icon: Icon, trend, color = "blue" }) => (
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
          {trend && (
            <div className={`flex items-center pt-1 text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend > 0 ? '+' : ''}{formatPercentage(trend)} vs período anterior
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading.global) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando métricas...</span>
      </div>
    );
  }

  if (errors.global) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error cargando métricas</h3>
          <p className="text-gray-500">{errors.global}</p>
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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Global</h1>
          {shouldUseFallback && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              Modo Demo
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          {shouldUseFallback 
            ? "Mostrando datos simulados - Inicialice la base de datos para datos reales"
            : "Resumen general de métricas y análisis de llamadas"
          }
        </p>
        {currentMetrics?.fechaCalculo && (
          <p className="text-xs text-muted-foreground mt-1">
            Última actualización: {new Date(currentMetrics.fechaCalculo).toLocaleString('es-ES')}
          </p>
        )}
        {currentMetrics && (
          <Badge variant="outline" className="ml-2 text-blue-600 border-blue-200">
            ⚡ Métricas Unificadas (Fase 4)
          </Badge>
        )}
      </motion.div>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total de Llamadas"
          value={(summaryStats.totalCalls || 0).toLocaleString()}
          subtitle="Llamadas registradas"
          icon={PhoneCall}
          color="blue"
        />
        <KPICard
          title="Tasa de Éxito"
          value={formatPercentage(summaryStats.successRate)}
          subtitle={`${(summaryStats.successfulCalls || 0).toLocaleString()} llamadas exitosas`}
          icon={CheckCircle}
          color="green"
        />
        <KPICard
          title="Beneficiarios Únicos"
          value={(summaryStats.uniqueBeneficiaries || 0).toLocaleString()}
          subtitle={`${(summaryStats.uniqueBeneficiaries || 0).toLocaleString()} teléfonos únicos`}
          icon={Users}
          color="purple"
        />
        <KPICard
          title="Teleoperadoras Activas"
          value={Object.keys(perOperator || {}).length}
          subtitle="Con llamadas registradas"
          icon={Users}
          color="orange"
        />
      </div>

      {/* Segunda fila de KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          title="Beneficiarios Al Día"
          value={summaryStats.beneficiariesByStatus['Al día'] || 0}
          subtitle="Contactados recientemente"
          icon={CheckCircle}
          color="green"
        />
        <KPICard
          title="Beneficiarios Pendientes"
          value={summaryStats.beneficiariesByStatus['Pendiente'] || 0}
          subtitle="Requieren seguimiento"
          icon={Clock}
          color="yellow"
        />
        <KPICard
          title="Beneficiarios Urgentes"
          value={summaryStats.beneficiariesByStatus['Urgente'] || 0}
          subtitle="Atención prioritaria"
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de llamadas por día */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Llamadas por Día de la Semana</CardTitle>
              <CardDescription>
                Distribución de llamadas durante la semana
              </CardDescription>
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
        </motion.div>

        {/* Gráfico de llamadas por hora */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Llamadas por Hora del Día</CardTitle>
              <CardDescription>
                Distribución horaria de la actividad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="llamadas" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Estado de beneficiarios y top teleoperadoras */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Estado de beneficiarios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Estado de Beneficiarios</CardTitle>
              <CardDescription>
                Distribución por estado de seguimiento
              </CardDescription>
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
        </motion.div>

        {/* Top teleoperadoras */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Top Teleoperadoras</CardTitle>
              <CardDescription>
                Mejores performance por tasa de éxito
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topOperators.slice(0, 5).map((operator, index) => (
                <div key={operator.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {operator.nombreOriginal}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {operator.totalCalls} llamadas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={operator.successRate >= 80 ? "success" : operator.successRate >= 60 ? "warning" : "danger"}>
                      {formatPercentage(operator.successRate)}
                    </Badge>
                    <Progress 
                      value={operator.successRate} 
                      className="w-20 h-2 mt-1"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Alertas y beneficiarios urgentes */}
      {urgentBeneficiaries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Beneficiarios Urgentes
              </CardTitle>
              <CardDescription className="text-red-600">
                Requieren atención inmediata - Sin contacto exitoso en más de 30 días
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {urgentBeneficiaries.slice(0, 10).map((beneficiary) => (
                  <div 
                    key={beneficiary.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                  >
                    <div>
                      <p className="font-medium">{beneficiary.nombreOriginal}</p>
                      <p className="text-sm text-muted-foreground">
                        Última llamada: {beneficiary.lastCall ? 
                          new Date(beneficiary.lastCall).toLocaleDateString('es-ES') : 
                          'Nunca'
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="danger">Urgente</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {beneficiary.totalCalls} llamadas
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Información de no asignados */}
      {noAsignadosMetrics && noAsignadosMetrics.totalUnassigned > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Beneficiarios No Asignados
              </CardTitle>
              <CardDescription className="text-yellow-600">
                {noAsignadosMetrics.totalUnassigned} beneficiarios sin teleoperadora asignada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Total de llamadas no asignadas: {noAsignadosMetrics.totalUnassignedCalls}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

export default GlobalDashboard;