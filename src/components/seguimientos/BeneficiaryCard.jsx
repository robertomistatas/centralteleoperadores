import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Plus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Timer,
  MessageSquare
} from 'lucide-react';

/**
 * Tarjeta de beneficiario con datos básicos e historial de contactos
 * Muestra estado según reglas de 15/30 días
 */
const BeneficiaryCard = ({ 
  beneficiario, 
  seguimientos = [], 
  onSelect, 
  onNewContact 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calcular estado y días sin contacto
  const calcularEstado = () => {
    const contactosExitosos = seguimientos.filter(s => s.tipoResultado === 'exitoso');
    
    if (contactosExitosos.length === 0) {
      return { 
        estado: 'urgente', 
        ultimoContacto: null, 
        diasSinContacto: null,
        mensaje: 'Sin contactos exitosos'
      };
    }

    const ultimoContacto = contactosExitosos.sort((a, b) => 
      new Date(b.fechaContacto) - new Date(a.fechaContacto)
    )[0];

    const diasSinContacto = Math.floor(
      (new Date() - new Date(ultimoContacto.fechaContacto)) / (1000 * 60 * 60 * 24)
    );

    let estado, mensaje;
    if (diasSinContacto <= 15) {
      estado = 'al-dia';
      mensaje = `Último contacto hace ${diasSinContacto} día${diasSinContacto !== 1 ? 's' : ''}`;
    } else if (diasSinContacto <= 30) {
      estado = 'pendiente';
      mensaje = `${diasSinContacto} días sin contacto`;
    } else {
      estado = 'urgente';
      mensaje = `¡${diasSinContacto} días sin contacto!`;
    }

    return {
      estado,
      ultimoContacto: ultimoContacto.fechaContacto,
      diasSinContacto,
      mensaje
    };
  };

  const { estado, ultimoContacto, diasSinContacto, mensaje } = calcularEstado();

  // Configuración de colores por estado - ESTILO LIMPIO Y PROFESIONAL
  const estadoConfig = {
    'al-dia': {
      bg: 'bg-white',
      border: 'border-gray-200',
      text: 'text-gray-900',
      icon: CheckCircle,
      iconColor: 'text-teal-600',
      badge: 'bg-teal-50 text-teal-700 border border-teal-200',
      shadow: 'shadow-sm hover:shadow-md'
    },
    'pendiente': {
      bg: 'bg-white',
      border: 'border-gray-200',
      text: 'text-gray-900',
      icon: Clock,
      iconColor: 'text-orange-500',
      badge: 'bg-orange-50 text-orange-700 border border-orange-200',
      shadow: 'shadow-sm hover:shadow-md'
    },
    'urgente': {
      bg: 'bg-white',
      border: 'border-gray-200',
      text: 'text-gray-900',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      badge: 'bg-red-50 text-red-700 border border-red-200',
      shadow: 'shadow-sm hover:shadow-md'
    }
  };

  const config = estadoConfig[estado];
  const StatusIcon = config.icon;

  // Formatear fecha con zona horaria de Chile
  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Santiago'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Fecha inválida';
    }
  };

  // Formatear teléfono para mostrar
  const formatearTelefono = (telefono) => {
    if (!telefono) return 'Sin teléfono';
    const clean = telefono.replace(/\D/g, '');
    if (clean.length === 9) {
      return `+56 ${clean.substring(0, 1)} ${clean.substring(1, 5)} ${clean.substring(5)}`;
    }
    return telefono;
  };

  return (
    <motion.div
      className={`
        ${config.bg} 
        ${config.border} ${config.shadow}
        border rounded-xl overflow-hidden transition-all duration-200
        cursor-pointer
      `}
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      layout
    >
      {/* Header - Información básica */}
      <div className="p-4">
        {/* Badge de estado y nombre */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
              {beneficiario.beneficiary || 'Sin nombre'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusIcon className={`w-4 h-4 ${config.iconColor}`} />
              <span className={`text-xs font-medium text-gray-600`}>
                {estado === 'al-dia' ? 'Al día' : 
                 estado === 'pendiente' ? 'Pendiente' : 'Urgente'}
              </span>
            </div>
          </div>
          
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${config.badge}`}>
            {seguimientos.length} contacto{seguimientos.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Información de contacto */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Phone className="w-4 h-4" />
            <span className="truncate">{formatearTelefono(beneficiario.primaryPhone)}</span>
          </div>
          
          {beneficiario.commune && (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{beneficiario.commune}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Timer className="w-4 h-4" />
            <span className="text-xs">{mensaje}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Historial
          </button>
          
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onNewContact();
            }}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-3 h-3" />
            Contacto
          </motion.button>
        </div>
      </div>

      {/* Historial expandible */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-4 bg-white/50 dark:bg-gray-800/50">
              {seguimientos.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Sin seguimientos registrados
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {seguimientos
                    .sort((a, b) => new Date(b.fechaContacto) - new Date(a.fechaContacto))
                    .slice(0, 5) // Mostrar solo los últimos 5
                    .map((seguimiento, index) => (
                      <motion.div
                        key={seguimiento.id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-3 rounded-lg border ${
                          seguimiento.tipoResultado === 'exitoso' 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : seguimiento.tipoResultado === 'fallido'
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {seguimiento.tipoResultado === 'exitoso' && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                            {seguimiento.tipoResultado === 'fallido' && (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-xs font-medium text-gray-900 dark:text-white">
                              {seguimiento.tipoContacto || 'Contacto'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatearFecha(seguimiento.fechaContacto)}
                          </div>
                        </div>
                        
                        {seguimiento.observaciones && (
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                            {seguimiento.observaciones}
                          </p>
                        )}
                      </motion.div>
                    ))
                  }
                  
                  {seguimientos.length > 5 && (
                    <div className="text-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{seguimientos.length - 5} seguimiento{seguimientos.length - 5 !== 1 ? 's' : ''} más
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BeneficiaryCard;
