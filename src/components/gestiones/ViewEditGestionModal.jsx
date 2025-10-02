import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XCircle, 
  Edit3, 
  Save, 
  Calendar,
  Clock,
  User,
  FileText,
  AlertCircle,
  Pill,
  Building2,
  ClipboardList,
  Repeat,
  CheckCircle,
  Trash2,
  Shield,
  Truck,
  Heart,
  Phone
} from 'lucide-react';
import { useGestionesStore } from '../../stores/useGestionesStore';
import { useAuth } from '../../AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Constantes para tipos de gestión
export const TIPOS_GESTION = {
  RECORDATORIO_MEDICAMENTOS: 'recordatorio_medicamentos',
  TOMA_HORA_CESFAM: 'toma_hora_cesfam',
  GESTION_MUNICIPAL: 'gestion_municipal',
  SEGUIMIENTO_TRAS_EMERGENCIAS: 'seguimiento_tras_emergencias'
};

export const TIPOS_GESTION_LABELS = {
  [TIPOS_GESTION.RECORDATORIO_MEDICAMENTOS]: 'Recordatorio de Medicamentos',
  [TIPOS_GESTION.TOMA_HORA_CESFAM]: 'Toma de hora en Cesfam/Hospital',
  [TIPOS_GESTION.GESTION_MUNICIPAL]: 'Gestión Municipal',
  [TIPOS_GESTION.SEGUIMIENTO_TRAS_EMERGENCIAS]: 'Seguimiento Tras Emergencias'
};

// Constantes para recurrencia
export const TIPOS_RECURRENCIA = {
  UNICO: 'unico',
  DIARIO: 'diario',
  SEMANAL: 'semanal',
  MENSUAL: 'mensual',
  PERMANENTE: 'permanente'
};

export const TIPOS_RECURRENCIA_LABELS = {
  [TIPOS_RECURRENCIA.UNICO]: 'Evento único',
  [TIPOS_RECURRENCIA.DIARIO]: 'Todos los días',
  [TIPOS_RECURRENCIA.SEMANAL]: 'Todas las semanas',
  [TIPOS_RECURRENCIA.MENSUAL]: 'Todos los meses',
  [TIPOS_RECURRENCIA.PERMANENTE]: 'Permanente'
};

