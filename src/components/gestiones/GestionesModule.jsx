import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  RefreshCw, 
  Settings,
  Users,
  Calendar as CalendarIcon,
  List,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { useGestionesStore } from '../../stores/useGestionesStore';
import GestionesCalendar from './GestionesCalendar';
import GestionesList from './GestionesList';
import AddGestionForm from './AddGestionForm';
import CompleteGestionModal from './CompleteGestionModal';
import ViewEditGestionModal from './ViewEditGestionModal';

/**
 * Módulo principal de Gestiones Colaborativas
 * Integra calendario compartido y listado de gestiones
 */
const GestionesModule = () => {
  const { user } = useAuth();
  const { 
    initializeGestionesSubscription, 
    clearGestionesStore,
    isLoading,
    error,
    clearError
  } = useGestionesStore();

  // Estados de la UI
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showViewEditModal, setShowViewEditModal] = useState(false);
  const [selectedGestion, setSelectedGestion] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeView, setActiveView] = useState('calendar'); // calendar, list, both
  const [showSuccessMessage, setShowSuccessMessage] = useState('');

  // Inicializar suscripción cuando se monta el componente
  useEffect(() => {
    console.log('🚀 Inicializando módulo de gestiones colaborativas');
    initializeGestionesSubscription();

    // Cleanup al desmontar
    return () => {
      clearGestionesStore();
    };
  }, [initializeGestionesSubscription, clearGestionesStore]);

  // Manejar selección de gestión desde el calendario
  const handleSelectGestion = (gestion) => {
    setSelectedGestion(gestion);
    console.log('📋 Gestión seleccionada:', gestion.titulo);
  };

  // Manejar selección de fecha desde el calendario
  const handleSelectDate = (date, gestionesDelDia) => {
    setSelectedDate(date);
    console.log('📅 Fecha seleccionada:', date, 'Gestiones:', gestionesDelDia.length);
  };

  // Manejar completar gestión
  const handleCompleteGestion = (gestion) => {
    setSelectedGestion(gestion);
    setShowCompleteModal(true);
  };

  // Manejar editar gestión (placeholder para futuras mejoras)
  const handleEditGestion = (gestion) => {
    console.log('✏️ Editar gestión:', gestion.titulo);
    // TODO: Implementar formulario de edición
    setShowSuccessMessage('Función de edición próximamente disponible');
    setTimeout(() => setShowSuccessMessage(''), 3000);
  };

  // Manejar ver detalles de gestión
  const handleViewGestion = (gestion) => {
    console.log('👁️ Ver gestión:', gestion.titulo);
    setSelectedGestion(gestion);
    setShowViewEditModal(true);
  };

  // Manejar éxito al crear gestión
  const handleAddSuccess = (gestionId) => {
    setShowSuccessMessage('✅ Gestión creada exitosamente');
    setTimeout(() => setShowSuccessMessage(''), 3000);
    console.log('✅ Nueva gestión creada:', gestionId);
  };

  // Manejar éxito al completar gestión
  const handleCompleteSuccess = (gestionId) => {
    setShowSuccessMessage('✅ Gestión completada exitosamente');
    setTimeout(() => setShowSuccessMessage(''), 3000);
    setSelectedGestion(null);
    console.log('✅ Gestión completada:', gestionId);
  };

  // Limpiar fecha seleccionada
  const clearSelectedDate = () => {
    setSelectedDate(null);
  };

  // Componente de barra de acciones
  const ActionBar = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Users className="h-6 w-6 mr-2 text-blue-600" />
          Gestiones Colaborativas
        </h1>
        <p className="text-gray-600 mt-1">
          Calendario compartido y seguimiento de tareas del equipo
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Selector de vista */}
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setActiveView('calendar')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeView === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CalendarIcon className="h-4 w-4 inline mr-1" />
            Calendario
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeView === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <List className="h-4 w-4 inline mr-1" />
            Listado
          </button>
          <button
            onClick={() => setActiveView('both')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeView === 'both'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings className="h-4 w-4 inline mr-1" />
            Ambos
          </button>
        </div>

        {/* Botón nueva gestión */}
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva Gestión
        </button>
      </div>
    </motion.div>
  );

  // Componente de mensajes de éxito
  const SuccessMessage = () => (
    showSuccessMessage && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700"
      >
        {showSuccessMessage}
      </motion.div>
    )
  );

  // Componente de error
  const ErrorMessage = () => (
    error && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">Error: {error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      </motion.div>
    )
  );

  // Indicador de fecha seleccionada
  const SelectedDateInfo = () => (
    selectedDate && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CalendarIcon className="h-5 w-5 text-blue-500 mr-2" />
            <span className="text-blue-700">
              Mostrando gestiones del {selectedDate.toLocaleDateString('es-CL')}
            </span>
          </div>
          <button
            onClick={clearSelectedDate}
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            Mostrar todas
          </button>
        </div>
      </motion.div>
    )
  );

  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando módulo de gestiones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra de acciones */}
      <ActionBar />

      {/* Mensajes de estado */}
      <SuccessMessage />
      <ErrorMessage />
      <SelectedDateInfo />

      {/* Contenido principal según vista seleccionada */}
      <div className="space-y-8">
        {(activeView === 'calendar' || activeView === 'both') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GestionesCalendar
              onSelectGestion={handleSelectGestion}
              onSelectDate={handleSelectDate}
            />
          </motion.div>
        )}

        {(activeView === 'list' || activeView === 'both') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: activeView === 'both' ? 0.2 : 0.1 }}
          >
            <GestionesList
              onEditGestion={handleEditGestion}
              onCompleteGestion={handleCompleteGestion}
              onViewGestion={handleViewGestion}
              selectedDate={selectedDate}
            />
          </motion.div>
        )}
      </div>

      {/* Modales */}
      <AddGestionForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={handleAddSuccess}
      />

      <CompleteGestionModal
        isOpen={showCompleteModal}
        gestion={selectedGestion}
        onClose={() => {
          setShowCompleteModal(false);
          setSelectedGestion(null);
        }}
        onSuccess={handleCompleteSuccess}
      />

      <ViewEditGestionModal
        gestion={selectedGestion}
        isOpen={showViewEditModal}
        onClose={() => {
          setShowViewEditModal(false);
          setSelectedGestion(null);
        }}
      />
    </div>
  );
};

export default GestionesModule;