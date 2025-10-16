# 🧪 Tests - Sistema de Validación de Consistencia

Este directorio contiene el **sistema de validación automática** que verifica la consistencia de métricas entre los módulos principales de la aplicación.

---

## 📁 Archivos

### `consistencyTest.js`

**Script principal de validación** que compara métricas entre Dashboard, Auditoría Avanzada e Historial de Seguimientos.

**Funciones principales:**

```javascript
// 1. Validación completa
import { runConsistencyTest } from './consistencyTest';

const stores = {
  callStore: useCallStore,
  seguimientosStore: useSeguimientosStore
};

const report = runConsistencyTest(stores);
console.log(report.globalStatus);    // "OK ✅" o "ALERTA ⚠️"
console.log(report.maxDifference);   // "0.0045%"
console.log(report.withinTolerance); // true/false

// 2. Monitor de sincronización realtime
import { monitorRealtimeSync } from './consistencyTest';

const monitor = monitorRealtimeSync((status) => {
  console.log('Latencia:', status.latency); // "847ms"
});

monitor.recordUpdate('analisisExcel');
const stats = monitor.getStats();
console.log(stats.averageLatency); // "892ms"

// 3. Generar reporte Markdown
import { generateMarkdownReport } from './consistencyTest';

const markdown = generateMarkdownReport(report);
console.log(markdown); // Tabla comparativa en formato MD
```

---

## 🎯 Criterios de Validación

### **Tolerancia:**
- **Máxima diferencia permitida:** ±0.01%
- **Métricas validadas:** totalLlamadas, exitosas, tasaExito, beneficiariosUnicos

### **Sincronización Realtime:**
- **Target de latencia:** < 2000ms (2 segundos)
- **Medición:** Tiempo desde actualización Firestore hasta reflejo en UI

---

## 📊 Estructura del Reporte

```javascript
{
  timestamp: "2025-10-16T14:32:15.234Z",
  duration: "12.45ms",
  globalStatus: "OK ✅",
  maxDifference: "0.0045%",
  withinTolerance: true,
  tolerance: "±0.01%",
  
  metrics: {
    dashboard: {
      total: 1248,
      exitosas: 1028,
      tasaExito: 82.37,
      beneficiariosUnicos: 567
    },
    auditoria: { /* ... */ },
    historial: { /* ... */ }
  },
  
  comparisons: {
    dashboardVsAuditoria: {
      status: "OK ✅",
      maxDiff: 0.0000,
      details: { /* ... */ }
    },
    dashboardVsHistorial: { /* ... */ },
    auditoriaVsHistorial: { /* ... */ }
  }
}
```

---

## 🚀 Uso en Componentes

### **Validación Manual:**

```jsx
import { runConsistencyTest } from '../tests/consistencyTest';
import { useCallStore } from '../stores/useCallStore';
import { useSeguimientosStore } from '../stores/useSeguimientosStore';

const MyComponent = () => {
  const handleValidate = () => {
    const stores = {
      callStore: useCallStore,
      seguimientosStore: useSeguimientosStore
    };
    
    const report = runConsistencyTest(stores);
    
    if (report.withinTolerance) {
      console.log('✅ Métricas consistentes');
    } else {
      console.warn('⚠️ Inconsistencias detectadas:', report.maxDifference);
    }
  };
  
  return <button onClick={handleValidate}>Validar Métricas</button>;
};
```

### **Validación Automática:**

```jsx
import { useEffect } from 'react';
import { runConsistencyTest } from '../tests/consistencyTest';

const MyDashboard = () => {
  useEffect(() => {
    // Validación cada 60 segundos
    const interval = setInterval(() => {
      const stores = {
        callStore: useCallStore,
        seguimientosStore: useSeguimientosStore
      };
      
      const report = runConsistencyTest(stores);
      console.log('Validación periódica:', report.globalStatus);
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  return <div>Dashboard con validación automática</div>;
};
```

---

## 🧪 Casos de Prueba

### **Test 1: Datos vacíos**
```javascript
// Precondición: callData = [], seguimientos = []
const report = runConsistencyTest(stores);

// Esperado:
report.globalStatus === "OK ✅"
report.metrics.dashboard.total === 0
report.metrics.auditoria.total === 0
report.metrics.historial.total === 0
report.maxDifference === "0.0000%"
```

