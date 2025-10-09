/**
 * Historial de Seguimientos - Refactorizado
 * 
 * Módulo profesional para visualizar el estado de los seguimientos de beneficiarios.
 * Criterios de clasificación:
 * - Al día: llamada exitosa en los últimos 15 días
 * - Pendiente: llamada exitosa entre 16-30 días
 * - Urgente: sin llamadas exitosas en más de 30 días o nunca contactado
 * 
 * Fuentes de datos:
 * - processedData de useCallStore: historial de llamadas del Excel
 * - assignments de useAsignationsStore: asignaciones de teleoperadoras
 */

import React, { useMemo, useState } from 'react';
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
  Activity
} from 'lucide-react';
import useCallStore from '../../stores/useCallStore';
import { useAppStore } from '../../stores';

const HistorialSeguimientos = () => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Obtener datos desde los stores
  const processedData = useCallStore((state) => state.processedData);
  const getAllAssignments = useAppStore((state) => state.getAllAssignments);
  const assignments = getAllAssignments();

  /**
   * Calcula el estado de seguimiento de cada beneficiario
   * basado en las llamadas exitosas registradas
   */
  const followUpData = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return [];
    }

    const now = new Date();
    const beneficiaryMap = new Map();

    // Crear un mapa de asignaciones para lookup rápido
    const assignmentMap = new Map();
    if (assignments && Array.isArray(assignments)) {
      assignments.forEach(assignment => {
        const beneficiaryName = (assignment.beneficiary || assignment.beneficiario || '').trim().toLowerCase();
        if (beneficiaryName) {
          assignmentMap.set(beneficiaryName, assignment);
        }
      });
    }

    // Procesar cada llamada del Excel
    processedData.forEach(call => {
      const beneficiaryName = call.beneficiario || call.beneficiary || call.nombre;
      if (!beneficiaryName) return;

      const beneficiaryKey = beneficiaryName.trim();
      
      if (!beneficiaryMap.has(beneficiaryKey)) {
        beneficiaryMap.set(beneficiaryKey, {
          beneficiary: beneficiaryName,
          calls: [],
          successfulCalls: [],
          lastSuccessfulCall: null,
          lastCallDate: null,
          lastCallResult: null,
        });
      }

      const beneficiaryData = beneficiaryMap.get(beneficiaryKey);
      
      // Agregar todas las llamadas
      beneficiaryData.calls.push(call);

      // Parsear la fecha de la llamada
      let callDate = null;
      const dateValue = call.fecha || call.date || call.FechaFinLlamado;
      
      if (dateValue) {
        if (typeof dateValue === 'string' && /^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(dateValue)) {
          const parts = dateValue.split(/[-\/]/);
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Los meses en JS van de 0-11
          const year = parseInt(parts[2]);
          callDate = new Date(year, month, day);
        } else if (typeof dateValue === 'number') {
          // Fecha de Excel (número de días desde 1900-01-01)
          callDate = new Date((dateValue - 25569) * 86400 * 1000);
        } else {
          callDate = new Date(dateValue);
        }
      }

      // Verificar si es una llamada exitosa
      const resultado = call.resultado || call.result || call.estado || '';
      const isSuccessful = resultado.toLowerCase().includes('exitoso') || 
                          resultado.toLowerCase() === 'exitosa';

      if (isSuccessful && callDate && !isNaN(callDate.getTime())) {
        beneficiaryData.successfulCalls.push({ date: callDate, call });
        
        // Actualizar la última llamada exitosa
        if (!beneficiaryData.lastSuccessfulCall || callDate > beneficiaryData.lastSuccessfulCall) {
          beneficiaryData.lastSuccessfulCall = callDate;
        }
      }

      // Actualizar la última llamada (exitosa o no)
      if (callDate && !isNaN(callDate.getTime())) {
        if (!beneficiaryData.lastCallDate || callDate > beneficiaryData.lastCallDate) {
          beneficiaryData.lastCallDate = callDate;
          beneficiaryData.lastCallResult = resultado || 'Sin resultado';
        }
      }
    });

    // Generar el resultado final con clasificación
    const result = Array.from(beneficiaryMap.values()).map(data => {
      const assignment = assignmentMap.get(data.beneficiary.trim().toLowerCase());
      
      // Obtener datos de la asignación
      const operatorName = assignment?.operator || 
                          assignment?.operatorName || 
                          assignment?.name ||
                          'No Asignado';
      
      const phone = assignment?.phone || 
                   assignment?.telefono || 
                   assignment?.primaryPhone || 
                   assignment?.numero_cliente || 
                   'N/A';
      
      const commune = assignment?.commune || assignment?.comuna || 'N/A';

      // Calcular días desde la última llamada exitosa
      let daysSinceLastSuccess = null;
      let status = 'urgente'; // Por defecto urgente
      let statusReason = 'Sin llamadas exitosas registradas';
      
      if (data.lastSuccessfulCall) {
        const diffTime = now - data.lastSuccessfulCall;
        daysSinceLastSuccess = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Clasificación según días desde última llamada exitosa
        if (daysSinceLastSuccess <= 15) {
          status = 'al-dia';
          statusReason = `Última llamada exitosa hace ${daysSinceLastSuccess} día${daysSinceLastSuccess !== 1 ? 's' : ''}`;
        } else if (daysSinceLastSuccess <= 30) {
          status = 'pendiente';
          statusReason = `Última llamada exitosa hace ${daysSinceLastSuccess} días - requiere seguimiento pronto`;
        } else {
          status = 'urgente';
          statusReason = `Última llamada exitosa hace ${daysSinceLastSuccess} días - seguimiento urgente`;
        }
      } else if (data.lastCallDate) {
        // Tiene llamadas pero ninguna exitosa
        const diffTime = now - data.lastCallDate;
        const daysSinceLastCall = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        statusReason = `${data.calls.length} llamada${data.calls.length !== 1 ? 's' : ''} realizadas sin éxito. Última hace ${daysSinceLastCall} día${daysSinceLastCall !== 1 ? 's' : ''}`;
      }

      // Formatear la fecha de la última llamada
      let lastCallFormatted = 'N/A';
      if (data.lastSuccessfulCall) {
        const day = data.lastSuccessfulCall.getDate().toString().padStart(2, '0');
        const month = (data.lastSuccessfulCall.getMonth() + 1).toString().padStart(2, '0');
        const year = data.lastSuccessfulCall.getFullYear();
        lastCallFormatted = `${day}-${month}-${year}`;
      } else if (data.lastCallDate) {
        const day = data.lastCallDate.getDate().toString().padStart(2, '0');
        const month = (data.lastCallDate.getMonth() + 1).toString().padStart(2, '0');
        const year = data.lastCallDate.getFullYear();
        lastCallFormatted = `${day}-${month}-${year}`;
      }

      return {
        id: data.beneficiary,
        beneficiary: data.beneficiary,
        operator: operatorName,
        phone,
        commune,
        status,
        statusReason,
        lastCall: lastCallFormatted,
        callCount: data.calls.length,
        successfulCallCount: data.successfulCalls.length,
        daysSinceLastCall: daysSinceLastSuccess,
        lastCallResult: data.lastCallResult || 'Sin resultado',
      };
    });

    // Ordenar: urgentes primero, luego pendientes, luego al día
    result.sort((a, b) => {
      const statusOrder = { urgente: 0, pendiente: 1, 'al-dia': 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

    return result;
  }, [processedData, assignments]);

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

  // Calcular estadísticas
  const stats = useMemo(() => {
    return {
      alDia: followUpData.filter(f => f.status === 'al-dia').length,
      pendientes: followUpData.filter(f => f.status === 'pendiente').length,
      urgentes: followUpData.filter(f => f.status === 'urgente').length,
      total: followUpData.length,
    };
  }, [followUpData]);

  const hasData = processedData && processedData.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Activity className="w-7 h-7 text-teal-600" />
              Historial de Seguimientos
            </h2>
            <p className="text-gray-600 mt-1">
              Clasificación de beneficiarios por frecuencia y estado de contacto
            </p>
          </div>
          {hasData && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Total de beneficiarios</p>
              <p className="text-3xl font-bold text-teal-700">{stats.total}</p>
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
              key={item.id}
              className={`bg-white rounded-lg p-5 border-l-4 shadow-sm
                         transition-all duration-200 hover:shadow-md border border-gray-100 ${
                item.status === 'al-dia'
                  ? 'border-l-teal-500'
                  : item.status === 'pendiente'
                  ? 'border-l-orange-500'
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
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {item.status === 'al-dia' ? '✅ Al día' : 
                   item.status === 'pendiente' ? '⏳ Pendiente' : '⚠️ Urgente'}
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
