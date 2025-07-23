# Implementación de Zustand para Auditoría de Llamadas

## Arquitectura de Stores

### 1. useCallStore.js - Gestión de Datos de Auditoría

**Propósito:** Maneja toda la lógica relacionada con datos de llamadas para auditoría.

**Estado principal:**
```javascript
{
  callData: [],           // Datos brutos cargados desde Excel
  processedData: [],      // Datos procesados y analizados
  callMetrics: {          // Métricas calculadas automáticamente
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    averageDuration: 0,
    uniqueBeneficiaries: 0,
    protocolCompliance: 0
  },
  isLoading: false,
  lastUpdated: null,
  dataSource: null,       // 'excel', 'firebase', 'api'
  filters: {}             // Filtros aplicados a los datos
}
```

**Acciones principales:**
- `setCallData(data, source)` - Cargar nuevos datos y analizar automáticamente
- `analyzeCallData()` - Procesar datos y calcular métricas
- `setFilters(filters)` - Aplicar filtros a los datos
- `getOperatorMetrics(assignments)` - Calcular métricas por operador
- `getHourlyDistribution()` - Obtener distribución horaria de llamadas
- `getFollowUpData(assignments)` - Generar datos de seguimiento

### 2. useAppStore.js - Gestión de Estado de Aplicación

**Propósito:** Maneja operadores, asignaciones y configuraciones de la aplicación.

**Estado principal:**
```javascript
{
  operators: [],                // Lista de operadores registrados
  operatorAssignments: {},      // Asignaciones por operador
  activeTab: 'dashboard',       // Pestaña activa
  isLoading: false,
  settings: {}                  // Configuraciones de la aplicación
}
```

**Acciones principales:**
- `setOperators(operators)` - Actualizar lista de operadores
- `setOperatorAssignments(assignments)` - Actualizar asignaciones
- `setActiveTab(tab)` - Cambiar pestaña activa
- `getAllAssignments()` - Obtener todas las asignaciones

### 3. useUserStore.js - Gestión de Usuario

**Propósito:** Maneja el estado del usuario autenticado con persistencia.

## Integración con la Aplicación Existente

### Proceso de Carga de Datos Excel

1. **Usuario sube archivo Excel**
2. **processExcelData()** procesa los datos
3. **setZustandCallData()** almacena en Zustand con análisis automático
4. **Métricas se calculan** automáticamente y se sincronizan
5. **Datos se persisten** en localStorage para navegación

### Flujo de Análisis Automático

```javascript
// Al cargar datos
setCallData(excelData, 'excel') → 
  analyzeCallData() → 
    calcular métricas → 
      actualizar UI reactivamente
```

### Persistencia Inteligente

- **useCallStore:** Persiste datos de auditoría, métricas y filtros
- **useAppStore:** Persiste operadores, asignaciones y configuraciones
- **useUserStore:** Persiste información de sesión de usuario

## Ventajas de la Implementación

### 1. **Reactividad Automática**
- Los componentes se actualizan automáticamente cuando cambian los datos
- No hay necesidad de prop drilling
- Estado global accesible desde cualquier componente

### 2. **Análisis Automático**
- Al cargar nuevos datos, las métricas se calculan automáticamente
- Distribución horaria se genera en tiempo real
- Seguimientos se actualizan basados en datos reales

### 3. **Persistencia Transparente**
- Los datos se mantienen entre recargas de página
- Solo se persisten datos importantes (no estados temporales)
- Recuperación automática del estado al cargar la aplicación

### 4. **Filtros Reactivos**
- Los filtros se aplican inmediatamente sin recargar datos
- Estado de filtros se mantiene durante la navegación
- Múltiples tipos de filtros (operador, estado, fecha, comuna)

### 5. **Integración Gradual**
- Se mantiene compatibilidad con el código existente
- Transición gradual sin romper funcionalidad
- Posibilidad de migrar módulos específicos progresivamente

## Uso en Componentes

### Ejemplo básico:
```javascript
import { useCallStore, useAppStore } from '../stores';

function MiComponente() {
  const {
    callMetrics,
    hasData,
    setFilters
  } = useCallStore();

  const {
    operators,
    setActiveTab
  } = useAppStore();

  return (
    <div>
      <h2>Llamadas totales: {callMetrics.totalCalls}</h2>
      <p>Datos disponibles: {hasData() ? 'Sí' : 'No'}</p>
    </div>
  );
}
```

## Demostración Interactiva

La pestaña **"Zustand - Auditoría"** incluye:

1. **Simulación de carga Excel** - Demuestra cómo se procesan los datos
2. **Métricas en tiempo real** - Muestra cálculos automáticos
3. **Estado de stores** - Visualiza el estado interno
4. **Tabla de datos** - Presenta datos procesados
5. **Controles interactivos** - Permite probar la funcionalidad

## Próximos Pasos

1. **Migrar módulos específicos** a usar Zustand completamente
2. **Eliminar estado local redundante** progresivamente  
3. **Agregar más filtros avanzados** (rango de fechas, múltiples operadores)
4. **Implementar sincronización** con Firebase usando Zustand
5. **Agregar stores adicionales** para otros módulos (reportes, configuraciones)

## Estructura de Archivos

```
src/
├── stores/
│   ├── index.js           # Barrel file para exportaciones
│   ├── useCallStore.js    # Store de datos de auditoría
│   ├── useAppStore.js     # Store de aplicación
│   └── useUserStore.js    # Store de usuario
├── components/
│   └── examples/
│       └── AuditDemo.jsx  # Demostración interactiva
└── App.jsx               # Integración principal
```

Esta implementación proporciona una base sólida y escalable para el manejo de estado global en la aplicación de auditoría de llamadas, manteniendo la compatibilidad con el código existente mientras se prepara para una migración completa a Zustand.
