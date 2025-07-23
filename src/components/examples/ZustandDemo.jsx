import React from 'react';
import { useUserStore } from '../../stores';
import CallInitiator from './CallInitiator';
import CallMonitor from './CallMonitor';

const ZustandDemo = () => {
  const { user, setUser, logout, getUserDisplayName } = useUserStore();

  const handleLogin = () => {
    // Simular login
    const mockUser = {
      uid: 'demo-user-123',
      email: 'demo@mistatas.com',
      displayName: 'Usuario Demo',
      role: 'operator',
      loginTime: new Date().toISOString()
    };
    setUser(mockUser);
  };

  return (
    <div className="space-y-6">
      {/* Header de demostración */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">🚀 Demostración de Zustand</h2>
        <p className="text-blue-100">
          Esta es una demostración de cómo Zustand maneja el estado global de forma reactiva.
        </p>
        
        {/* Estado del usuario */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            {user ? (
              <div>
                <p className="text-sm opacity-90">Conectado como:</p>
                <p className="font-semibold">{getUserDisplayName()}</p>
                <p className="text-xs opacity-75">{user.email}</p>
              </div>
            ) : (
              <p className="text-sm opacity-90">No hay usuario conectado</p>
            )}
          </div>
          <div>
            {user ? (
              <button
                onClick={logout}
                className="px-4 py-2 bg-white bg-opacity-20 rounded-md hover:bg-opacity-30 transition-colors"
              >
                Cerrar Sesión
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-white bg-opacity-20 rounded-md hover:bg-opacity-30 transition-colors"
              >
                Simular Login
              </button>
            )}
          </div>
        </div>
      </div>

      {user ? (
        <>
          {/* Explicación */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">
              💡 Cómo funciona esta demostración:
            </h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>• <strong>Componente A (Azul):</strong> Inicia una llamada y la guarda en el store</li>
              <li>• <strong>Componente B (Verde):</strong> Automáticamente detecta y muestra la llamada</li>
              <li>• <strong>Estado reactivo:</strong> Los cambios se propagan instantáneamente</li>
              <li>• <strong>Persistencia:</strong> Los datos se mantienen al recargar la página</li>
            </ul>
          </div>

          {/* Componentes de demostración */}
          <div className="grid md:grid-cols-2 gap-6">
            <CallInitiator />
            <CallMonitor />
          </div>

          {/* Información técnica */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-3">
              🔧 Características técnicas implementadas:
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">UserStore:</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>✅ Autenticación persistente</li>
                  <li>✅ Manejo de roles</li>
                  <li>✅ Getters computados</li>
                  <li>✅ Limpieza de estado en logout</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">CallStore:</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>✅ Estado reactivo de llamadas</li>
                  <li>✅ Historial automático</li>
                  <li>✅ Métricas en tiempo real</li>
                  <li>✅ Gestión de duración</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Inicia sesión para ver la demostración
          </h3>
          <p className="text-gray-500">
            Haz clic en "Simular Login" para probar las funcionalidades de Zustand
          </p>
        </div>
      )}
    </div>
  );
};

export default ZustandDemo;
