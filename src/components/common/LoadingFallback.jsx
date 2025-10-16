/**
 * LoadingFallback.jsx
 * Componente de carga para Suspense boundaries
 * 
 * FASE 4 - TAREA 6: Optimización de Rendimiento
 * 
 * Usado como fallback durante lazy loading de componentes pesados
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Componente de loading simple con spinner
 * 
 * @param {Object} props - Props del componente
 * @param {string} props.message - Mensaje a mostrar
 * @param {boolean} props.fullScreen - Si debe ocupar toda la pantalla
 */
const LoadingFallback = ({ message = 'Cargando...', fullScreen = false }) => {
  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

/**
 * Componente de loading para módulos específicos
 */
export const DashboardLoading = () => (
  <LoadingFallback message="Cargando Dashboard..." />
);

export const AuditLoading = () => (
  <LoadingFallback message="Cargando Auditoría Avanzada..." />
);

export const HistorialLoading = () => (
  <LoadingFallback message="Cargando Historial de Seguimientos..." />
);

export const ExcelLoading = () => (
  <LoadingFallback message="Cargando Análisis de Excel..." />
);

/**
 * Componente de loading con esqueleto (skeleton)
 */
export const SkeletonLoading = ({ rows = 5 }) => {
  return (
    <div className="space-y-4 p-6">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3"></div>
      
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
            <div className="h-8 bg-gray-300 rounded w-1/2"></div>
          </div>
        ))}
      </div>
      
      {/* Table skeleton */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center p-4 border-b border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded flex-1 mr-4"></div>
            <div className="h-4 bg-gray-200 rounded w-24 mr-4"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Error boundary fallback
 */
export const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
        <h3 className="text-red-800 font-bold text-lg mb-2">Error al cargar el módulo</h3>
        <p className="text-red-600 text-sm mb-4">
          {error?.message || 'Ha ocurrido un error inesperado'}
        </p>
        {resetErrorBoundary && (
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingFallback;
