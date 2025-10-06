/**
 * Toast.jsx
 * Componente de notificaciones reutilizable para reemplazar alert()
 * 
 * Refactorización: Elimina dependencia de window.alert() y centraliza notificaciones
 * Uso: Integrado con useUIStore para gestión global de toasts
 */

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

/**
 * Tipos de toast disponibles
 */
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
};

/**
 * Configuración de estilos por tipo
 */
const TOAST_STYLES = {
  [TOAST_TYPES.SUCCESS]: {
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    icon: CheckCircle,
    iconColor: 'text-green-500',
  },
  [TOAST_TYPES.ERROR]: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    icon: AlertCircle,
    iconColor: 'text-red-500',
  },
  [TOAST_TYPES.INFO]: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    icon: Info,
    iconColor: 'text-blue-500',
  },
  [TOAST_TYPES.WARNING]: {
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
  },
};

/**
 * Componente individual de Toast
 */
const Toast = ({ id, type = TOAST_TYPES.INFO, message, duration = 5000, onDismiss }) => {
  const config = TOAST_STYLES[type] || TOAST_STYLES[TOAST_TYPES.INFO];
  const Icon = config.icon;

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  return (
    <div
      className={`
        ${config.bg} ${config.text}
        border rounded-lg shadow-lg p-4 mb-3
        flex items-start gap-3
        min-w-[300px] max-w-[500px]
        animate-slide-in-right
      `}
      role="alert"
    >
      <Icon className={`${config.iconColor} flex-shrink-0 mt-0.5`} size={20} />
      
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>

      <button
        onClick={() => onDismiss(id)}
        className={`${config.text} opacity-70 hover:opacity-100 transition-opacity flex-shrink-0`}
        aria-label="Cerrar notificación"
      >
        <X size={18} />
      </button>
    </div>
  );
};

/**
 * Contenedor de Toasts
 * Se debe renderizar una sola vez en el componente raíz (App.jsx)
 */
export const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

/**
 * Hook auxiliar para usar toasts fácilmente
 * Nota: Requiere que useUIStore esté configurado
 */
export const useToast = () => {
  // Este import se hace dinámico para evitar dependencia circular
  // El componente que use este hook debe tener acceso a useUIStore
  const showToast = (message, type = TOAST_TYPES.INFO, duration = 5000) => {
    // Esta función será implementada en el componente que la use
    // importando directamente useUIStore
    console.warn('useToast: Debe configurarse con useUIStore');
  };

  return {
    success: (message, duration) => showToast(message, TOAST_TYPES.SUCCESS, duration),
    error: (message, duration) => showToast(message, TOAST_TYPES.ERROR, duration),
    info: (message, duration) => showToast(message, TOAST_TYPES.INFO, duration),
    warning: (message, duration) => showToast(message, TOAST_TYPES.WARNING, duration),
  };
};

export default Toast;
