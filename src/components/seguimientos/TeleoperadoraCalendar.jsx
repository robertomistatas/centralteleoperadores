import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon,
  Clock,
  Phone,
  User,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { useSeguimientosStore } from '../../stores/useSeguimientosStore';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';

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

// Configuración de mensajes en español para react-big-calendar
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
  noEventsInRange: 'No hay eventos en este rango',
  showMore: total => `+ Ver más (${total})`
};

/**
 * Componente de calendario para teleoperadoras
 * Muestra todos los contactos realizados con sincronización en tiempo real
 */
const TeleoperadoraCalendar = () => {
  const { user } = useAuth();
  const {
    calendarEvents,
    isLoading,
    error,
    initializeSubscription,
    clearStore,
    getContactsByDate,
    dailyContacts,
    selectedDate,
    getStats
  } = useSeguimientosStore();

  // Estados locales
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [showModal, setShowModal] = useState(false);

  // Inicializar suscripción cuando se monta el componente
  useEffect(() => {
    if (user?.uid) {
      console.log('📅 Inicializando calendario para usuario:', user.email);
      initializeSubscription(user.uid);
    }

    // Cleanup al desmontar
    return () => {
      clearStore();
    };
  }, [user?.uid, initializeSubscription, clearStore]);

  // Calcular estadísticas del mes
  const monthlyStats = useMemo(() => {
    return getStats();
  }, [calendarEvents, getStats]);

  // Estilos personalizados para los eventos del calendario
  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: event.resource?.color || '#3B82F6',
        border: 'none',
        borderRadius: '6px',
        color: 'white',
        fontSize: '12px',
        fontWeight: '500',
        padding: '2px 6px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }
    };
  };

  // Manejar clic en un día del calendario
  const handleSelectSlot = ({ start }) => {
    const contacts = getContactsByDate(start);
    if (contacts.length > 0) {
      setShowModal(true);
    }
  };

  // Manejar clic en un evento específico
  const handleSelectEvent = (event) => {
    getContactsByDate(event.start);
    setShowModal(true);
  };

  // Componente del modal con detalles del día
  const DayDetailsModal = () => (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
                {selectedDate && format(selectedDate, 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {dailyContacts.length} contacto{dailyContacts.length !== 1 ? 's' : ''} realizado{dailyContacts.length !== 1 ? 's' : ''} este día
              </p>

              {dailyContacts.map((contact, index) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="font-medium text-gray-900">
                        {contact.beneficiarioNombre || 'Sin nombre'}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      contact.resultado?.toLowerCase().includes('exitoso')
                        ? 'bg-green-100 text-green-800'
                        : contact.resultado?.toLowerCase().includes('sin respuesta')
                        ? 'bg-yellow-100 text-yellow-800'
                        : contact.resultado?.toLowerCase().includes('ocupado')
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {contact.resultado || 'Sin resultado'}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    {contact.telefono && (
                      <div className="flex items-center">
                        <Phone className="h-3 w-3 mr-2" />
                        {contact.telefono}
                      </div>
                    )}
                    {contact.fechaContacto && (
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-2" />
                        {contact.fechaContacto?.toDate 
                          ? format(contact.fechaContacto.toDate(), 'HH:mm')
                          : 'Hora no disponible'
                        }
                      </div>
                    )}
                    {contact.observaciones && (
                      <div className="flex items-start">
                        <MessageSquare className="h-3 w-3 mr-2 mt-0.5" />
                        <span className="text-xs">{contact.observaciones}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Componente de estadísticas mensuales
  const MonthlyStatsCard = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md p-6 mb-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
        Estadísticas del Mes
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{monthlyStats.totalContactos}</div>
          <div className="text-sm text-gray-600">Total Contactos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{monthlyStats.exitosos}</div>
          <div className="text-sm text-gray-600">Exitosos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{monthlyStats.sinRespuesta}</div>
          <div className="text-sm text-gray-600">Sin Respuesta</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{monthlyStats.tasaExito}%</div>
          <div className="text-sm text-gray-600">Tasa de Éxito</div>
        </div>
      </div>
    </motion.div>
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
          <span className="text-red-700">Error cargando el calendario: {error}</span>
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
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="h-6 w-6 mr-2 text-blue-600" />
            Ver Calendario
          </h1>
          <p className="text-gray-600 mt-1">
            Historial completo de contactos realizados
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <span className="text-sm text-gray-600">
            {calendarEvents.length} evento{calendarEvents.length !== 1 ? 's' : ''} registrado{calendarEvents.length !== 1 ? 's' : ''}
          </span>
        </div>
      </motion.div>

      {/* Estadísticas mensuales */}
      <MonthlyStatsCard />

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
              events={calendarEvents}
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
              className="rbc-calendar"
            />
          </div>
        </div>
      </motion.div>

      {/* Modal de detalles del día */}
      <DayDetailsModal />

      {/* Estilos CSS para react-big-calendar con Tailwind */}
      <style>{`
        .rbc-calendar {
          font-family: inherit;
        }

        .rbc-header {
          padding: 12px 8px;
          font-weight: 600;
          color: #374151;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .rbc-month-view {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .rbc-date-cell {
          padding: 8px;
        }

        .rbc-date-cell > a {
          color: #374151;
          font-weight: 500;
        }

        .rbc-off-range {
          color: #9ca3af;
        }

        .rbc-today {
          background-color: #eff6ff;
        }

        .rbc-event {
          border-radius: 6px;
          padding: 2px 6px;
          margin: 1px;
          font-size: 12px;
          cursor: pointer;
        }

        .rbc-event:hover {
          opacity: 0.8;
        }

        .rbc-slot-selection {
          background-color: rgba(59, 130, 246, 0.1);
        }

        .rbc-toolbar {
          margin-bottom: 20px;
          padding: 16px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .rbc-toolbar button {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background-color: white;
          color: #374151;
          border-radius: 6px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .rbc-toolbar button:hover {
          background-color: #f3f4f6;
          border-color: #9ca3af;
        }

        .rbc-toolbar button.rbc-active {
          background-color: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .rbc-toolbar-label {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }
      `}</style>
    </div>
  );
};

export default TeleoperadoraCalendar;