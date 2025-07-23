import React, { useEffect, useState } from 'react';
import { Phone, Clock, CheckCircle, XCircle, Pause } from 'lucide-react';
import { useCallStore, CALL_STATUSES } from '../../stores';

const CallMonitor = () => {
  const { 
    currentCall, 
    isCallActive, 
    updateCallStatus, 
    endCall, 
    getCurrentCallDuration,
    getFormattedDuration,
    callMetrics,
    getSuccessRate
  } = useCallStore();
  
  const [duration, setDuration] = useState(0);

  // Actualizar duración cada segundo
  useEffect(() => {
    if (isCallActive) {
      const interval = setInterval(() => {
        setDuration(getCurrentCallDuration());
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setDuration(0);
    }
  }, [isCallActive, getCurrentCallDuration]);

  const handleStatusChange = (status) => {
    updateCallStatus(status);
  };

  const handleEndCall = (status = CALL_STATUSES.COMPLETED) => {
    updateCallStatus(status);
    endCall();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case CALL_STATUSES.IN_PROGRESS: return 'text-blue-600 bg-blue-100';
      case CALL_STATUSES.COMPLETED: return 'text-green-600 bg-green-100';
      case CALL_STATUSES.FAILED: return 'text-red-600 bg-red-100';
      case CALL_STATUSES.ON_HOLD: return 'text-yellow-600 bg-yellow-100';
      case CALL_STATUSES.CANCELLED: return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case CALL_STATUSES.IN_PROGRESS: return <Phone className="w-4 h-4" />;
      case CALL_STATUSES.COMPLETED: return <CheckCircle className="w-4 h-4" />;
      case CALL_STATUSES.FAILED: return <XCircle className="w-4 h-4" />;
      case CALL_STATUSES.ON_HOLD: return <Pause className="w-4 h-4" />;
      case CALL_STATUSES.CANCELLED: return <XCircle className="w-4 h-4" />;
      default: return <Phone className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
      <div className="flex items-center mb-4">
        <Clock className="w-6 h-6 text-green-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">
          Componente B - Monitor de Llamadas
        </h3>
      </div>

      {/* Estado actual de la llamada */}
      {isCallActive && currentCall ? (
        <div className="space-y-4">
          {/* Información de la llamada activa */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-blue-900">
                  {currentCall.beneficiary}
                </h4>
                <p className="text-blue-700 text-sm">{currentCall.phone}</p>
                {currentCall.purpose && (
                  <p className="text-blue-600 text-xs mt-1">
                    Propósito: {currentCall.purpose}
                  </p>
                )}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${getStatusColor(currentCall.status)}`}>
                {getStatusIcon(currentCall.status)}
                <span className="ml-1 capitalize">{currentCall.status}</span>
              </div>
            </div>

            {/* Duración */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-blue-600 mr-1" />
                <span className="text-blue-800 font-mono text-lg">
                  {getFormattedDuration(duration)}
                </span>
              </div>
              <div className="text-xs text-blue-600">
                Iniciada: {new Date(currentCall.startTime).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Controles de la llamada */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusChange(CALL_STATUSES.ON_HOLD)}
              disabled={currentCall.status === CALL_STATUSES.ON_HOLD}
              className="flex items-center px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Pause className="w-4 h-4 mr-1" />
              En Espera
            </button>
            
            <button
              onClick={() => handleStatusChange(CALL_STATUSES.IN_PROGRESS)}
              disabled={currentCall.status === CALL_STATUSES.IN_PROGRESS}
              className="flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Phone className="w-4 h-4 mr-1" />
              Reanudar
            </button>
            
            <button
              onClick={() => handleEndCall(CALL_STATUSES.COMPLETED)}
              className="flex items-center px-3 py-2 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Completar
            </button>
            
            <button
              onClick={() => handleEndCall(CALL_STATUSES.FAILED)}
              className="flex items-center px-3 py-2 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Falló
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">No hay llamadas activas</p>
          <p className="text-gray-400 text-sm">
            Los datos de la llamada aparecerán aquí cuando se inicie una
          </p>
        </div>
      )}

      {/* Métricas rápidas */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Métricas del día</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-blue-600">{callMetrics.totalCalls}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-600">{callMetrics.successfulCalls}</div>
            <div className="text-xs text-gray-500">Exitosas</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-600">{getSuccessRate()}%</div>
            <div className="text-xs text-gray-500">Éxito</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallMonitor;
