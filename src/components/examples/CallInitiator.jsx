import React, { useState } from 'react';
import { Phone, User, Clock } from 'lucide-react';
import { useCallStore, CALL_STATUSES } from '../../stores';
import { useUIStore } from '../../stores/useUIStore';

const CallInitiator = () => {
  const { setCall, isCallActive, currentCall } = useCallStore();
  const { showWarning } = useUIStore();
  const [formData, setFormData] = useState({
    beneficiary: '',
    phone: '',
    purpose: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStartCall = () => {
    if (!formData.beneficiary || !formData.phone) {
      showWarning('Por favor completa todos los campos requeridos');
      return;
    }

    const callData = {
      id: `call-${Date.now()}`,
      beneficiary: formData.beneficiary,
      phone: formData.phone,
      purpose: formData.purpose,
      status: CALL_STATUSES.IN_PROGRESS,
      startTime: new Date().toISOString(),
      operator: 'Usuario Actual' // En una app real vendría del userStore
    };

    setCall(callData);
    
    // Limpiar formulario
    setFormData({
      beneficiary: '',
      phone: '',
      purpose: ''
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex items-center mb-4">
        <Phone className="w-6 h-6 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">
          Componente A - Iniciar Llamada
        </h3>
      </div>

      {isCallActive ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-green-800 font-medium">
              Llamada en curso con {currentCall?.beneficiary}
            </span>
          </div>
          <p className="text-green-600 text-sm mt-1">
            Teléfono: {currentCall?.phone}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beneficiario *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                name="beneficiary"
                value={formData.beneficiary}
                onChange={handleInputChange}
                placeholder="Nombre del beneficiario"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Número de teléfono"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Propósito de la llamada
            </label>
            <select
              name="purpose"
              value={formData.purpose}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar propósito</option>
              <option value="seguimiento">Seguimiento</option>
              <option value="consulta">Consulta</option>
              <option value="soporte">Soporte técnico</option>
              <option value="emergencia">Emergencia</option>
            </select>
          </div>

          <button
            onClick={handleStartCall}
            disabled={!formData.beneficiary || !formData.phone}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <Phone className="w-4 h-4 mr-2" />
            Iniciar Llamada
          </button>
        </div>
      )}
    </div>
  );
};

export default CallInitiator;
