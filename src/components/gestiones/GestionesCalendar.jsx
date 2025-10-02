import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon,
  Clock,
  User,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  TrendingUp,
  Filter
} from 'lucide-react';
import { useGestionesStore, GESTION_ESTADOS, ESTADO_COLORS } from '../../stores/useGestionesStore';
import ViewEditGestionModal from './ViewEditGestionModal';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Configuración del localizador para fechas en español
const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Mensajes en español para react-big-calendar
const messages = {
  allDay: 'Todo el día',
  previous: 'Anterior',
  next: 'Siguiente',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay gestiones en este rango',
  showMore: total => `+ Ver más (${total})`
};

/**
 * Componente del calendario compartido de gestiones
 * Muestra todas las gestiones de todos los usuarios con estados visuales
 */
const GestionesCalendar = ({ onSelectGestion, onSelectDate }) => {
  const {
    gestiones,
    calendarEvents,
    isLoading,
    error,
    getGestionesByDate,
    getGestionesStats
  } = useGestionesStore();

  // Estados locales
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  
  // Estados para el modal de visualización/edición
  const [selectedGestion, setSelectedGestion] = useState(null);
  const [showViewEditModal, setShowViewEditModal] = useState(false);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    return getGestionesStats();
  }, [calendarEvents, getGestionesStats]);

  // Filtrar eventos por estado si hay filtro activo
  const eventosFilterados = useMemo(() => {
    if (filtroEstado === 'todos') return calendarEvents;
    
    return calendarEvents.filter(event => 
      event.resource.estado === filtroEstado
    );
  }, [calendarEvents, filtroEstado]);

  // Estilos para eventos según estado
  const eventStyleGetter = (event) => {
    const color = event.resource?.color || ESTADO_COLORS[GESTION_ESTADOS.ABIERTO];
    
    return {
      style: {
        backgroundColor: color,
        border: 'none',
        borderRadius: '6px',
        color: 'white',
        fontSize: '11px',
        fontWeight: '500',
        padding: '2px 6px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        opacity: event.resource?.estado === GESTION_ESTADOS.FINALIZADO ? 0.7 : 1
      }
    };
  };

  // Manejar clic en un día del calendario
  const handleSelectSlot = ({ start }) => {
    const gestionesDelDia = getGestionesByDate(start);
    if (onSelectDate) {
      onSelectDate(start, gestionesDelDia);
    }
  };

  // Manejar clic en una gestión específica
  const handleSelectEvent = (event) => {
    console.log('🔍 Click en evento del calendario:', event);
    console.log('📋 Gestiones disponibles:', gestiones?.length || 0);
    console.log('🆔 Buscando gestión con ID:', event.id);
    
    // Buscar la gestión completa usando el ID del evento
    const gestion = gestiones?.find(g => g.id === event.id);
    
    if (gestion) {
      console.log('✅ Gestión encontrada:', gestion.titulo);
      setSelectedGestion(gestion);
      setShowViewEditModal(true);
    } else {
      console.error('❌ No se encontró la gestión con ID:', event.id);
      console.log('📋 IDs disponibles:', gestiones?.map(g => g.id) || []);
    }
  };

  // Componente de filtros
  const FiltersSection = () => (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos los estados</option>
          <option value={GESTION_ESTADOS.ABIERTO}>Abiertas</option>
          <option value={GESTION_ESTADOS.PENDIENTE}>Pendientes</option>
          <option value={GESTION_ESTADOS.EN_CURSO}>En Curso</option>
          <option value={GESTION_ESTADOS.FINALIZADO}>Finalizadas</option>
        </select>
      </div>

      <button
        onClick={() => setShowStatsModal(true)}
        className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <TrendingUp className="h-4 w-4" />
        Ver Estadísticas
      </button>
    </div>
  );

  // Modal de estadísticas
  const StatsModal = () => (
    <AnimatePresence>
      {showStatsModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowStatsModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Estadísticas de Gestiones
              </h3>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.porcentajeResolucion}%</div>
                  <div className="text-sm text-gray-600">Resueltas</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ESTADO_COLORS[GESTION_ESTADOS.ABIERTO] }}></div>
                    <span className="text-sm">Abiertas</span>
                  </div>
                  <span className="font-semibold">{stats.abiertas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ESTADO_COLORS[GESTION_ESTADOS.PENDIENTE] }}></div>
                    <span className="text-sm">Pendientes</span>
                  </div>
                  <span className="font-semibold">{stats.pendientes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ESTADO_COLORS[GESTION_ESTADOS.EN_CURSO] }}></div>
                    <span className="text-sm">En Curso</span>
                  </div>
                  <span className="font-semibold">{stats.enCurso}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ESTADO_COLORS[GESTION_ESTADOS.FINALIZADO] }}></div>
                    <span className="text-sm">Finalizadas</span>
                  </div>
                  <span className="font-semibold">{stats.finalizadas}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando calendario...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">Error cargando las gestiones: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas rápidas */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
            Calendario de Gestiones Compartidas
          </h2>
          <p className="text-gray-600 mt-1">
            {eventosFilterados.length} gestión{eventosFilterados.length !== 1 ? 'es' : ''} 
            {filtroEstado !== 'todos' && ` (${filtroEstado})`}
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-500">Resolución:</span>
          <span className="font-semibold text-green-600">{stats.porcentajeResolucion}%</span>
        </div>
      </motion.div>

      {/* Filtros */}
      <FiltersSection />

      {/* Leyenda de colores */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg"
      >
        <div className="text-sm text-gray-600 font-medium">Estados:</div>
        {Object.entries(ESTADO_COLORS).map(([estado, color]) => (
          <div key={estado} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-sm text-gray-700 capitalize">
              {estado.replace('_', ' ')}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Calendario principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow-md"
      >
        <div className="p-6">
          <div className="h-96 md:h-[600px]">
            <Calendar
              localizer={localizer}
              events={eventosFilterados}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              culture="es"
              messages={messages}
              eventPropGetter={eventStyleGetter}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              selectable={true}
              view={view}
              onView={setView}
              date={currentDate}
              onNavigate={setCurrentDate}
              views={['month', 'week', 'day']}
              step={60}
              showMultiDayTimes={false}
              popup={true}
              popupOffset={30}
              className="rbc-calendar-gestiones"
            />
          </div>
        </div>
      </motion.div>

      {/* Modal de estadísticas */}
      <StatsModal />

      {/* Modal de visualización/edición de gestión */}
      <ViewEditGestionModal
        gestion={selectedGestion}
        isOpen={showViewEditModal}
        onClose={() => {
          setShowViewEditModal(false);
          setSelectedGestion(null);
        }}
      />

      {/* Estilos específicos para el calendario de gestiones */}
      <style>{`
        .rbc-calendar-gestiones .rbc-event {
          font-size: 11px;
          line-height: 1.2;
        }
        
        .rbc-calendar-gestiones .rbc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .rbc-calendar-gestiones .rbc-today {
          background-color: #f0f9ff;
        }
      `}</style>
    </div>
  );
};

export default GestionesCalendar;