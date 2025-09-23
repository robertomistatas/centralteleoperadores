import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  User, 
  Calendar,
  Save,
  Search,
  ChevronDown
} from 'lucide-react';

/**
 * Formulario modal para registrar nuevos contactos/seguimientos
 * Permite seleccionar beneficiario y registrar resultado de llamada
 */
const NewContactForm = ({ 
  beneficiario = null, 
  beneficiarios = [], 
  onSave, 
  onClose 
}) => {
  // Función para obtener fecha/hora actual en zona horaria de Chile
  const getCurrentChileanDateTime = () => {
    const now = new Date();
    const chileanTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    
    // Formatear para datetime-local input (YYYY-MM-DDTHH:mm)
    const year = chileanTime.getFullYear();
    const month = String(chileanTime.getMonth() + 1).padStart(2, '0');
    const day = String(chileanTime.getDate()).padStart(2, '0');
    const hours = String(chileanTime.getHours()).padStart(2, '0');
    const minutes = String(chileanTime.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    beneficiarioId: beneficiario?.id || '',
    beneficiario: beneficiario?.beneficiary || '',
    telefono: beneficiario?.primaryPhone || '',
    tipoContacto: 'llamada', // llamada, presencial
    tipoResultado: '', // exitoso, fallido, no-respuesta, ocupado, mensaje
    observaciones: '',
    fechaContacto: getCurrentChileanDateTime()
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBeneficiarySearch, setShowBeneficiarySearch] = useState(!beneficiario);
  const [searchTerm, setSearchTerm] = useState('');
  
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  // Focus en el primer input al montar
  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  // Cerrar modal con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Tipos de contacto disponibles
  const tiposContacto = [
    { value: 'llamada', label: 'Llamada Telefónica', icon: Phone },
    { value: 'presencial', label: 'Visita Presencial', icon: User }
  ];

  // Tipos de resultado disponibles
  const tiposResultado = [
    { value: 'exitoso', label: 'Contacto Exitoso', icon: CheckCircle, color: 'text-emerald-700' },
    { value: 'no-respuesta', label: 'No Responde', icon: XCircle, color: 'text-amber-700' },
    { value: 'ocupado', label: 'Línea Ocupada', icon: Clock, color: 'text-slate-600' },
    { value: 'mensaje', label: 'Mensaje Dejado', icon: MessageSquare, color: 'text-slate-700' },
    { value: 'fallido', label: 'Llamada Fallida', icon: XCircle, color: 'text-rose-700' }
  ];

  // Beneficiarios filtrados para búsqueda
  const beneficiariosFiltrados = beneficiarios.filter(b =>
    b.beneficiary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.primaryPhone?.includes(searchTerm) ||
    b.commune?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Debug para verificar beneficiarios disponibles
  useEffect(() => {
    console.log('🔍 NewContactForm - Debug beneficiarios:', {
      totalBeneficiarios: beneficiarios.length,
      searchTerm,
      beneficiariosFiltrados: beneficiariosFiltrados.length,
      primerosEjemplos: beneficiarios.slice(0, 3).map(b => ({
        beneficiary: b.beneficiary,
        primaryPhone: b.primaryPhone,
        commune: b.commune
      }))
    });
  }, [beneficiarios, searchTerm, beneficiariosFiltrados.length]);

  // Manejar cambios en el formulario
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo cuando se corrige
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Seleccionar beneficiario
  const handleSelectBeneficiario = (benef) => {
    setFormData(prev => ({
      ...prev,
      beneficiarioId: benef.id || '',
      beneficiario: benef.beneficiary || '',
      telefono: benef.primaryPhone || ''
    }));
    setShowBeneficiarySearch(false);
    setSearchTerm('');
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    if (!formData.beneficiario.trim()) {
      newErrors.beneficiario = 'Debe seleccionar un beneficiario';
    }

    if (!formData.tipoContacto) {
      newErrors.tipoContacto = 'Debe seleccionar el tipo de contacto';
    }

    if (!formData.tipoResultado) {
      newErrors.tipoResultado = 'Debe seleccionar el resultado del contacto';
    }

    if (!formData.fechaContacto) {
      newErrors.fechaContacto = 'Debe especificar la fecha y hora';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSave({
        ...formData,
        id: Date.now().toString(), // ID temporal
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error guardando contacto:', error);
      setErrors({ submit: 'Error al guardar el contacto. Intenta nuevamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Registrar Nuevo Contacto
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Ingresa los detalles del seguimiento realizado
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Selección de Beneficiario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beneficiario *
            </label>
            
            {showBeneficiarySearch ? (
              <div className="space-y-3">
                {/* Búsqueda */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={firstInputRef}
                    type="text"
                    placeholder="Buscar beneficiario por nombre, teléfono o comuna..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900 shadow-sm transition-all duration-200"
                  />
                </div>
                
                {/* Lista de beneficiarios */}
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {beneficiariosFiltrados.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {searchTerm ? 'No se encontraron beneficiarios' : 'Escribe para buscar beneficiarios'}
                    </div>
                  ) : (
                    beneficiariosFiltrados.map((benef, index) => (
                      <button
                        key={benef.id || index}
                        type="button"
                        onClick={() => handleSelectBeneficiario(benef)}
                        className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {benef.beneficiary}
                        </div>
                        <div className="text-sm text-gray-600">
                          {benef.primaryPhone} • {benef.commune}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div>
                  <div className="font-medium text-gray-900">
                    {formData.beneficiario}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formData.telefono}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBeneficiarySearch(true)}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                >
                  Cambiar
                </button>
              </div>
            )}
            
            {errors.beneficiario && (
              <p className="text-red-500 text-sm mt-1">{errors.beneficiario}</p>
            )}
          </div>

          {/* Fecha y Hora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha y Hora del Contacto *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="datetime-local"
                value={formData.fechaContacto}
                onChange={(e) => handleChange('fechaContacto', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900 shadow-sm transition-all duration-200"
              />
            </div>
            {errors.fechaContacto && (
              <p className="text-red-500 text-sm mt-1">{errors.fechaContacto}</p>
            )}
          </div>

          {/* Tipo de Contacto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Contacto *
            </label>
            <div className="flex gap-3">
              {tiposContacto.map(tipo => {
                const Icon = tipo.icon;
                return (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => handleChange('tipoContacto', tipo.value)}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      formData.tipoContacto === tipo.value
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{tipo.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.tipoContacto && (
              <p className="text-red-500 text-sm mt-1">{errors.tipoContacto}</p>
            )}
          </div>

          {/* Resultado del Contacto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resultado del Contacto *
            </label>
            <div className="grid grid-cols-1 gap-2">
              {tiposResultado.map(resultado => {
                const Icon = resultado.icon;
                return (
                  <button
                    key={resultado.value}
                    type="button"
                    onClick={() => handleChange('tipoResultado', resultado.value)}
                    className={`p-3 rounded-lg border-2 transition-colors text-left ${
                      formData.tipoResultado === resultado.value
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${resultado.color}`} />
                      <span className="font-medium text-gray-900">
                        {resultado.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.tipoResultado && (
              <p className="text-red-500 text-sm mt-1">{errors.tipoResultado}</p>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              placeholder="Notas adicionales sobre el contacto..."
              rows={4}
              className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900 resize-none shadow-sm transition-all duration-200"
            />
          </div>

          {/* Error de envío */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            
            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-6 py-2 rounded-lg transition-colors shadow-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Contacto
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default NewContactForm;
