import React, { useState, useEffect } from 'react';
import { UserX, Search, AlertTriangle, Users, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { findBeneficiaryMatch } from '../../utils/stringNormalization';

/**
 * Componente para mostrar beneficiarios sin teleoperadora asignada
 */
const UnassignedBeneficiaries = ({ 
  beneficiaries = [], 
  assignments = [], 
  onAssignOperator,
  className = ""
}) => {
  const [unassignedBeneficiaries, setUnassignedBeneficiaries] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Calcular beneficiarios no asignados
  useEffect(() => {
    const calculateUnassigned = () => {
      setIsLoading(true);
      
      // Crear lista de beneficiarios asignados a partir de assignments
      const assignedBeneficiaries = assignments.map(assignment => ({
        nombre: assignment.nombre || assignment.beneficiario,
        telefono: assignment.telefono || assignment.fono,
        teleoperadora: assignment.teleoperadora || assignment.operador
      })).filter(item => item.nombre); // Filtrar elementos válidos
      
      // Encontrar beneficiarios de la base que no están en assignments
      const unassigned = beneficiaries.filter(beneficiary => {
        const match = findBeneficiaryMatch(beneficiary, assignedBeneficiaries);
        return !match; // Si no hay coincidencia, está sin asignar
      });
      
      setUnassignedBeneficiaries(unassigned);
      setIsLoading(false);
    };

    if (beneficiaries.length > 0) {
      calculateUnassigned();
    } else {
      setIsLoading(false);
    }
  }, [beneficiaries, assignments]);

  // Filtrar por búsqueda
  const filteredUnassigned = unassignedBeneficiaries.filter(beneficiary => {
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      (beneficiary.nombre && beneficiary.nombre.toLowerCase().includes(search)) ||
      (beneficiary.direccion && beneficiary.direccion.toLowerCase().includes(search)) ||
      (beneficiary.fono && beneficiary.fono.includes(search)) ||
      (beneficiary.sim && beneficiary.sim.includes(search)) ||
      (beneficiary.appSim && beneficiary.appSim.includes(search))
    );
  });

  const getValidPhones = (beneficiary) => {
    return [beneficiary.fono, beneficiary.sim, beneficiary.appSim]
      .filter(phone => phone && phone !== '000000000')
      .join(', ') || 'Sin teléfonos válidos';
  };

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Analizando asignaciones...
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div 
        className="p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              unassignedBeneficiaries.length > 0 
                ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                : 'bg-green-100 dark:bg-green-900/20'
            }`}>
              {unassignedBeneficiaries.length > 0 ? (
                <UserX className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Beneficiarios sin asignar
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {unassignedBeneficiaries.length === 0 
                  ? 'Todos los beneficiarios tienen teleoperadora asignada'
                  : `${unassignedBeneficiaries.length} beneficiarios sin teleoperadora`
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Badge con conteo */}
            {unassignedBeneficiaries.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                {unassignedBeneficiaries.length}
              </span>
            )}
            
            {/* Icono de expandir/contraer */}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Contenido expandible */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {unassignedBeneficiaries.length === 0 ? (
              // Estado vacío
              <div className="p-6 text-center">
                <Users className="mx-auto h-12 w-12 text-green-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  ¡Excelente!
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Todos los beneficiarios de la base tienen una teleoperadora asignada.
                </p>
              </div>
            ) : (
              // Lista de beneficiarios sin asignar
              <div className="p-4 space-y-4">
                {/* Búsqueda */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar beneficiarios sin asignar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* Alerta informativa */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                        Beneficiarios sin teleoperadora asignada
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                        Estos beneficiarios están en la base pero no aparecen en el módulo de Asignaciones.
                        Es recomendable asignarles una teleoperadora para garantizar el seguimiento.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de beneficiarios */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredUnassigned.length === 0 ? (
                    <div className="text-center py-6">
                      <Search className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No se encontraron beneficiarios con ese criterio de búsqueda
                      </p>
                    </div>
                  ) : (
                    filteredUnassigned.map((beneficiary, index) => (
                      <motion.div
                        key={beneficiary.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            {/* Nombre */}
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {beneficiary.nombre}
                            </h4>
                            
                            {/* Dirección */}
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              📍 {beneficiary.direccion}
                            </p>
                            
                            {/* Teléfonos */}
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <Phone className="h-4 w-4" />
                              <span>{getValidPhones(beneficiary)}</span>
                            </div>
                            
                            {/* Metadata */}
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {beneficiary.telefonosValidos?.length || 0} teléfonos válidos
                            </div>
                          </div>
                          
                          {/* Botón de asignar */}
                          <button
                            onClick={() => onAssignOperator?.(beneficiary)}
                            className="ml-3 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                          >
                            Asignar
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Estadísticas */}
                <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {filteredUnassigned.length} de {unassignedBeneficiaries.length} beneficiarios mostrados
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UnassignedBeneficiaries;
