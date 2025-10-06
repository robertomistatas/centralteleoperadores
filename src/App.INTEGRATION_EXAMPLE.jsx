/**
 * App.jsx - EJEMPLO DE INTEGRACIÓN
 * 
 * Este archivo muestra cómo integrar los nuevos servicios, stores y Toast
 * en el componente App.jsx principal.
 * 
 * INSTRUCCIONES:
 * 1. Revisa los cambios propuestos
 * 2. Aplica manualmente al App.jsx real
 * 3. Elimina este archivo una vez integrado
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { ToastContainer } from './components/ui/Toast';
import { useUIStore, useAuthStore, useBeneficiaryStore, useSeguimientosStore } from './stores';
import logger from './utils/logger';

// Componentes existentes
import TeleoperadoraDashboard from './components/seguimientos/TeleoperadoraDashboard';
import SuperAdminDashboard from './components/admin/SuperAdminDashboard';
import BeneficiariosBase from './components/BeneficiariosBase';
import GestionesModule from './components/gestiones/GestionesModule';
import ErrorBoundary from './components/ErrorBoundary';

const TeleasistenciaApp = () => {
  // ===== AUTH CONTEXT (mantener para compatibilidad) =====
  const { user, logout: authLogout } = useAuth();
  
  // ===== STORES REFACTORIZADOS =====
  const toasts = useUIStore(state => state.toasts);
  const dismissToast = useUIStore(state => state.dismissToast);
  const showSuccess = useUIStore(state => state.showSuccess);
  const showError = useUIStore(state => state.showError);
  const showInfo = useUIStore(state => state.showInfo);
  
  const authStore = useAuthStore();
  
  // ===== ESTADO LOCAL =====
  const [activeTab, setActiveTab] = useState('seguimientos');
  
  // ===== INICIALIZACIÓN =====
  useEffect(() => {
    // Inicializar listener de autenticación
    authStore.initialize();
    
    logger.info('App inicializada');
    
    // Cleanup al desmontar
    return () => {
      authStore.reset();
    };
  }, []);
  
  // ===== HANDLERS REFACTORIZADOS =====
  
  /**
   * Maneja el logout usando stores en lugar de window.location.reload()
   */
  const handleLogout = async () => {
    try {
      logger.auth('Iniciando logout...');
      
      // Logout usando authStore
      const result = await authStore.logout();
      
      if (result.success) {
        // Reset de todos los stores
        useBeneficiaryStore.getState().reset();
        useSeguimientosStore.getState().reset();
        useUIStore.getState().reset();
        
        // También usar el logout del contexto para compatibilidad
        await authLogout();
        
        showSuccess('Sesión cerrada correctamente');
        logger.auth('Logout exitoso');
      } else {
        showError('Error al cerrar sesión: ' + result.error);
      }
    } catch (error) {
      logger.error('Error en logout:', error);
      showError('Error al cerrar sesión: ' + error.message);
    }
  };
  
  /**
   * Maneja cambio de tab con logging
   */
  const handleTabChange = (newTab) => {
    logger.navigation('Cambiando a tab:', newTab);
    setActiveTab(newTab);
  };
  
  /**
   * Maneja carga de datos con feedback via Toast
   */
  const handleDataLoad = async () => {
    try {
      showInfo('Cargando datos...');
      
      // Cargar beneficiarios
      await useBeneficiaryStore.getState().loadBeneficiaries(user.uid);
      
      showSuccess('Datos cargados correctamente');
    } catch (error) {
      logger.error('Error cargando datos:', error);
      showError('Error al cargar datos: ' + error.message);
    }
  };
  
  // ===== RENDERIZADO =====
  
  if (!user) {
    return <div>Cargando autenticación...</div>;
  }
  
  return (
    <ErrorBoundary>
      {/* NUEVO: Toast Container */}
      <ToastContainer 
        toasts={toasts} 
        onDismiss={dismissToast} 
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header con logout refactorizado */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Central de Teleoperadores
              </h1>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {user.email}
                </span>
                
                {/* REFACTORIZADO: usa handleLogout en lugar de authLogout directo */}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Tabs de navegación */}
        <nav className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button
                onClick={() => handleTabChange('seguimientos')}
                className={`px-3 py-4 text-sm font-medium ${
                  activeTab === 'seguimientos'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Seguimientos
              </button>
              
              <button
                onClick={() => handleTabChange('beneficiarios')}
                className={`px-3 py-4 text-sm font-medium ${
                  activeTab === 'beneficiarios'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Beneficiarios
              </button>
              
              <button
                onClick={() => handleTabChange('gestiones')}
                className={`px-3 py-4 text-sm font-medium ${
                  activeTab === 'gestiones'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Gestiones
              </button>
              
              {user.role === 'super_admin' && (
                <button
                  onClick={() => handleTabChange('admin')}
                  className={`px-3 py-4 text-sm font-medium ${
                    activeTab === 'admin'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Administración
                </button>
              )}
            </div>
          </div>
        </nav>
        
        {/* Contenido principal */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'seguimientos' && (
            <TeleoperadoraDashboard 
              userId={user.uid}
              operatorName={user.displayName || user.email}
            />
          )}
          
          {activeTab === 'beneficiarios' && (
            <BeneficiariosBase 
              userId={user.uid}
            />
          )}
          
          {activeTab === 'gestiones' && (
            <GestionesModule 
              userId={user.uid}
            />
          )}
          
          {activeTab === 'admin' && user.role === 'super_admin' && (
            <SuperAdminDashboard />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default TeleasistenciaApp;

/**
 * NOTAS DE MIGRACIÓN:
 * 
 * 1. Se agregó ToastContainer al inicio del componente
 * 2. handleLogout ahora usa authStore.logout() y resetea stores
 * 3. Se eliminó window.location.reload() del logout
 * 4. Se usa logger en lugar de console.log
 * 5. showSuccess/showError reemplazan alert()
 * 6. handleTabChange incluye logging
 * 
 * PRÓXIMOS PASOS:
 * - Revisar TeleoperadoraDashboard para usar operatorId en lugar de userId
 * - Actualizar BeneficiariosBase para usar toasts
 * - Migrar alert() restantes en componentes hijos
 */
