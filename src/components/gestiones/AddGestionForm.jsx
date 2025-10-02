import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Save, 
  Calendar,
  AlertCircle,
  Type,
  FileText,
  Flag,
  Tag,
  Pill,
  Building2,
  ClipboardList,
  Clock,
  Repeat,
  Shield,
  Truck,
  Heart,
  Phone
} from 'lucide-react';
import { useGestionesStore } from '../../stores/useGestionesStore';
import { useAuth } from '../../AuthContext';
import { 
  TIPOS_GESTION, 
  TIPOS_GESTION_LABELS, 
  TIPOS_RECURRENCIA, 
  TIPOS_RECURRENCIA_LABELS 
} from './ViewEditGestionModal';

/**
 * Formulario modal para crear nuevas gestiones
 * Permite a cualquier usuario crear gestiones colaborativas
 */
const AddGestionForm = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { addGestion, isLoading } = useGestionesStore();

  // Estado del formulario
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo: TIPOS_GESTION.GESTION_MUNICIPAL, // Tipo por defecto
    fechaVencimiento: '',
    prioridad: 'media',
    categoria: 'general',
    
    // Campos específicos para medicamentos
    medicamentos: '',
    horaMedicamento: '',
    recurrencia: TIPOS_RECURRENCIA.UNICO,
    
    // Campos específicos para CESFAM/Hospital
    centroSalud: '',
    especialidad: '',
    
    // Campos específicos para gestión municipal
    tipoGestionMunicipal: '',
    departamento: '',
    
    // Campos específicos para seguimiento tras emergencias
    contactoCarabineros: false,
    contactoBomberos: false,
    contactoAmbulancia: false,
    contactoOtros: false,
    detalleOtros: '',
    tipoEmergencia: '',
    tipificacionSeguimiento: '',
    observacionesEmergencia: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener fecha mínima (hoy)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'El título es obligatorio';
    } else if (formData.titulo.length < 3) {
      newErrors.titulo = 'El título debe tener al menos 3 caracteres';
    } else if (formData.titulo.length > 100) {
      newErrors.titulo = 'El título no puede exceder 100 caracteres';
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es obligatoria';
    } else if (formData.descripcion.length < 10) {
      newErrors.descripcion = 'La descripción debe tener al menos 10 caracteres';
    } else if (formData.descripcion.length > 500) {
      newErrors.descripcion = 'La descripción no puede exceder 500 caracteres';
    }

    // Validaciones específicas por tipo de gestión
    switch (formData.tipo) {
      case TIPOS_GESTION.RECORDATORIO_MEDICAMENTOS:
        if (!formData.medicamentos.trim()) {
          newErrors.medicamentos = 'Debe especificar los medicamentos';
        }
        if (!formData.horaMedicamento) {
          newErrors.horaMedicamento = 'Debe especificar la hora del recordatorio';
        }
        break;
        
      case TIPOS_GESTION.TOMA_HORA_CESFAM:
        if (!formData.centroSalud.trim()) {
          newErrors.centroSalud = 'Debe especificar el centro de salud';
        }
        break;
        
      case TIPOS_GESTION.GESTION_MUNICIPAL:
        if (!formData.tipoGestionMunicipal.trim()) {
          newErrors.tipoGestionMunicipal = 'Debe especificar el tipo de gestión municipal';
        }
        break;
        
      case TIPOS_GESTION.SEGUIMIENTO_TRAS_EMERGENCIAS:
        if (!formData.tipoEmergencia.trim()) {
          newErrors.tipoEmergencia = 'Debe especificar el tipo de emergencia';
        }
        if (!formData.tipificacionSeguimiento.trim()) {
          newErrors.tipificacionSeguimiento = 'Debe especificar la tipificación del seguimiento';
        }
        if (!formData.contactoCarabineros && !formData.contactoBomberos && 
            !formData.contactoAmbulancia && !formData.contactoOtros) {
          newErrors.contactos = 'Debe seleccionar al menos un tipo de contacto con servicios de emergencia';
        }
        if (formData.contactoOtros && !formData.detalleOtros.trim()) {
          newErrors.detalleOtros = 'Debe especificar qué otros servicios se contactaron';
        }
        break;
    }

    if (formData.fechaVencimiento) {
      const fechaVenc = new Date(formData.fechaVencimiento);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fechaVenc < hoy) {
        newErrors.fechaVencimiento = 'La fecha de vencimiento no puede ser anterior a hoy';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Limpiar error específico al corregir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar datos para envío
      const gestionData = {
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim(),
        tipo: formData.tipo,
        prioridad: formData.prioridad,
        categoria: formData.categoria,
        fechaVencimiento: formData.fechaVencimiento ? new Date(formData.fechaVencimiento) : null,
        
        // Campos específicos por tipo de gestión
        ...(formData.tipo === TIPOS_GESTION.RECORDATORIO_MEDICAMENTOS && {
          medicamentos: formData.medicamentos.trim(),
          horaMedicamento: formData.horaMedicamento,
          recurrencia: formData.recurrencia
        }),
        
        ...(formData.tipo === TIPOS_GESTION.TOMA_HORA_CESFAM && {
          centroSalud: formData.centroSalud.trim(),
          especialidad: formData.especialidad.trim()
        }),
        
        ...(formData.tipo === TIPOS_GESTION.GESTION_MUNICIPAL && {
          tipoGestionMunicipal: formData.tipoGestionMunicipal.trim(),
          departamento: formData.departamento.trim()
        }),
        
        ...(formData.tipo === TIPOS_GESTION.SEGUIMIENTO_TRAS_EMERGENCIAS && {
          contactoCarabineros: formData.contactoCarabineros,
          contactoBomberos: formData.contactoBomberos,
          contactoAmbulancia: formData.contactoAmbulancia,
          contactoOtros: formData.contactoOtros,
          detalleOtros: formData.detalleOtros.trim(),
          tipoEmergencia: formData.tipoEmergencia.trim(),
          tipificacionSeguimiento: formData.tipificacionSeguimiento.trim(),
          observacionesEmergencia: formData.observacionesEmergencia.trim()
        })
      };

      // Crear la gestión
      const gestionId = await addGestion(
        gestionData, 
        user.uid, 
        user.displayName || user.email
      );

      console.log('✅ Nueva gestión creada:', gestionId);

      // Resetear formulario
      setFormData({
        titulo: '',
        descripcion: '',
        tipo: TIPOS_GESTION.GESTION_MUNICIPAL,
        fechaVencimiento: '',
        prioridad: 'media',
        categoria: 'general',
        
        // Campos específicos
        medicamentos: '',
        horaMedicamento: '',
        recurrencia: TIPOS_RECURRENCIA.UNICO,
        centroSalud: '',
        especialidad: '',
        tipoGestionMunicipal: '',
        departamento: '',
        
        // Campos específicos para seguimiento tras emergencias
        contactoCarabineros: false,
        contactoBomberos: false,
        contactoAmbulancia: false,
        contactoOtros: false,
        detalleOtros: '',
        tipoEmergencia: '',
        tipificacionSeguimiento: '',
        observacionesEmergencia: ''
      });

      // Notificar éxito y cerrar modal
      if (onSuccess) {
        onSuccess(gestionId);
      }
      onClose();

    } catch (error) {
      console.error('❌ Error creando gestión:', error);
      setErrors({ submit: 'Error al crear la gestión. Intenta nuevamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Limpiar formulario al cerrar
  const handleClose = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      tipo: TIPOS_GESTION.GESTION_MUNICIPAL,
      fechaVencimiento: '',
      prioridad: 'media',
      categoria: 'general',
      
      // Campos específicos
      medicamentos: '',
      horaMedicamento: '',
      recurrencia: TIPOS_RECURRENCIA.UNICO,
      centroSalud: '',
      especialidad: '',
      tipoGestionMunicipal: '',
      departamento: '',
      
      // Campos específicos para seguimiento tras emergencias
      contactoCarabineros: false,
      contactoBomberos: false,
      contactoAmbulancia: false,
      contactoOtros: false,
      detalleOtros: '',
      tipoEmergencia: '',
      tipificacionSeguimiento: '',
      observacionesEmergencia: ''
    });
    setErrors({});
    onClose();
  };

  // Opciones de categorías
  const categorias = [
    { value: 'general', label: 'General' },
    { value: 'tecnica', label: 'Técnica' },
    { value: 'administrativa', label: 'Administrativa' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'soporte', label: 'Soporte' },
    { value: 'mejora', label: 'Mejora' }
  ];

  // Opciones de prioridad
  const prioridades = [
    { value: 'baja', label: 'Baja', color: 'text-green-600' },
    { value: 'media', label: 'Media', color: 'text-yellow-600' },
    { value: 'alta', label: 'Alta', color: 'text-red-600' }
  ];

  // Renderizar campos específicos por tipo de gestión
  const renderCamposEspecificos = () => {
    switch (formData.tipo) {
      case TIPOS_GESTION.RECORDATORIO_MEDICAMENTOS:
        return (
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              <Pill className="h-4 w-4 mr-2 text-green-600" />
              Información del Medicamento
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medicamentos a recordar *
              </label>
              <textarea
                name="medicamentos"
                value={formData.medicamentos}
                onChange={handleChange}
                placeholder="Ej: Losartán 50mg - 1 comprimido, Metformina 850mg - 2 comprimidos"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                required
              />
              {errors.medicamentos && (
                <p className="text-red-500 text-sm mt-1">{errors.medicamentos}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Hora del recordatorio *
                </label>
                <input
                  type="time"
                  name="horaMedicamento"
                  value={formData.horaMedicamento}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.horaMedicamento && (
                  <p className="text-red-500 text-sm mt-1">{errors.horaMedicamento}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Repeat className="h-4 w-4 inline mr-1" />
                  Frecuencia *
                </label>
                <select
                  name="recurrencia"
                  value={formData.recurrencia}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {Object.entries(TIPOS_RECURRENCIA_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case TIPOS_GESTION.TOMA_HORA_CESFAM:
        return (
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              <Building2 className="h-4 w-4 mr-2 text-blue-600" />
              Información del Centro de Salud
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Centro de Salud (CESFAM/Hospital) *
              </label>
              <input
                type="text"
                name="centroSalud"
                value={formData.centroSalud}
                onChange={handleChange}
                placeholder="Ej: CESFAM Dr. Juan Sebastián Bach"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {errors.centroSalud && (
                <p className="text-red-500 text-sm mt-1">{errors.centroSalud}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialidad o tipo de atención
              </label>
              <input
                type="text"
                name="especialidad"
                value={formData.especialidad}
                onChange={handleChange}
                placeholder="Ej: Medicina general, Cardiología, Exámenes"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case TIPOS_GESTION.GESTION_MUNICIPAL:
        return (
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              <ClipboardList className="h-4 w-4 mr-2 text-purple-600" />
              Información de la Gestión Municipal
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de gestión municipal *
              </label>
              <input
                type="text"
                name="tipoGestionMunicipal"
                value={formData.tipoGestionMunicipal}
                onChange={handleChange}
                placeholder="Ej: Solicitud de certificado, Permiso de circulación, Subsidios"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {errors.tipoGestionMunicipal && (
                <p className="text-red-500 text-sm mt-1">{errors.tipoGestionMunicipal}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departamento o área municipal
              </label>
              <input
                type="text"
                name="departamento"
                value={formData.departamento}
                onChange={handleChange}
                placeholder="Ej: Oficina de partes, DIDECO, Dirección de tránsito"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case TIPOS_GESTION.SEGUIMIENTO_TRAS_EMERGENCIAS:
        return (
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
              Información del Seguimiento Tras Emergencias
            </h4>
            
            {/* Tipo de Emergencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de emergencia *
              </label>
              <select
                name="tipoEmergencia"
                value={formData.tipoEmergencia}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccione el tipo de emergencia</option>
                <option value="medica">Emergencia Médica</option>
                <option value="caida">Caída</option>
                <option value="incendio">Incendio</option>
                <option value="robo">Robo/Asalto</option>
                <option value="accidente">Accidente</option>
                <option value="otra">Otra</option>
              </select>
              {errors.tipoEmergencia && (
                <p className="text-red-500 text-sm mt-1">{errors.tipoEmergencia}</p>
              )}
            </div>

            {/* Se contactó con */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Se contactó con: *
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="contactoCarabineros"
                    name="contactoCarabineros"
                    checked={formData.contactoCarabineros}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="contactoCarabineros" className="ml-2 flex items-center text-sm text-gray-700">
                    <Shield className="h-4 w-4 mr-1 text-blue-600" />
                    Carabineros
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="contactoBomberos"
                    name="contactoBomberos"
                    checked={formData.contactoBomberos}
                    onChange={handleChange}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="contactoBomberos" className="ml-2 flex items-center text-sm text-gray-700">
                    <Truck className="h-4 w-4 mr-1 text-red-600" />
                    Bomberos
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="contactoAmbulancia"
                    name="contactoAmbulancia"
                    checked={formData.contactoAmbulancia}
                    onChange={handleChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="contactoAmbulancia" className="ml-2 flex items-center text-sm text-gray-700">
                    <Heart className="h-4 w-4 mr-1 text-green-600" />
                    Ambulancia/SAMU
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="contactoOtros"
                    name="contactoOtros"
                    checked={formData.contactoOtros}
                    onChange={handleChange}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="contactoOtros" className="ml-2 flex items-center text-sm text-gray-700">
                    <Phone className="h-4 w-4 mr-1 text-purple-600" />
                    Otros
                  </label>
                </div>
              </div>
              {errors.contactos && (
                <p className="text-red-500 text-sm mt-1">{errors.contactos}</p>
              )}
            </div>

            {/* Detalle de otros contactos */}
            {formData.contactoOtros && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especifique otros servicios contactados *
                </label>
                <input
                  type="text"
                  name="detalleOtros"
                  value={formData.detalleOtros}
                  onChange={handleChange}
                  placeholder="Ej: Familiares, Vecinos, Empresa de seguridad"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.detalleOtros && (
                  <p className="text-red-500 text-sm mt-1">{errors.detalleOtros}</p>
                )}
              </div>
            )}

            {/* Tipificación del seguimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipificación del seguimiento *
              </label>
              <select
                name="tipificacionSeguimiento"
                value={formData.tipificacionSeguimiento}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccione la tipificación</option>
                <option value="seguimiento_inmediato">Seguimiento Inmediato (24hrs)</option>
                <option value="seguimiento_corto">Seguimiento Corto Plazo (72hrs)</option>
                <option value="seguimiento_semanal">Seguimiento Semanal</option>
                <option value="seguimiento_quincenal">Seguimiento Quincenal</option>
                <option value="seguimiento_mensual">Seguimiento Mensual</option>
                <option value="no_requiere">No Requiere Seguimiento</option>
              </select>
              {errors.tipificacionSeguimiento && (
                <p className="text-red-500 text-sm mt-1">{errors.tipificacionSeguimiento}</p>
              )}
            </div>

            {/* Observaciones específicas de la emergencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones adicionales de la emergencia
              </label>
              <textarea
                name="observacionesEmergencia"
                value={formData.observacionesEmergencia}
                onChange={handleChange}
                placeholder="Detalles adicionales sobre la emergencia y el seguimiento realizado..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Nueva Gestión
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Título */}
              <div>
                <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-2">
                  <Type className="inline h-4 w-4 mr-1" />
                  Título *
                </label>
                <input
                  type="text"
                  id="titulo"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  placeholder="Ej: Revisar sistema de reportes"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.titulo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  maxLength={100}
                />
                {errors.titulo && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.titulo}
                  </p>
                )}
                <div className="mt-1 text-xs text-gray-500 text-right">
                  {formData.titulo.length}/100 caracteres
                </div>
              </div>

              {/* Tipo de gestión */}
              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="inline h-4 w-4 mr-1" />
                  Tipo de Gestión *
                </label>
                <select
                  id="tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {Object.entries(TIPOS_GESTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Descripción *
                </label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  placeholder="Describe detalladamente la gestión a realizar..."
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    errors.descripcion ? 'border-red-500' : 'border-gray-300'
                  }`}
                  maxLength={500}
                />
                {errors.descripcion && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.descripcion}
                  </p>
                )}
                <div className="mt-1 text-xs text-gray-500 text-right">
                  {formData.descripcion.length}/500 caracteres
                </div>
              </div>

              {/* Fecha de vencimiento */}
              <div>
                <label htmlFor="fechaVencimiento" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Fecha de Vencimiento (Opcional)
                </label>
                <input
                  type="date"
                  id="fechaVencimiento"
                  name="fechaVencimiento"
                  value={formData.fechaVencimiento}
                  onChange={handleChange}
                  min={getMinDate()}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.fechaVencimiento ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.fechaVencimiento && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.fechaVencimiento}
                  </p>
                )}
              </div>

              {/* Prioridad y Categoría */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Prioridad */}
                <div>
                  <label htmlFor="prioridad" className="block text-sm font-medium text-gray-700 mb-2">
                    <Flag className="inline h-4 w-4 mr-1" />
                    Prioridad
                  </label>
                  <select
                    id="prioridad"
                    name="prioridad"
                    value={formData.prioridad}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {prioridades.map(prioridad => (
                      <option key={prioridad.value} value={prioridad.value}>
                        {prioridad.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Categoría */}
                <div>
                  <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="inline h-4 w-4 mr-1" />
                    Categoría
                  </label>
                  <select
                    id="categoria"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categorias.map(categoria => (
                      <option key={categoria.value} value={categoria.value}>
                        {categoria.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campos específicos por tipo de gestión */}
              {renderCamposEspecificos()}

              {/* Error de envío */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {errors.submit}
                  </p>
                </div>
              )}

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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Crear Gestión
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

export default AddGestionForm;