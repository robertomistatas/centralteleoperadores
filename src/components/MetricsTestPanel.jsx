/**
 * Componente para probar el nuevo sistema de métricas
 * Incluye botón para habilitar la vista de métricas
 */

import React, { useState } from 'react';
import { BarChart3, Settings, TestTube, CheckCircle, AlertCircle, Info, Database, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { initializeMetricsStructure, processExcelDataManually } from '../utils/metricsInitializer';
import { setupSuperAdminProfile, checkCurrentPermissions } from '../utils/setupAdmin';
import { useCallStore } from '../stores';

function MetricsTestPanel() {
  const [metricsEnabled, setMetricsEnabled] = useState(
    localStorage.getItem('showMetricsApp') === 'true'
  );
  const [isInitializing, setIsInitializing] = useState(false);
  const [initResult, setInitResult] = useState(null);
  const { callData } = useCallStore();

  const enableMetrics = () => {
    localStorage.setItem('showMetricsApp', 'true');
    setMetricsEnabled(true);
    // Recargar para mostrar la nueva interfaz
    window.location.reload();
  };

  const disableMetrics = () => {
    localStorage.setItem('showMetricsApp', 'false');
    setMetricsEnabled(false);
    window.location.reload();
  };

  const handleInitializeDatabase = async () => {
    setIsInitializing(true);
    setInitResult(null);
    
    try {
      const result = await initializeMetricsStructure();
      setInitResult(result);
    } catch (error) {
      setInitResult({ success: false, error: error.message });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleProcessExcelData = async () => {
    if (!callData || callData.length === 0) {
      setInitResult({ 
        success: false, 
        error: 'No hay datos de Excel cargados. Primero sube un archivo desde Registro de Llamadas.' 
      });
      return;
    }

    setIsInitializing(true);
    setInitResult(null);
    
    try {
      const result = await processExcelDataManually(callData);
      setInitResult(result);
    } catch (error) {
      setInitResult({ success: false, error: error.message });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSetupAdminProfile = async () => {
    setIsInitializing(true);
    setInitResult(null);
    
    try {
      const result = await setupSuperAdminProfile();
      setInitResult(result);
    } catch (error) {
      setInitResult({ success: false, error: error.message });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCheckPermissions = async () => {
    setIsInitializing(true);
    setInitResult(null);
    
    try {
      const result = await checkCurrentPermissions();
      setInitResult({
        success: result.authenticated,
        message: result.authenticated 
          ? `Usuario autenticado: ${result.email}${result.hasProfile ? ' (Perfil configurado)' : ' (Sin perfil)'}`
          : 'Usuario no autenticado',
        details: result
      });
    } catch (error) {
      setInitResult({ success: false, error: error.message });
    } finally {
      setIsInitializing(false);
    }
  };

  const features = [
    {
      name: 'Procesamiento Automático de Excel',
      status: 'ready',
      description: 'Cloud Functions procesan archivos automáticamente'
    },
    {
      name: 'Métricas en Tiempo Real',
      status: 'ready',
      description: 'Dashboards se actualizan automáticamente'
    },
    {
      name: 'Dashboard Global',
      status: 'ready',
      description: 'KPIs generales y análisis de distribución'
    },
    {
      name: 'Dashboard de Teleoperadoras',
      status: 'ready',
      description: 'Métricas individuales con filtros'
    },
    {
      name: 'Dashboard de Beneficiarios',
      status: 'ready',
      description: 'Estados y gestión de beneficiarios'
    },
    {
      name: 'Firebase Cloud Functions',
      status: 'pending',
      description: 'Requiere deployment: firebase deploy --only functions'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ready': return <Badge variant="success">Listo</Badge>;
      case 'pending': return <Badge variant="warning">Pendiente</Badge>;
      default: return <Badge variant="secondary">Info</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Sistema de Métricas Automatizadas
        </h2>
        <p className="text-gray-600">
          Dashboard avanzado con Cloud Functions para análisis de llamadas
        </p>
      </div>

      {/* Estado actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Estado Actual</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sistema de métricas:</p>
              <p className="font-medium">
                {metricsEnabled ? '✅ Habilitado' : '❌ Deshabilitado'}
              </p>
            </div>
            
            <div className="space-x-2">
              {!metricsEnabled ? (
                <button
                  onClick={enableMetrics}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Habilitar Sistema de Métricas</span>
                </button>
              ) : (
                <button
                  onClick={disableMetrics}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Volver al Sistema Original
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features implementadas */}
      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades Implementadas</CardTitle>
          <CardDescription>
            Estado de las características del nuevo sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  {getStatusIcon(feature.status)}
                  <div>
                    <h4 className="font-medium">{feature.name}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
                {getStatusBadge(feature.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Herramientas de inicialización */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Herramientas de Configuración</CardTitle>
          <CardDescription>
            Inicializa la base de datos y procesa datos sin Cloud Functions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Estado de resultado */}
            {initResult && (
              <div className={`p-4 rounded-lg border ${
                initResult.success 
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center gap-2 font-medium">
                  {initResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {initResult.success ? 'Éxito' : 'Error'}
                </div>
                <p className="text-sm mt-1">
                  {initResult.message || initResult.error}
                </p>
                {initResult.stats && (
                  <div className="text-xs mt-2 opacity-80">
                    Llamadas: {initResult.stats.totalCalls} | 
                    Exitosas: {initResult.stats.successfulCalls} | 
                    Operadoras: {initResult.stats.operators} | 
                    Beneficiarios: {initResult.stats.beneficiaries}
                  </div>
                )}
              </div>
            )}

            {/* Botones de acción */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-blue-800">Paso 1: Inicializar BD</h4>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Crea la estructura necesaria en Firestore
                </p>
                <button
                  onClick={handleInitializeDatabase}
                  disabled={isInitializing}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                >
                  {isInitializing ? 'Inicializando...' : 'Inicializar Firestore'}
                </button>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-green-800">Paso 2: Procesar Excel</h4>
                </div>
                <p className="text-sm text-green-700 mb-3">
                  Procesa datos cargados y calcula métricas
                </p>
                <button
                  onClick={handleProcessExcelData}
                  disabled={isInitializing || !callData || callData.length === 0}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-green-300 transition-colors"
                >
                  {isInitializing ? 'Procesando...' : 'Procesar Datos Excel'}
                </button>
                {(!callData || callData.length === 0) && (
                  <p className="text-xs text-gray-500 mt-1">
                    * Primero carga un Excel desde "Registro de Llamadas"
                  </p>
                )}
              </div>
            </div>

            {/* Panel de permisos y administración */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium text-purple-800">Configuración de Permisos</h4>
              </div>
              <p className="text-sm text-purple-700 mb-3">
                Configura perfil de administrador para resolver errores de permisos
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  onClick={handleSetupAdminProfile}
                  disabled={isInitializing}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-purple-300 transition-colors text-sm"
                >
                  {isInitializing ? 'Configurando...' : 'Configurar Admin'}
                </button>
                <button
                  onClick={handleCheckPermissions}
                  disabled={isInitializing}
                  className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:bg-purple-300 transition-colors text-sm"
                >
                  Verificar Permisos
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Estas herramientas simulan el comportamiento de Cloud Functions 
                  para que puedas probar el sistema completo sin necesidad del plan Blaze de Firebase.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instrucciones de uso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="h-5 w-5" />
            <span>Cómo Usar el Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-green-700">1. Para Frontend (Ya listo)</h4>
              <p className="text-sm text-gray-600 ml-4">
                • Habilita el sistema con el botón de arriba<br/>
                • Navega entre "Sistema Principal" y "Sistema de Métricas"<br/>
                • Los dashboards funcionan con datos de ejemplo
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-yellow-700">2. Para Backend (Requiere deployment)</h4>
              <p className="text-sm text-gray-600 ml-4">
                • Ejecuta: <code className="bg-gray-100 px-2 py-1 rounded">firebase deploy --only functions</code><br/>
                • Sube un archivo Excel a Firebase Storage<br/>
                • Las métricas se calculan automáticamente
              </p>
            </div>

            <div>
              <h4 className="font-medium text-blue-700">3. Inicializar Firestore</h4>
              <p className="text-sm text-gray-600 ml-4">
                • Ejecuta: <code className="bg-gray-100 px-2 py-1 rounded">node src/scripts/initializeFirestore.js</code><br/>
                • Esto configura la estructura de colecciones necesaria
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Arquitectura */}
      <Card>
        <CardHeader>
          <CardTitle>Arquitectura del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Backend (Cloud Functions)</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Procesamiento automático de Excel</li>
                <li>• Normalización de datos</li>
                <li>• Cálculo de métricas</li>
                <li>• Almacenamiento en Firestore</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Frontend (React + Zustand)</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Dashboards interactivos</li>
                <li>• Tiempo real con onSnapshot</li>
                <li>• Componentes shadcn/ui</li>
                <li>• Gráficos con Recharts</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MetricsTestPanel;