/**
 * Punto de entrada principal que decide qué aplicación mostrar
 */

import React, { useState } from 'react';
import { BarChart3, Home, Settings } from 'lucide-react';
import TeleasistenciaApp from './App';
import MetricsApp from './components/MetricsApp';
import { Badge } from './components/ui/badge';

function MainApp() {
  const [currentApp, setCurrentApp] = useState('teleasistencia'); // 'teleasistencia' | 'metrics'

  const apps = [
    {
      id: 'teleasistencia',
      name: 'Central Teleoperadores',
      description: 'Sistema principal de gestión',
      icon: Home,
      component: TeleasistenciaApp
    },
    {
      id: 'metrics',
      name: 'Sistema de Métricas',
      description: 'Dashboard de análisis automatizado',
      icon: BarChart3,
      component: MetricsApp,
      badge: 'Beta'
    }
  ];

  const currentAppConfig = apps.find(app => app.id === currentApp);
  const CurrentComponent = currentAppConfig?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header de navegación entre aplicaciones */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-bold text-gray-900">Central Teleoperadores</h1>
            
            {/* Navegación entre apps */}
            <div className="flex space-x-1">
              {apps.map((app) => {
                const Icon = app.icon;
                const isActive = currentApp === app.id;
                
                return (
                  <button
                    key={app.id}
                    onClick={() => setCurrentApp(app.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{app.name}</span>
                    {app.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {app.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            {currentAppConfig?.description}
          </div>
        </div>
      </div>

      {/* Contenido de la aplicación actual */}
      <div className="w-full">
        {CurrentComponent && <CurrentComponent />}
      </div>
    </div>
  );
}

export default MainApp;