### **Test 2: 1 registro**
```javascript
// Precondición: 1 seguimiento exitoso
const report = runConsistencyTest(stores);

// Esperado:
report.metrics.dashboard.total === 1
report.metrics.auditoria.total === 1
report.metrics.historial.total === 1
report.metrics.dashboard.tasaExito === 100
report.maxDifference === "0.0000%"
```

### **Test 3: Tolerancia límite**
```javascript
// Simulación: diferencia 0.005%
const report = runConsistencyTest(stores);

// Esperado:
report.withinTolerance === true // 0.005% < 0.01%
report.globalStatus === "OK ✅"

// Simulación: diferencia 0.02%
report.withinTolerance === false // 0.02% > 0.01%
report.globalStatus === "ALERTA ⚠️"
```

---

## 📝 Logs de Auditoría

Todos los eventos de validación se registran en `logger.audit()`:

```javascript
// Inicio de validación
logger.audit('[ConsistencyTest] Iniciando validación de consistencia');

// Normalización de datos
logger.audit('[ConsistencyTest] Datos normalizados', {
  callData: 1050,
  seguimientos: 198,
  normalizedTotal: 1248
});

// Resultado
logger.audit('[ConsistencyTest] Validación completada', {
  globalStatus: 'OK ✅',
  maxDifference: '0.0045%',
  withinTolerance: true
});
```

**Ubicación:** `localStorage` → `app_logs` → Array de eventos

---

## 🔧 Configuración

### **Tolerancia personalizada:**

```javascript
import { isWithinTolerance } from './consistencyTest';

// Default: 0.01%
const ok1 = isWithinTolerance(0.005); // true

// Tolerancia personalizada: 0.05%
const ok2 = isWithinTolerance(0.03, 0.05); // true
const ok3 = isWithinTolerance(0.06, 0.05); // false
```

### **Métricas personalizadas:**

```javascript
const report = runConsistencyTest(stores, {
  // Opciones futuras (no implementadas aún):
  // tolerance: 0.05,
  // metrics: ['total', 'tasaExito'],
  // verbose: true
});
```

---

## 🐛 Troubleshooting

### **Error: "Cannot read property 'getState' of undefined"**

**Causa:** Stores no están correctamente inicializados.

**Solución:**
```javascript
import { useCallStore } from '../stores/useCallStore';
import { useSeguimientosStore } from '../stores/useSeguimientosStore';

// ✅ Correcto
const stores = {
  callStore: useCallStore,
  seguimientosStore: useSeguimientosStore
};

// ❌ Incorrecto
const stores = {
  callStore: useCallStore(), // No llamar como función
  seguimientosStore: useSeguimientosStore()
};
```

### **Diferencias superiores a 0.01%**

**Causa:** Módulos no usan `computeGlobalMetrics()` o tienen cálculos locales.

**Solución:**
1. Verificar imports en Dashboard/Auditoría/Historial:
   ```javascript
   import { computeGlobalMetrics } from '../services/metricsEngine';
   ```
2. Verificar normalización de datos:
   ```javascript
   const normalizedData = normalizeRecords([...callData, ...seguimientos]);
   ```
3. Revisar logs de auditoría para identificar fuente de discrepancia.

---

## 📚 Documentación Relacionada

- **Guía completa:** `FASE_4_TAREA_5_VALIDACION_CONSISTENCIA.md`
- **Resumen ejecutivo:** `FASE_4_TAREA_5_RESUMEN.md`
- **Panel UI:** `src/components/validation/ConsistencyValidationPanel.jsx`
- **Integración App.jsx:** Validación automática cada 60s

---

## ✅ Checklist de Uso

Antes de usar este sistema:

- [ ] Verificar que Dashboard usa `computeGlobalMetrics()`
- [ ] Verificar que Auditoría usa `computeGlobalMetrics()`
- [ ] Verificar que Historial usa `computeGlobalMetrics()`
- [ ] Verificar normalización de datos en todos los módulos
- [ ] Verificar imports correctos (named exports)
- [ ] Ejecutar `npm run lint` → 0 errors

---

**Última actualización:** 2025-10-16  
**Versión:** 1.0.0  
**Mantenido por:** GitHub Copilot + Usuario