const ViewEditGestionModal = ({ gestion, isOpen, onClose }) => {
  const { updateGestion, deleteGestion } = useGestionesStore();
  const { user } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Inicializar datos del formulario cuando se abre el modal
  useEffect(() => {
    if (gestion && isOpen) {
      setFormData({
        titulo: gestion.titulo || '',
        descripcion: gestion.descripcion || '',
        tipo: gestion.tipo || TIPOS_GESTION.GESTION_MUNICIPAL,
        fechaVencimiento: gestion.fechaVencimiento ? 
          format(gestion.fechaVencimiento, "yyyy-MM-dd'T'HH:mm") : '',
        prioridad: gestion.prioridad || 'media',
        categoria: gestion.categoria || 'general',
        
        // Campos específicos por tipo
        medicamentos: gestion.medicamentos || '',
        horaMedicamento: gestion.horaMedicamento || '',
        recurrencia: gestion.recurrencia || TIPOS_RECURRENCIA.UNICO,
        
        centroSalud: gestion.centroSalud || '',
        especialidad: gestion.especialidad || '',
        
        tipoGestionMunicipal: gestion.tipoGestionMunicipal || '',
        departamento: gestion.departamento || '',
        
        // Campos específicos para seguimiento tras emergencias
        contactoCarabineros: gestion.contactoCarabineros || false,
        contactoBomberos: gestion.contactoBomberos || false,
        contactoAmbulancia: gestion.contactoAmbulancia || false,
        contactoOtros: gestion.contactoOtros || false,
        detalleOtros: gestion.detalleOtros || '',
        tipoEmergencia: gestion.tipoEmergencia || '',
        tipificacionSeguimiento: gestion.tipificacionSeguimiento || '',
        observacionesEmergencia: gestion.observacionesEmergencia || ''
      });
      setIsEditing(false);
      setError('');
    }
  }, [gestion, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError('');

      const updatedData = {
        ...formData,
        fechaVencimiento: formData.fechaVencimiento ? 
          new Date(formData.fechaVencimiento) : null,
        
        // Metadatos de edición
        ultimaModificacion: new Date(),
        modificadoPor: user.uid,
        modificadoPorNombre: user.displayName || user.email,
        
        // Historial de modificaciones
        historialModificaciones: [
          ...(gestion.historialModificaciones || []),
          {
            fecha: new Date(),
            usuario: user.uid,
            usuarioNombre: user.displayName || user.email,
            cambios: obtenerCambios(gestion, formData)
          }
        ]
      };

      await updateGestion(gestion.id, updatedData);
      setIsEditing(false);
      
    } catch (err) {
      console.error('Error actualizando gestión:', err);
      setError('Error al guardar los cambios');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar si el usuario puede eliminar la gestión
  const canDelete = () => {
    return gestion?.creadorId === user?.uid || user?.role === 'admin' || user?.role === 'super_admin';
  };

  // Manejar eliminación de gestión
  const handleDelete = async () => {
    try {
      setIsLoading(true);
      setError('');

      await deleteGestion(gestion.id);
      console.log('✅ Gestión eliminada exitosamente');
      
      // Cerrar modales y limpiar estado
      setShowDeleteConfirm(false);
      onClose();
      
    } catch (err) {
      console.error('❌ Error eliminando gestión:', err);
      setError('Error al eliminar la gestión');
      setShowDeleteConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  const obtenerCambios = (original, nuevo) => {
    const cambios = [];
    
    Object.keys(nuevo).forEach(key => {
      if (original[key] !== nuevo[key]) {
        cambios.push({
          campo: key,
          valorAnterior: original[key],
          valorNuevo: nuevo[key]
        });
      }
    });
    
    return cambios;
  };

  const renderCamposEspecificos = () => {
    switch (formData.tipo) {
      case TIPOS_GESTION.RECORDATORIO_MEDICAMENTOS:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Pill className="h-4 w-4 inline mr-1" />
                Medicamentos a recordar *
              </label>
              {isEditing ? (
                <textarea
                  value={formData.medicamentos}
                  onChange={(e) => handleInputChange('medicamentos', e.target.value)}
                  placeholder="Ej: Losartán 50mg - 1 comprimido, Metformina 850mg - 2 comprimidos"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              ) : (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{formData.medicamentos}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Hora del recordatorio *
              </label>
              {isEditing ? (
                <input
                  type="time"
                  value={formData.horaMedicamento}
                  onChange={(e) => handleInputChange('horaMedicamento', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              ) : (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{formData.horaMedicamento}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Repeat className="h-4 w-4 inline mr-1" />
                Frecuencia del recordatorio *
              </label>
              {isEditing ? (
                <select
                  value={formData.recurrencia}
                  onChange={(e) => handleInputChange('recurrencia', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {Object.entries(TIPOS_RECURRENCIA_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {TIPOS_RECURRENCIA_LABELS[formData.recurrencia]}
                </p>
              )}
            </div>
          </div>
        );

      case TIPOS_GESTION.TOMA_HORA_CESFAM:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="h-4 w-4 inline mr-1" />
                Centro de Salud (CESFAM/Hospital) *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.centroSalud}
                  onChange={(e) => handleInputChange('centroSalud', e.target.value)}
                  placeholder="Ej: CESFAM Dr. Juan Sebastián Bach"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              ) : (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{formData.centroSalud}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Especialidad o tipo de atención
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.especialidad}
                  onChange={(e) => handleInputChange('especialidad', e.target.value)}
                  placeholder="Ej: Medicina general, Cardiología, Exámenes"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{formData.especialidad || 'No especificado'}</p>
              )}
            </div>
          </div>
        );

      case TIPOS_GESTION.GESTION_MUNICIPAL:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ClipboardList className="h-4 w-4 inline mr-1" />
                Tipo de gestión municipal *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.tipoGestionMunicipal}
                  onChange={(e) => handleInputChange('tipoGestionMunicipal', e.target.value)}
                  placeholder="Ej: Solicitud de certificado, Permiso de circulación, Subsidios"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              ) : (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{formData.tipoGestionMunicipal}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="h-4 w-4 inline mr-1" />
                Departamento o área municipal
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.departamento}
                  onChange={(e) => handleInputChange('departamento', e.target.value)}
                  placeholder="Ej: Oficina de partes, DIDECO, Dirección de tránsito"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{formData.departamento || 'No especificado'}</p>
              )}
            </div>
          </div>
        );

      case TIPOS_GESTION.SEGUIMIENTO_TRAS_EMERGENCIAS:
        return (
          <div className="space-y-4">
            {/* Tipo de Emergencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Tipo de emergencia *
              </label>
              {isEditing ? (
                <select
                  value={formData.tipoEmergencia}
                  onChange={(e) => handleInputChange('tipoEmergencia', e.target.value)}
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
              ) : (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {formData.tipoEmergencia === 'medica' && 'Emergencia Médica'}
                  {formData.tipoEmergencia === 'caida' && 'Caída'}
                  {formData.tipoEmergencia === 'incendio' && 'Incendio'}
                  {formData.tipoEmergencia === 'robo' && 'Robo/Asalto'}
                  {formData.tipoEmergencia === 'accidente' && 'Accidente'}
                  {formData.tipoEmergencia === 'otra' && 'Otra'}
                  {!formData.tipoEmergencia && 'No especificado'}
                </p>
              )}
            </div>

            {/* Servicios contactados */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Se contactó con:
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="contactoCarabineros"
                      checked={formData.contactoCarabineros}
                      onChange={(e) => handleInputChange('contactoCarabineros', e.target.checked)}
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
                      checked={formData.contactoBomberos}
                      onChange={(e) => handleInputChange('contactoBomberos', e.target.checked)}
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
                      checked={formData.contactoAmbulancia}
                      onChange={(e) => handleInputChange('contactoAmbulancia', e.target.checked)}
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
                      checked={formData.contactoOtros}
                      onChange={(e) => handleInputChange('contactoOtros', e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="contactoOtros" className="ml-2 flex items-center text-sm text-gray-700">
                      <Phone className="h-4 w-4 mr-1 text-purple-600" />
                      Otros
                    </label>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {formData.contactoCarabineros && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Shield className="h-3 w-3 mr-1" />
                        Carabineros
                      </span>
                    )}
                    {formData.contactoBomberos && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <Truck className="h-3 w-3 mr-1" />
                        Bomberos
                      </span>
                    )}
                    {formData.contactoAmbulancia && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Heart className="h-3 w-3 mr-1" />
                        Ambulancia/SAMU
                      </span>
                    )}
                    {formData.contactoOtros && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Phone className="h-3 w-3 mr-1" />
                        Otros
                      </span>
                    )}
                    {!formData.contactoCarabineros && !formData.contactoBomberos && 
                     !formData.contactoAmbulancia && !formData.contactoOtros && (
                      <span className="text-gray-500">No se especificaron contactos</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Detalle de otros contactos */}
            {(formData.contactoOtros && (isEditing || formData.detalleOtros)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Otros servicios contactados
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.detalleOtros}
                    onChange={(e) => handleInputChange('detalleOtros', e.target.value)}
                    placeholder="Ej: Familiares, Vecinos, Empresa de seguridad"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{formData.detalleOtros}</p>
                )}
              </div>
            )}

            {/* Tipificación del seguimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Tipificación del seguimiento *
              </label>
              {isEditing ? (
                <select
                  value={formData.tipificacionSeguimiento}
                  onChange={(e) => handleInputChange('tipificacionSeguimiento', e.target.value)}
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
              ) : (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {formData.tipificacionSeguimiento === 'seguimiento_inmediato' && 'Seguimiento Inmediato (24hrs)'}
                  {formData.tipificacionSeguimiento === 'seguimiento_corto' && 'Seguimiento Corto Plazo (72hrs)'}
                  {formData.tipificacionSeguimiento === 'seguimiento_semanal' && 'Seguimiento Semanal'}
                  {formData.tipificacionSeguimiento === 'seguimiento_quincenal' && 'Seguimiento Quincenal'}
                  {formData.tipificacionSeguimiento === 'seguimiento_mensual' && 'Seguimiento Mensual'}
                  {formData.tipificacionSeguimiento === 'no_requiere' && 'No Requiere Seguimiento'}
                  {!formData.tipificacionSeguimiento && 'No especificado'}
                </p>
              )}
            </div>

            {/* Observaciones específicas de la emergencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="h-4 w-4 inline mr-1" />
                Observaciones adicionales de la emergencia
              </label>
              {isEditing ? (
                <textarea
                  value={formData.observacionesEmergencia}
                  onChange={(e) => handleInputChange('observacionesEmergencia', e.target.value)}
                  placeholder="Detalles adicionales sobre la emergencia y el seguimiento realizado..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              ) : (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {formData.observacionesEmergencia || 'No hay observaciones adicionales'}
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!gestion || !isOpen) return null;

  // Modal de confirmación de eliminación
  const DeleteConfirmModal = () => (
    <AnimatePresence>
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-4">
              <div className="p-3 bg-red-100 rounded-full mr-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Eliminar Gestión
                </h3>
                <p className="text-sm text-gray-600">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                ¿Estás seguro de que deseas eliminar la gestión <strong>"{gestion.titulo}"</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Toda la información asociada se perderá permanentemente.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Eliminar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                gestion.tipo === TIPOS_GESTION.RECORDATORIO_MEDICAMENTOS ? 'bg-green-100 text-green-600' :
                gestion.tipo === TIPOS_GESTION.TOMA_HORA_CESFAM ? 'bg-blue-100 text-blue-600' :
                'bg-purple-100 text-purple-600'
              }`}>
                {gestion.tipo === TIPOS_GESTION.RECORDATORIO_MEDICAMENTOS ? <Pill className="h-5 w-5" /> :
                 gestion.tipo === TIPOS_GESTION.TOMA_HORA_CESFAM ? <Building2 className="h-5 w-5" /> :
                 <ClipboardList className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isEditing ? 'Editando Gestión' : 'Detalles de Gestión'}
                </h3>
                <p className="text-sm text-gray-500">
                  {TIPOS_GESTION_LABELS[gestion.tipo || TIPOS_GESTION.GESTION_MUNICIPAL]}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Editar
                  </button>
                  
                  {canDelete() && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </button>
                  )}
                </>
              )}
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => handleInputChange('titulo', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{gestion.titulo}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Fecha y hora
                </label>
                {isEditing ? (
                  <input
                    type="datetime-local"
                    value={formData.fechaVencimiento}
                    onChange={(e) => handleInputChange('fechaVencimiento', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">
                    {gestion.fechaVencimiento ? 
                      format(gestion.fechaVencimiento, "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es }) :
                      'No especificada'
                    }
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="h-4 w-4 inline mr-1" />
                Descripción
              </label>
              {isEditing ? (
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange('descripcion', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              ) : (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{gestion.descripcion}</p>
              )}
            </div>

            {/* Campos específicos por tipo */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Información específica
              </h4>
              {renderCamposEspecificos()}
            </div>

            {/* Metadatos */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Información de seguimiento
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Creado por:</span> {gestion.creadorNombre}
                </div>
                <div>
                  <span className="font-medium">Fecha de creación:</span> {' '}
                  {format(gestion.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                </div>
                {gestion.modificadoPorNombre && (
                  <>
                    <div>
                      <span className="font-medium">Última modificación:</span> {gestion.modificadoPorNombre}
                    </div>
                    <div>
                      <span className="font-medium">Fecha de modificación:</span> {' '}
                      {gestion.ultimaModificacion && 
                        format(gestion.ultimaModificacion, "dd/MM/yyyy HH:mm", { locale: es })
                      }
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          {isEditing && (
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar cambios
              </button>
            </div>
          )}
        </motion.div>

        {/* Modal de confirmación de eliminación */}
        <DeleteConfirmModal />
      </motion.div>
    </AnimatePresence>
  );
};

export default ViewEditGestionModal;