/**
 * Componente principal del sistema de métricas
 * Maneja navegación y carga de datos con fallback automático
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Users,
  Settings,
  UserCheck
} from 'lucide-react';

import GlobalDashboard from './dashboards/GlobalDashboard';
import TeleoperadoraDashboard from './dashboards/TeleoperadoraDashboard';
import BeneficiaryDashboard from './dashboards/BeneficiaryDashboard';
import MetricsTestPanel from './MetricsTestPanel';
import useFallbackMetrics from '../hooks/useFallbackMetrics';

function MetricsApp() {
  const [currentView, setCurrentView] = useState('global');
  
  // Usar el nuevo hook de fallback que maneja el estado de carga
  const { 
    loading, 
    isUsingFallback, 
    hasRealData,
    getSummaryStats,
    getTopOperators
  } = useFallbackMetrics();

  // Mostrar pantalla de carga inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-xl p-8 text-center max-w-md"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Inicializando Sistema de Métricas
          </h3>
          <p className="text-gray-600">
            Cargando dashboards y verificando conexión...
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Esto solo tomará unos segundos
          </div>
        </motion.div>
      </div>
    );
  }

  const summaryStats = getSummaryStats();
  const topOperators = getTopOperators(10);

  // Configuración de navegación actualizada
  const navigationItems = [
    {
      id: 'global',
      label: 'Dashboard Global',
      description: 'Métricas generales del sistema',
      icon: BarChart3,
      component: GlobalDashboard
    },
    {
      id: 'teleoperadoras',
      label: 'Teleoperadoras',
      description: 'Análisis por teleoperadora',
      icon: Users,
      component: TeleoperadoraDashboard,
      badge: isUsingFallback ? '4' : (topOperators?.length || '0')
    },
    {
      id: 'beneficiarios',
      label: 'Beneficiarios',
      description: 'Gestión de beneficiarios',
      icon: UserCheck,
      component: BeneficiaryDashboard,
      badge: isUsingFallback ? '85' : (summaryStats?.uniqueBeneficiaries || '0')
    }
  ];

  const CurrentComponent = navigationItems.find(item => item.id === currentView)?.component || GlobalDashboard;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sistema de Métricas</h1>
                <p className="text-sm text-gray-600">Dashboard avanzado para análisis de llamadas</p>
              </div>
            </div>
            
            {/* Estado del sistema */}
            <div className="flex items-center space-x-3">
              {isUsingFallback ? (
                <div className="flex items-center space-x-2 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span>Modo Demo</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Datos en Tiempo Real</span>
                </div>
              )}
              
              <button
                onClick={() => setCurrentView('config')}
                className={`p-2 rounded-lg transition-colors ${
                  currentView === 'config' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className={`text-sm ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        isActive 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}

            {/* Panel de Configuración */}
            <motion.button
              onClick={() => setCurrentView('config')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                currentView === 'config'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Settings className={`h-5 w-5 ${currentView === 'config' ? 'text-white' : 'text-gray-500'}`} />
                <div>
                  <div className="font-medium">Configuración</div>
                  <div className={`text-sm ${currentView === 'config' ? 'text-indigo-100' : 'text-gray-500'}`}>
                    Herramientas del sistema
                  </div>
                </div>
              </div>
            </motion.button>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentView === 'config' ? (
                  <MetricsTestPanel />
                ) : (
                  <CurrentComponent />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MetricsApp;