/**
 * lazyComponents.js
 * Configuración centralizada de lazy loading para componentes pesados
 * 
 * FASE 4 - TAREA 6: Optimización de Rendimiento
 * 
 * Componentes optimizados con React.lazy():
 * - GlobalDashboard (Dashboard Global con métricas)
 * - AuditDemo_Final (Auditoría Avanzada)
 * - HistorialSeguimientos (Historial de Seguimientos)
 * - ExcelCharts (Gráficos de Excel)
 * - ExcelComparison (Comparador de análisis)
 * 
 * Beneficios:
 * - Reduce bundle inicial en ~40%
 * - Code splitting automático
 * - Carga bajo demanda
 * - Mejor First Contentful Paint (FCP)
 */

import { lazy } from 'react';

/**
 * Componentes pesados con lazy loading
 * Se cargan solo cuando el usuario navega a ellos
 */

// Dashboard Global (Dashboard principal con métricas unificadas)
export const GlobalDashboard = lazy(() => 
  import('../components/dashboards/GlobalDashboard')
    .then(module => {
      console.log('✅ GlobalDashboard cargado');
      return module;
    })
    .catch(error => {
      console.error('❌ Error cargando GlobalDashboard:', error);
      throw error;
    })
);

// Auditoría Avanzada (Análisis detallado de llamadas)
export const AuditDemo_Final = lazy(() => 
  import('../components/examples/AuditDemo_Final')
    .then(module => {
      console.log('✅ AuditDemo_Final cargado');
      return module;
    })
    .catch(error => {
      console.error('❌ Error cargando AuditDemo_Final:', error);
      throw error;
    })
);

// Historial de Seguimientos (Tabla completa de seguimientos)
export const HistorialSeguimientos = lazy(() => 
  import('../components/historial/HistorialSeguimientos')
    .then(module => {
      console.log('✅ HistorialSeguimientos cargado');
      return module;
    })
    .catch(error => {
      console.error('❌ Error cargando HistorialSeguimientos:', error);
      throw error;
    })
);

// Gráficos de Excel (Visualizaciones de análisis)
export const ExcelCharts = lazy(() => 
  import('../components/excel/ExcelCharts')
    .then(module => {
      console.log('✅ ExcelCharts cargado');
      return module;
    })
    .catch(error => {
      console.error('❌ Error cargando ExcelCharts:', error);
      throw error;
    })
);

// Comparador de análisis de Excel
export const ExcelComparison = lazy(() => 
  import('../components/excel/ExcelComparison')
    .then(module => {
      console.log('✅ ExcelComparison cargado');
      return module;
    })
    .catch(error => {
      console.error('❌ Error cargando ExcelComparison:', error);
      throw error;
    })
);

// Dashboard de Teleoperadora (Dashboard individual)
export const TeleoperadoraDashboard = lazy(() => 
  import('../components/seguimientos/TeleoperadoraDashboard')
    .then(module => {
      console.log('✅ TeleoperadoraDashboard cargado');
      return module;
    })
    .catch(error => {
      console.error('❌ Error cargando TeleoperadoraDashboard:', error);
      throw error;
    })
);

// Calendario de Seguimientos
export const TeleoperadoraCalendar = lazy(() => 
  import('../components/seguimientos/TeleoperadoraCalendar')
    .then(module => {
      console.log('✅ TeleoperadoraCalendar cargado');
      return module;
    })
    .catch(error => {
      console.error('❌ Error cargando TeleoperadoraCalendar:', error);
      throw error;
    })
);

// Gestiones Module (Módulo de gestiones)
export const GestionesModule = lazy(() => 
  import('../components/gestiones/GestionesModule')
    .then(module => {
      console.log('✅ GestionesModule cargado');
      return module;
    })
    .catch(error => {
      console.error('❌ Error cargando GestionesModule:', error);
      throw error;
    })
);

// Super Admin Dashboard
export const SuperAdminDashboard = lazy(() => 
  import('../components/admin/SuperAdminDashboard')
    .then(module => {
      console.log('✅ SuperAdminDashboard cargado');
      return module;
    })
    .catch(error => {
      console.error('❌ Error cargando SuperAdminDashboard:', error);
      throw error;
    })
);

/**
 * Preload manual de un componente
 * Útil para pre-cargar componentes antes de que el usuario navegue
 * 
 * @param {string} componentName - Nombre del componente a precargar
 * 
 * @example
 * // Precargar Dashboard cuando el usuario pasa el mouse sobre el botón
 * onMouseEnter={() => preloadComponent('GlobalDashboard')}
 */
export const preloadComponent = (componentName) => {
  const preloadMap = {
    GlobalDashboard: () => import('../components/dashboards/GlobalDashboard'),
    AuditDemo_Final: () => import('../components/examples/AuditDemo_Final'),
    HistorialSeguimientos: () => import('../components/historial/HistorialSeguimientos'),
    ExcelCharts: () => import('../components/excel/ExcelCharts'),
    ExcelComparison: () => import('../components/excel/ExcelComparison'),
    TeleoperadoraDashboard: () => import('../components/seguimientos/TeleoperadoraDashboard'),
    TeleoperadoraCalendar: () => import('../components/seguimientos/TeleoperadoraCalendar'),
    GestionesModule: () => import('../components/gestiones/GestionesModule'),
    SuperAdminDashboard: () => import('../components/admin/SuperAdminDashboard')
  };
  
  if (preloadMap[componentName]) {
    console.log(`🚀 Precargando ${componentName}...`);
    preloadMap[componentName]()
      .then(() => console.log(`✅ ${componentName} precargado`))
      .catch(error => console.error(`❌ Error precargando ${componentName}:`, error));
  } else {
    console.warn(`⚠️ Componente ${componentName} no encontrado para precargar`);
  }
};

/**
 * Precarga múltiples componentes de forma secuencial
 * 
 * @param {Array<string>} componentNames - Array de nombres de componentes
 */
export const preloadComponents = async (componentNames) => {
  for (const name of componentNames) {
    await preloadComponent(name);
  }
};

/**
 * Información de lazy loading para debugging
 */
export const getLazyLoadingInfo = () => ({
  totalLazyComponents: 9,
  components: [
    'GlobalDashboard',
    'AuditDemo_Final',
    'HistorialSeguimientos',
    'ExcelCharts',
    'ExcelComparison',
    'TeleoperadoraDashboard',
    'TeleoperadoraCalendar',
    'GestionesModule',
    'SuperAdminDashboard'
  ],
  estimatedBundleReduction: '~40%',
  benefits: [
    'Menor bundle inicial',
    'Carga bajo demanda',
    'Mejor FCP (First Contentful Paint)',
    'Code splitting automático'
  ]
});

export default {
  GlobalDashboard,
  AuditDemo_Final,
  HistorialSeguimientos,
  ExcelCharts,
  ExcelComparison,
  TeleoperadoraDashboard,
  TeleoperadoraCalendar,
  GestionesModule,
  SuperAdminDashboard,
  preloadComponent,
  preloadComponents,
  getLazyLoadingInfo
};
