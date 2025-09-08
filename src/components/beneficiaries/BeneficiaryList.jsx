import React, { useState, useMemo } from 'react';
import { Search, Filter, Phone, MapPin, User, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Componente para mostrar lista de beneficiarios con búsqueda y filtros
 */
const BeneficiaryList = ({ 
  beneficiaries = [], 
  searchTerm = '', 
  onSearchChange,
  onEdit,
  onDelete,
  isLoading = false,
  className = ""
}) => {
  const [filterStatus, setFilterStatus] = useState('all'); // all, with-phone, without-phone, incomplete
  const [sortBy, setSortBy] = useState('name'); // name, date, phone-count
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc

  // Filtrar y ordenar beneficiarios
  const filteredAndSortedBeneficiaries = useMemo(() => {
    let filtered = [...beneficiaries];

    // Aplicar filtros de estado
    switch (filterStatus) {
      case 'with-phone':
        filtered = filtered.filter(b => 
          b.telefonosValidos && b.telefonosValidos.length > 0
        );
        break;
      case 'without-phone':
        filtered = filtered.filter(b => 
          !b.telefonosValidos || b.telefonosValidos.length === 0
        );
        break;
      case 'incomplete':
        filtered = filtered.filter(b => 
          !b.nombre || !b.direccion || (!b.telefonosValidos || b.telefonosValidos.length === 0)
        );
        break;
      default:
        // 'all' - no filtrar
        break;
    }

    // Aplicar búsqueda
    if (searchTerm && searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(b => 
        (b.nombre && b.nombre.toLowerCase().includes(search)) ||
        (b.direccion && b.direccion.toLowerCase().includes(search)) ||
        (b.fono && b.fono.includes(search)) ||
        (b.sim && b.sim.includes(search)) ||
        (b.appSim && b.appSim.includes(search))
      );
    }

    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.nombre || '').localeCompare(b.nombre || '');
          break;
        case 'date':
          const dateA = a.creadoEn?.toDate?.() || new Date(0);
          const dateB = b.creadoEn?.toDate?.() || new Date(0);
          comparison = dateA - dateB;
          break;
        case 'phone-count':
          const countA = a.telefonosValidos?.length || 0;
          const countB = b.telefonosValidos?.length || 0;
          comparison = countA - countB;
          break;
        default:
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [beneficiaries, searchTerm, filterStatus, sortBy, sortOrder]);

  const getPhoneCount = (beneficiary) => {
    return beneficiary.telefonosValidos?.length || 0;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusColor = (beneficiary) => {
    const phoneCount = getPhoneCount(beneficiary);
    
    if (!beneficiary.nombre || !beneficiary.direccion) {
      return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
    }
    
    if (phoneCount === 0) {
      return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
    }
    
    return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
  };

  const getStatusIcon = (beneficiary) => {
    const phoneCount = getPhoneCount(beneficiary);
    
    if (!beneficiary.nombre || !beneficiary.direccion) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    
    if (phoneCount === 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    
    return <User className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controles de búsqueda y filtros */}
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, dirección o teléfono..."
                value={searchTerm}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">Todos</option>
              <option value="with-phone">Con teléfono</option>
              <option value="without-phone">Sin teléfono</option>
              <option value="incomplete">Datos incompletos</option>
            </select>
            
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="name-asc">Nombre A-Z</option>
              <option value="name-desc">Nombre Z-A</option>
              <option value="date-desc">Más reciente</option>
              <option value="date-asc">Más antiguo</option>
              <option value="phone-count-desc">Más teléfonos</option>
              <option value="phone-count-asc">Menos teléfonos</option>
            </select>
          </div>
        </div>
        
        {/* Estadísticas */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Total: {beneficiaries.length}</span>
          <span>Mostrados: {filteredAndSortedBeneficiaries.length}</span>
          <span>Con teléfono: {beneficiaries.filter(b => getPhoneCount(b) > 0).length}</span>
          <span>Sin teléfono: {beneficiaries.filter(b => getPhoneCount(b) === 0).length}</span>
        </div>
      </motion.div>

      {/* Lista de beneficiarios */}
      <div className="space-y-3">
        <AnimatePresence>
          {isLoading ? (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando beneficiarios...</p>
            </motion.div>
          ) : filteredAndSortedBeneficiaries.length === 0 ? (
            <motion.div 
              className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No se encontraron beneficiarios
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm 
                  ? 'Intenta con otros términos de búsqueda o ajusta los filtros'
                  : 'Aún no hay beneficiarios cargados'
                }
              </p>
            </motion.div>
          ) : (
            filteredAndSortedBeneficiaries.map((beneficiary, index) => (
              <motion.div
                key={beneficiary.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 p-4 hover:shadow-md transition-shadow ${getStatusColor(beneficiary)}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    {/* Nombre y estado */}
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(beneficiary)}
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {beneficiary.nombre || 'Nombre no disponible'}
                      </h3>
                    </div>
                    
                    {/* Dirección */}
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">
                        {beneficiary.direccion || 'Dirección no disponible'}
                      </span>
                    </div>
                    
                    {/* Teléfonos */}
                    <div className="space-y-1">
                      {beneficiary.fono && (
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">Fono: {beneficiary.fono}</span>
                        </div>
                      )}
                      {beneficiary.sim && (
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">Sim: {beneficiary.sim}</span>
                        </div>
                      )}
                      {beneficiary.appSim && (
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">App Sim: {beneficiary.appSim}</span>
                        </div>
                      )}
                      
                      {getPhoneCount(beneficiary) === 0 && (
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">
                          Sin teléfonos válidos
                        </div>
                      )}
                    </div>
                    
                    {/* Metadata */}
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Creado: {formatDate(beneficiary.creadoEn)} • 
                      Teléfonos válidos: {getPhoneCount(beneficiary)}
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onEdit?.(beneficiary)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Editar beneficiario"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete?.(beneficiary)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Eliminar beneficiario"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
      
      {/* Paginación (si es necesaria) */}
      {filteredAndSortedBeneficiaries.length > 50 && (
        <motion.div 
          className="text-center py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando los primeros 50 resultados. 
            Usa los filtros para refinar la búsqueda.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default BeneficiaryList;
