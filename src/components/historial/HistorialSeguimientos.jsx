/**
 * Historial de Seguimientos - FASE 4 Integrado
 * 
 * Módulo profesional para visualizar el estado de los seguimientos de beneficiarios.
 * 
 * FASE 4 - TAREA 3: Integraciones Completadas
 * - ✅ Usa métricas unificadas desde metricsService
 * - ✅ Usa dataNormalizer para limpiar y homogeneizar datos
 * - ✅ Corrige campos incoherentes (nombre teleoperadora, llamadas exitosas, días desde último contacto)
 * - ✅ Interfaz modernizada con Tailwind
 * 
 * Criterios de clasificación:
 * - Al día: llamada exitosa en los últimos 15 días
 * - Pendiente: llamada exitosa entre 16-30 días
 * - Urgente: sin llamadas exitosas en más de 30 días o nunca contactado
 */

import React, { useMemo, useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Clock, 
  Calendar, 
  Filter, 
  Search, 
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react';
import useCallStore from '../../stores/useCallStore';
import { useAppStore } from '../../stores';
import { useSeguimientosStore } from '../../stores/useSeguimientosStore';
import { getHistorySnapshot } from '../../services/metricsService';
import logger from '../../utils/logger';

const HistorialSeguimientos = () => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // ⭐ FASE 4: Obtener datos desde múltiples stores
  const callData = useCallStore((state) => state.callData);
  const getAllAssignments = useAppStore((state) => state.getAllAssignments);
  const assignments = getAllAssignments();
  const operators = useAppStore((state) => state.operators);
  const seguimientos = useSeguimientosStore((state) => state.seguimientos);

  // ⭐ RC1 FIX: Logging de sincronización para debugging
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    logger.debug('[HistorialSeguimientos] Debug sync inputs', {
      callDataLength: callData?.length || 0,
      callDataSample: callData?.slice?.(0, 2) || [],
      seguimientosLength: seguimientos?.length || 0,
      assignmentsLength: assignments?.length || 0,
    });
  }, [callData, seguimientos, assignments]);
  const historySnapshot = useMemo(() => {
    try {
      return getHistorySnapshot({
        calls: callData || [],
        seguimientos,
        operators,
        assignments,
      });
    } catch (error) {
      logger.error('[HistorialSeguimientos] Error obteniendo snapshot', error);
      return { summary: null, followUps: [] };
    }
  }, [callData, seguimientos, operators, assignments]);

  const followUpData = historySnapshot?.followUps || [];

  // Filtrar datos según búsqueda y filtro de estado
  const filteredFollowUps = useMemo(() => {
    return followUpData.filter(item => {
      const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
      const matchesSearch = 
        item.beneficiary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.phone.includes(searchTerm);
      return matchesFilter && matchesSearch;
    });
  }, [followUpData, filterStatus, searchTerm]);

  // ⭐ FASE 4: Calcular estadísticas usando snapshot del servicio
  const stats = useMemo(() => {
    const summary = historySnapshot?.summary || {};
    return {
      alDia: summary.dueSoon ?? followUpData.filter((f) => f.status === 'al-dia').length,
      pendientes: summary.pending ?? followUpData.filter((f) => f.status === 'pendiente').length,
      urgentes: summary.urgent ?? followUpData.filter((f) => f.status === 'urgente').length,
      sinHistorial: summary.noHistory ?? followUpData.filter((f) => f.status === 'sin-historial').length,
      total: followUpData.length,
      totalLlamadas: summary.totalCalls || 0,
      llamadasExitosas: summary.successfulCalls || 0,
      llamadasFallidas: summary.failedCalls || 0,
      tasaExito: summary.successRate || 0,
      beneficiariosUnicos: summary.uniqueBeneficiariesContacted || followUpData.length,
    };
  }, [followUpData, historySnapshot]);

  const hasData = followUpData && followUpData.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl shadow-lg p-6 border border-teal-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-teal-600" />
              Historial de Seguimientos
            </h2>
            <p className="text-gray-700 mt-2 text-lg">
              Clasificación de beneficiarios por frecuencia y estado de contacto
            </p>
            {historySnapshot?.summary && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <Zap className="w-4 h-4 mr-1" />
                    Métricas Unificadas (Fase 4)
                  </span>
                </div>
                {/* ⭐ RC1 CRÍTICO: Separar métricas de LLAMADAS vs BENEFICIARIOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-blue-900">Métricas de Llamadas</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      <strong>{stats.totalLlamadas?.toLocaleString()}</strong> registros total
                      <br />
                      <strong>{stats.llamadasExitosas?.toLocaleString()}</strong> exitosas ({stats.tasaExito?.toFixed(1)}% éxito)
                      <br />
                      <strong>{stats.llamadasFallidas?.toLocaleString()}</strong> fallidas
                    </p>
                  </div>
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-teal-600" />
                      <span className="text-sm font-bold text-teal-900">Métricas de Beneficiarios</span>
                    </div>
                    <p className="text-xs text-teal-700">
                      <strong>{stats.total}</strong> beneficiarios únicos
                      <br />
                      <strong>{stats.alDia}</strong> al día • <strong>{stats.pendientes}</strong> pendientes • <strong>{stats.urgentes}</strong> urgentes
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          {hasData && (
            <div className="text-right bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 font-medium">Total de beneficiarios</p>
              <p className="text-4xl font-bold text-teal-700">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.beneficiariosUnicos} únicos
              </p>
            </div>
          )}
        </div>

        {/* Estadísticas de seguimiento */}
        {hasData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Al día */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-4 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-700 font-semibold text-sm mb-1">
                    ✅ Al día
                  </p>
                  <p className="text-3xl font-bold text-teal-600">
                    {stats.alDia}
                  </p>
                  <p className="text-xs text-teal-700 mt-1">
                    Contacto en últimos 15 días
                  </p>
                </div>
                <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Pendientes */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-700 font-semibold text-sm mb-1">
                    ⏳ Pendientes
                  </p>
                  <p className="text-3xl font-bold text-orange-600">
                    {stats.pendientes}
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    Contacto entre 16-30 días
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Urgentes */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-700 font-semibold text-sm mb-1">
                    ⚠️ Urgentes
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    {stats.urgentes}
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Sin contacto +30 días
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      {hasData && (
        <div className="bg-white rounded-lg shadow-md p-5 border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Filtro por estado */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1 text-teal-600" />
                Filtrar por estado
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 
                         text-gray-700 bg-white
                         focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              >
                <option value="all">Todos los estados ({stats.total})</option>
                <option value="al-dia">✅ Al día ({stats.alDia})</option>
                <option value="pendiente">⏳ Pendientes ({stats.pendientes})</option>
                <option value="urgente">⚠️ Urgentes ({stats.urgentes})</option>
                <option value="sin-historial">📂 Sin historial ({stats.sinHistorial})</option>
              </select>
            </div>

            {/* Búsqueda */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1 text-teal-600" />
                Buscar
              </label>
              <input
                type="text"
                placeholder="Nombre, teleoperadora o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 
                         text-gray-700 bg-white
                         focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all
                         placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Contador de resultados */}
          {searchTerm && (
            <div className="mt-3 text-sm text-gray-600">
              Mostrando {filteredFollowUps.length} de {followUpData.length} beneficiarios
            </div>
          )}
        </div>
      )}

      {/* Tarjetas de seguimiento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {!hasData ? (
          <div className="col-span-full">
            <div className="bg-white border-2 border-dashed border-gray-300 
                          rounded-lg p-12 text-center">
              <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-gray-700 mb-2">
                No hay datos de seguimiento
              </h4>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Para ver el historial de seguimientos, carga un archivo Excel con datos de llamadas 
                desde el Panel Principal.
              </p>
              <div className="text-sm text-gray-500">
                💡 Ve al <strong>Panel Principal</strong> → <strong>Cargar Excel</strong> para comenzar
              </div>
            </div>
          </div>
        ) : filteredFollowUps.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-700 mb-2">
                No se encontraron resultados
              </h4>
              <p className="text-gray-600">
                Intenta ajustar los filtros o el término de búsqueda
              </p>
            </div>
          </div>
        ) : (
          filteredFollowUps.map((item) => (
            <div
              key={item.assignmentId || item.id}
              className={`bg-white rounded-lg p-5 border-l-4 shadow-sm
                         transition-all duration-200 hover:shadow-md border border-gray-100 ${
                item.status === 'al-dia'
                  ? 'border-l-teal-500'
                  : item.status === 'pendiente'
                  ? 'border-l-orange-500'
                  : item.status === 'sin-historial'
                  ? 'border-l-gray-400'
                  : 'border-l-red-500'
              }`}
            >
              {/* Header de la tarjeta */}
              <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-200">
                <h4 className="font-bold text-gray-800 text-base leading-tight flex-1 pr-2">
                  {item.beneficiary}
                </h4>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                    item.status === 'al-dia'
                      ? 'bg-teal-100 text-teal-700'
                      : item.status === 'pendiente'
                      ? 'bg-orange-100 text-orange-700'
                      : item.status === 'sin-historial'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {item.status === 'al-dia'
                    ? '✅ Al día'
                    : item.status === 'pendiente'
                    ? '⏳ Pendiente'
                    : item.status === 'sin-historial'
                    ? '📂 Sin historial'
                    : '⚠️ Urgente'}
                </span>
              </div>

              {/* Contenido de la tarjeta */}
              <div className="space-y-3 text-sm">
                {/* Teleoperadora */}
                <div className="flex items-start text-gray-700">
                  <User className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium">Teleoperadora:</span>
                    <span className="ml-1 block sm:inline">{item.operator}</span>
                  </div>
                </div>

                {/* Teléfono */}
                <div className="flex items-center text-gray-700">
                  <Phone className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                  <span className="font-medium">Teléfono:</span>
                  <span className="ml-1">{item.phone}</span>
                </div>

                {/* Última llamada */}
                <div className="flex items-center text-gray-700">
                  <Clock className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                  <span className="font-medium">Última llamada:</span>
                  <span className="ml-1">{item.lastCall}</span>
                </div>

                {/* Llamadas totales y exitosas */}
                <div className="flex items-center text-gray-700">
                  <TrendingUp className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                  <span className="font-medium">Llamadas:</span>
                  <span className="ml-1">
                    {item.callCount} total ({item.successfulCallCount} exitosa{item.successfulCallCount !== 1 ? 's' : ''})
                  </span>
                </div>

                {/* Días desde último contacto */}
                {item.daysSinceLastCall !== null && (
                  <div className="flex items-center text-gray-700">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                    <span className="font-medium">Hace:</span>
                    <span className="ml-1">
                      {item.daysSinceLastCall} día{item.daysSinceLastCall !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Razón del estado */}
              {item.statusReason && (
                <div
                  className={`mt-4 pt-3 border-t text-xs leading-relaxed ${
                    item.status === 'al-dia'
                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                      : item.status === 'pendiente'
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : item.status === 'sin-historial'
                      ? 'bg-gray-50 text-gray-700 border-gray-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  } rounded-lg p-2.5`}
                >
                  <div className="flex items-start">
                    {item.status === 'urgente' && (
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
                    )}
                    <span>{item.statusReason}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistorialSeguimientos;
