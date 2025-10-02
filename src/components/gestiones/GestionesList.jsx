import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search,
  Filter,
  Clock,
  User,
  MessageSquare,
  CheckCircle,
  Play,
  Eye,
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar
} from 'lucide-react';
import { useGestionesStore, GESTION_ESTADOS, ESTADO_COLORS } from '../../stores/useGestionesStore';
import { useAuth } from '../../AuthContext';

/**
 * Componente del listado de gestiones con acciones
 * Muestra todas las gestiones con filtros y botones de acción
 */
const GestionesList = ({ 
  onEditGestion, 
  onCompleteGestion, 
  onViewGestion,
  selectedDate = null 
}) => {
  const { user } = useAuth();
  const {
    gestiones,
    isLoading,
    searchGestiones,
    getGestionesByEstado,
    markGestionEnCurso,
    deleteGestion
  } = useGestionesStore();

  // Estados locales
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [sortBy, setSortBy] = useState('fecha'); // fecha, estado, creador
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc

  // Filtrar gestiones según búsqueda y filtros
  const gestionesFiltradas = useMemo(() => {
    let resultado = gestiones;

    // Filtrar por fecha seleccionada si existe
    if (selectedDate) {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      resultado = resultado.filter(gestion => {
        const fechaComparacion = gestion.fechaVencimiento || gestion.createdAt;
        return fechaComparacion >= startOfDay && fechaComparacion <= endOfDay;
      });
    }

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      resultado = searchGestiones(searchTerm);
    }

    // Filtrar por estado
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(g => g.estado === filtroEstado);
    }

    // Ordenar resultados
    resultado.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'fecha':
          valueA = a.createdAt;
          valueB = b.createdAt;
          break;
        case 'estado':
          valueA = a.estado;
          valueB = b.estado;
          break;
        case 'creador':
          valueA = a.creadorNombre.toLowerCase();
          valueB = b.creadorNombre.toLowerCase();
          break;
        default:
          valueA = a.createdAt;
          valueB = b.createdAt;
      }

      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    return resultado;
  }, [gestiones, searchTerm, filtroEstado, sortBy, sortOrder, selectedDate, searchGestiones]);

  // Función para formatear fecha relativa
  const formatRelativeDate = (date) => {
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return date.toLocaleDateString('es-CL');
  };

  // Función para obtener el color del badge de estado
  const getEstadoBadge = (estado) => {
    const colors = {
      [GESTION_ESTADOS.ABIERTO]: 'bg-blue-100 text-blue-800',
      [GESTION_ESTADOS.PENDIENTE]: 'bg-yellow-100 text-yellow-800',
      [GESTION_ESTADOS.EN_CURSO]: 'bg-purple-100 text-purple-800',
      [GESTION_ESTADOS.FINALIZADO]: 'bg-green-100 text-green-800'
    };

    return colors[estado] || colors[GESTION_ESTADOS.ABIERTO];
  };

  // Función para determinar si el usuario puede editar/eliminar la gestión
  const canEditGestion = (gestion) => {
    return user?.uid === gestion.creadorId || user?.role === 'admin' || user?.email?.includes('admin');
  };

  // Manejar marcar en curso
  const handleMarkEnCurso = async (gestionId) => {
    try {
      await markGestionEnCurso(gestionId, user.uid);
    } catch (error) {
      console.error('Error marcando gestión en curso:', error);
    }
  };

  // Manejar eliminación
  const handleDelete = async (gestionId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta gestión?')) {
      try {
        await deleteGestion(gestionId);
      } catch (error) {
        console.error('Error eliminando gestión:', error);
      }
    }
  };

  // Componente de la tarjeta de gestión
  const GestionCard = ({ gestion, index }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      {/* Header de la tarjeta */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">
            {gestion.titulo}
          </h3>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadge(gestion.estado)}`}>
              {gestion.estado.replace('_', ' ').toUpperCase()}
            </span>
            {gestion.prioridad && (
              <span className={`px-2 py-1 rounded-full text-xs ${
                gestion.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                gestion.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {gestion.prioridad.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        
        {/* Menú de acciones */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewGestion && onViewGestion(gestion)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Ver detalles"
          >
            <Eye className="h-4 w-4" />
          </button>
          
          {gestion.estado !== GESTION_ESTADOS.FINALIZADO && (
            <>
              {gestion.estado === GESTION_ESTADOS.ABIERTO && (
                <button
                  onClick={() => handleMarkEnCurso(gestion.id)}
                  className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                  title="Marcar en curso"
                >
                  <Play className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={() => onCompleteGestion && onCompleteGestion(gestion)}
                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                title="Completar gestión"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
            </>
          )}
          
          {canEditGestion(gestion) && (
            <>
              <button
                onClick={() => onEditGestion && onEditGestion(gestion)}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Editar"
              >
                <Edit className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => handleDelete(gestion.id)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Descripción */}
      {gestion.descripcion && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {gestion.descripcion}
        </p>
      )}

      {/* Footer con información adicional */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{gestion.creadorNombre}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeDate(gestion.createdAt)}</span>
          </div>
        </div>
        
        {gestion.fechaVencimiento && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Vence: {gestion.fechaVencimiento.toLocaleDateString('es-CL')}</span>
          </div>
        )}
      </div>

      {/* Información de finalización */}
      {gestion.estado === GESTION_ESTADOS.FINALIZADO && gestion.finalizadaNombre && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="h-3 w-3" />
            <span>Finalizada por {gestion.finalizadaNombre}</span>
          </div>
          {gestion.solucion && (
            <p className="text-xs text-gray-600 mt-1 italic">
              "{gestion.solucion}"
            </p>
          )}
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Listado de Gestiones
            {selectedDate && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                - {selectedDate.toLocaleDateString('es-CL')}
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600">
            {gestionesFiltradas.length} gestión{gestionesFiltradas.length !== 1 ? 'es' : ''} encontrada{gestionesFiltradas.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Controles de filtrado y búsqueda */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título, descripción o creador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los estados</option>
            <option value={GESTION_ESTADOS.ABIERTO}>Abiertas</option>
            <option value={GESTION_ESTADOS.PENDIENTE}>Pendientes</option>
            <option value={GESTION_ESTADOS.EN_CURSO}>En Curso</option>
            <option value={GESTION_ESTADOS.FINALIZADO}>Finalizadas</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fecha-desc">Más recientes</option>
            <option value="fecha-asc">Más antiguas</option>
            <option value="estado-asc">Por estado</option>
            <option value="creador-asc">Por creador</option>
          </select>
        </div>
      </div>

      {/* Lista de gestiones */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando gestiones...</span>
          </div>
        ) : gestionesFiltradas.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || filtroEstado !== 'todos' 
                ? 'No se encontraron gestiones con los filtros aplicados' 
                : 'No hay gestiones registradas'
              }
            </p>
          </div>
        ) : (
          gestionesFiltradas.map((gestion, index) => (
            <GestionCard 
              key={gestion.id} 
              gestion={gestion} 
              index={index}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default GestionesList;