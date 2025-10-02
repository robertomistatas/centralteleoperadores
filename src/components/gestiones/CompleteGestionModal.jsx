import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle, 
  AlertCircle,
  FileText,
  User,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { useGestionesStore } from '../../stores/useGestionesStore';
import { useAuth } from '../../AuthContext';

/**
 * Modal para completar y tipificar gestiones
 * Permite marcar una gestión como finalizada con una solución
 */
const CompleteGestionModal = ({ isOpen, gestion, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { completeGestion, isLoading } = useGestionesStore();

  // Estado del formulario
  const [solucion, setSolucion] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validar formulario
  const validateForm = () => {
    if (!solucion.trim()) {
      setError('La descripción de la solución es obligatoria');
      return false;
    }
    
    if (solucion.length < 10) {
      setError('La solución debe tener al menos 10 caracteres');
      return false;
    }
    
    if (solucion.length > 500) {
      setError('La solución no puede exceder 500 caracteres');
      return false;
    }
    
    setError('');
    return true;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await completeGestion(
        gestion.id,
        solucion.trim(),
        user.uid,
        user.displayName || user.email
      );

      console.log('✅ Gestión completada:', gestion.id);

      // Limpiar formulario
      setSolucion('');
      
      // Notificar éxito y cerrar modal
      if (onSuccess) {
        onSuccess(gestion.id);
      }
      onClose();

    } catch (error) {
      console.error('❌ Error completando gestión:', error);
      setError('Error al completar la gestión. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Limpiar formulario al cerrar
  const handleClose = () => {
    setSolucion('');
    setError('');
    onClose();
  };

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return 'No especificada';
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!gestion) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Completar Gestión
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Información de la gestión */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">{gestion.titulo}</h3>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Creada por: <strong>{gestion.creadorNombre}</strong></span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Fecha: {formatDate(gestion.createdAt)}</span>
                </div>
                
                {gestion.fechaVencimiento && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Vencimiento: {formatDate(gestion.fechaVencimiento)}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    gestion.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                    gestion.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    Prioridad: {gestion.prioridad?.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {gestion.categoria?.toUpperCase()}
                  </span>
                </div>
              </div>

              {gestion.descripcion && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5" />
                    <p className="text-sm text-gray-700">{gestion.descripcion}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Formulario de solución */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="solucion" className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Descripción de la Solución *
                </label>
                <textarea
                  id="solucion"
                  value={solucion}
                  onChange={(e) => setSolucion(e.target.value)}
                  placeholder="Describe cómo se resolvió la gestión, qué acciones se tomaron, resultados obtenidos..."
                  rows={5}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${
                    error ? 'border-red-500' : 'border-gray-300'
                  }`}
                  maxLength={500}
                />
                {error && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {error}
                  </p>
                )}
                <div className="mt-1 text-xs text-gray-500 text-right">
                  {solucion.length}/500 caracteres
                </div>
              </div>

              {/* Información adicional */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-green-800 font-medium">
                      Al completar esta gestión:
                    </p>
                    <ul className="text-green-700 mt-1 space-y-1">
                      <li>• Se marcará como "Finalizada"</li>
                      <li>• Se registrará tu nombre como quien la completó</li>
                      <li>• La solución será visible para todos los usuarios</li>
                      <li>• Ya no podrá ser editada</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Completando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Completar Gestión
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CompleteGestionModal;