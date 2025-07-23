import React, { useState, useEffect } from 'react';
import { useCallStore, useAppStore, useUserStore } from '../stores';

const ZustandTest = () => {
  const { 
    callData, 
    callMetrics, 
    isLoading,
    setCallData,
    clearData,
    getOperatorMetrics,
    getHourlyDistribution,
    hasData
  } = useCallStore();
  
  const { 
    operators,
    setOperators,
    addOperator
  } = useAppStore();
  
  const {
    user,
    login,
    logout
  } = useUserStore();

  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  // Función para ejecutar las pruebas una por una
  const runTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults([]);
    
    try {
      // Test 1: User Store
      const test1 = { test: "User Store - Login", status: "🔄 Ejecutando..." };
      setTestResults([test1]);
      
      login({ name: "Test User", role: "admin" });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      test1.status = user?.name === "Test User" ? "✅ PASS" : "❌ FAIL";
      setTestResults([{ ...test1 }]);
      
      // Test 2: App Store
      const test2 = { test: "App Store - Add Operator", status: "🔄 Ejecutando..." };
      setTestResults(prev => [...prev, test2]);
      
      const newOperator = {
        id: `test-op-${Date.now()}`,
        name: "Operador Test",
        extension: "1001",
        status: "available"
      };
      
      addOperator(newOperator);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      test2.status = operators.some(op => op.name === "Operador Test") ? "✅ PASS" : "❌ FAIL";
      setTestResults(prev => [...prev.slice(0, -1), { ...test2 }]);
      
      // Test 3: Call Store
      const test3 = { test: "Call Store - Load Test Data", status: "🔄 Ejecutando..." };
      setTestResults(prev => [...prev, test3]);
      
      const testData = [
        {
          fecha: "2024-01-15",
          hora: "09:30:00",
          operador: "Operador Test",
          extension: "1001",
          numero_cliente: "555-0001",
          duracion: 180,
          tipo_llamada: "entrante",
          categoria: "consulta"
        },
        {
          fecha: "2024-01-15",
          hora: "10:15:00",
          operador: "Operador Test",
          extension: "1001",
          numero_cliente: "555-0002",
          duracion: 240,
          tipo_llamada: "saliente",
          categoria: "seguimiento"
        }
      ];
      
      setCallData(testData);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      test3.status = callData?.length === 2 ? "✅ PASS" : "❌ FAIL";
      setTestResults(prev => [...prev.slice(0, -1), { ...test3 }]);
      
      // Test 4: Metrics Calculation
      const test4 = { test: "Call Store - Metrics Calculation", status: "🔄 Ejecutando..." };
      setTestResults(prev => [...prev, test4]);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      test4.status = callMetrics?.totalCalls > 0 ? "✅ PASS" : "❌ FAIL";
      setTestResults(prev => [...prev.slice(0, -1), { ...test4 }]);
      
      // Test 5: Data Persistence
      const test5 = { test: "Store - Data Persistence", status: "🔄 Ejecutando..." };
      setTestResults(prev => [...prev, test5]);
      
      test5.status = hasData() ? "✅ PASS" : "❌ FAIL";
      setTestResults(prev => [...prev.slice(0, -1), { ...test5 }]);
      
    } catch (error) {
      console.error('Error en las pruebas:', error);
      setTestResults(prev => [...prev, { test: "Error General", status: "❌ ERROR" }]);
    } finally {
      setIsRunning(false);
    }
  };

  const clearTests = () => {
    setTestResults([]);
    clearData();
    logout();
    setOperators([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🧪 Pruebas de Zustand - Sistema de Auditoría
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Estado del Usuario</h3>
          <p className="text-sm text-gray-600">
            Usuario: {user ? user.name : "No autenticado"}
          </p>
          <p className="text-sm text-gray-600">
            Rol: {user ? user.role : "N/A"}
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Operadores</h3>
          <p className="text-sm text-gray-600">
            Total: {operators.length}
          </p>
          {operators.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Último: {operators[operators.length - 1]?.name}
            </p>
          )}
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-800 mb-2">Datos de Auditoría</h3>
          <p className="text-sm text-gray-600">
            Registros: {callData ? callData.length : 0}
          </p>
          <p className="text-sm text-gray-600">
            Estado: {isLoading ? "Cargando..." : "Listo"}
          </p>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="font-semibold text-orange-800 mb-2">Análisis</h3>
          <p className="text-sm text-gray-600">
            Total llamadas: {callMetrics ? callMetrics.totalCalls : 0}
          </p>
          <p className="text-sm text-gray-600">
            Duración promedio: {callMetrics ? Math.round(callMetrics.averageDuration) : 0}s
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`px-4 py-2 rounded-lg transition-colors ${
            isRunning 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {isRunning ? '🔄 Ejecutando...' : '🚀 Ejecutar Pruebas'}
        </button>
        
        <button
          onClick={clearTests}
          disabled={isRunning}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400"
        >
          🧹 Limpiar Estado
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">
            Resultados de Pruebas ({testResults.length}/5)
          </h3>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">{result.test}</span>
                <span className="text-sm">{result.status}</span>
              </div>
            ))}
          </div>
          
          {testResults.length === 5 && !isRunning && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800 text-sm font-medium">
                ✅ Pruebas completadas. Zustand está funcionando correctamente.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Debug Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">Debug Info</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>HasData: {hasData() ? 'true' : 'false'}</p>
          <p>CallData length: {callData?.length || 0}</p>
          <p>Metrics total: {callMetrics?.totalCalls || 0}</p>
          <p>User authenticated: {user ? 'true' : 'false'}</p>
        </div>
      </div>
    </div>
  );
};

export default ZustandTest;
