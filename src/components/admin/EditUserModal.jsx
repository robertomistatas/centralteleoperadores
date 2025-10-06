import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, User, Shield, Save, AlertCircle, Mail, Phone } from 'lucide-react';

const EditUserModal = ({ isOpen, user, roles, onSave, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'teleoperadora',
    isActive: user?.isActive !== false
  });

  const [errors, setErrors] = useState({});
  const modalRef = useRef(null);

  // Actualizar formData cuando cambie el usuario
  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'teleoperadora',
        isActive: user.isActive !== false
      });
    }
  }, [user]);

  // Si no está abierto o no hay usuario, no renderizar el modal
  if (!isOpen || !user) {
    return null;
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'El nombre es requerido';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (formData.phone && !/^\+?[\d\s()-]{8,}$/.test(formData.phone)) {
      newErrors.phone = 'Teléfono inválido (min. 8 dígitos)';
    }
    
    if (!formData.role) {
      newErrors.role = 'Selecciona un rol';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      await onSave(formData);
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Editar Usuario
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="correo@ejemplo.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Cambiar el email actualizará Firebase Authentication
            </p>
          </div>

          {/* Nombre */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Nombre Completo *
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                errors.displayName ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Juan Pérez"
            />
            {errors.displayName && (
              <p className="text-red-500 text-sm mt-1">{errors.displayName}</p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                errors.phone ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="+56912345678"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Formato: +56912345678 (opcional)</p>
          </div>

          {/* Rol */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Rol *
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              disabled={user?.role === 'super_admin'}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                errors.role ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:text-gray-500`}
            >
              {roles.filter(role => role.id !== 'super_admin' || user?.role === 'super_admin').map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="text-red-500 text-sm mt-1">{errors.role}</p>
            )}
            {user?.role === 'super_admin' && (
              <p className="text-xs text-gray-500 mt-1">El rol de Super Admin no se puede cambiar</p>
            )}
          </div>

          {/* Estado activo */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                disabled={user?.role === 'super_admin'}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Usuario activo</span>
            </label>
            {user?.role === 'super_admin' && (
              <p className="text-xs text-gray-500 mt-1 ml-6">Los Super Admins siempre están activos</p>
            )}
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <motion.button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-2 rounded-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default EditUserModal;
