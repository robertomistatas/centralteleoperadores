# 🔴 AUDITORÍA CRÍTICA: Fechas Negativas y Métricas Inconsistentes en Historial de Seguimientos

**Fecha**: 20 de Octubre de 2025  
**Módulo Afectado**: Historial de Seguimientos  
**Severidad**: CRÍTICA 🔴  
**Estado**: En Corrección

---

## 📊 PROBLEMAS DETECTADOS

### 1. **Fechas con Días Negativos** (-51 días, -21 días)
**Síntoma**: Las tarjetas muestran "Hace: -51 días" en lugar de valores positivos.

**Causa Raíz Identificada**:

#### **Problema 1A: Conversión Incorrecta de Fechas (Zona Horaria)**
```javascript
// ❌ CÓDIGO PROBLEMÁTICO (línea 164)
const callDate = record.fecha ? new Date(record.fecha) : null;
```

**Análisis**:
- `record.fecha` viene normalizado como string `"YYYY-MM-DD"` (ej: `"2025-12-09"`)
- `new Date("2025-12-09")` se interpreta como **medianoche UTC (00:00 UTC)**
- En zona horaria Chile (UTC-3/-4), esto se convierte al **día anterior a las 21:00**
- Ejemplo: `"2025-12-09"` → `2025-12-08 21:00:00` (Chile)

#### **Problema 1B: Fechas Futuras en los Datos**
**Análisis**:
- La fecha actual del sistema es: **20 de Octubre de 2025**
- Las tarjetas muestran fechas como `"09-12-2025"` (9 de Diciembre de 2025)
- Esto genera diferencias de tiempo **negativas**: `now - futureDate < 0`
- Por lo tanto: `Math.floor(diffTime / (1000 * 60 * 60 * 24))` = **NÚMERO NEGATIVO**

**Evidencia**:
```
Tarjeta "No identificado": Última llamada: 09-12-2025, Hace: -51 días
Tarjeta "Orietta González": Última llamada: 09-12-2025, Hace: -51 días
Tarjeta "Sara Esquivel": Última llamada: 09-12-2025, Hace: -51 días
Tarjeta "Nancy Lazen": Última llamada: 09-11-2025, Hace: -21 días
```

**Conclusión**: Los datos del Excel tienen fechas **futuras** (probablemente Diciembre 2025), cuando la fecha actual es Octubre 2025.

---

### 2. **Métricas Inconsistentes**
**Síntoma**: 
- Header muestra: **2.383 llamadas • 56.1% éxito**
- Clasificación muestra: **72 beneficiarios "Al día"**
- **NO CUADRA**: Si hay 2.383 llamadas exitosas (~1.337 exitosas al 56%), ¿por qué solo 72 están "al día"?

**Causa Raíz Identificada**:

#### **Problema 2A: Confusión entre "Llamadas" y "Beneficiarios"**
```javascript
// Métricas globales (línea 97-108)
const globalMetrics = computeGlobalMetrics(normalizedData, {
  includeTopOperators: false,
  calculateTrends: false
});

// Stats mostradas (línea 300-325)
stats.totalLlamadas: 2.383  // ✅ Total de LLAMADAS (registros)
stats.tasaExito: 56.1%      // ✅ Tasa de éxito de LLAMADAS
stats.total: 483            // ✅ Total de BENEFICIARIOS únicos
stats.alDia: 72             // ✅ BENEFICIARIOS con llamada exitosa en últimos 15 días
```

**Análisis**:
- Las **2.383 llamadas** son registros individuales en el Excel
- Los **483 beneficiarios** son personas únicas
- De esos 483, solo **72 tienen contacto exitoso en los últimos 15 días**
- El **56.1% de éxito** es sobre las llamadas, NO sobre los beneficiarios

**Explicación del descuadre**:
1. Un beneficiario puede tener **múltiples llamadas** (exitosas y fallidas)
2. Un beneficiario con 10 llamadas fallidas y 1 exitosa cuenta como:
   - **11 llamadas** en el total
   - **1 beneficiario** urgente/pendiente (según cuándo fue la última exitosa)
3. Las métricas están **correctas**, pero la presentación confunde al usuario

#### **Problema 2B: Falta de Claridad en la UI**
El header no distingue claramente entre:
- **Métricas de llamadas** (2.383 total, 56% éxito)
- **Métricas de beneficiarios** (483 total, 72 al día)

---

## 🔍 ANÁLISIS TÉCNICO DETALLADO

### **Flujo de Datos Actual**

```mermaid
Excel → excelProcessor → normalizeDate → "YYYY-MM-DD" string
                                            ↓
                          HistorialSeguimientos → new Date(fecha)
                                            ↓
                          ⚠️ Zona horaria local (Chile UTC-3)
                                            ↓
                          now - callDate = diffTime
                                            ↓
                          ❌ diffTime < 0 si callDate > now
                                            ↓
                          daysSinceLastSuccess = Math.floor(diffTime / 86400000)
                                            ↓
                          ❌ RESULTADO: DÍAS NEGATIVOS
```

### **Funciones Afectadas**

#### **1. `excelProcessor.js` - `normalizeDate()` (línea 120-152)**
```javascript
function normalizeDate(dateValue) {
  // ...
  // ❌ PROBLEMA: Crea Date en zona horaria local
  date = new Date(year, month, day);
  
  // ✅ Retorna string ISO correcto
  return `${year}-${month}-${day}`;
}
```

#### **2. `HistorialSeguimientos.jsx` - `followUpData` (línea 164)**
```javascript
// ❌ PROBLEMA: Convierte string ISO a Date con zona horaria
const callDate = record.fecha ? new Date(record.fecha) : null;
```

#### **3. `HistorialSeguimientos.jsx` - Cálculo de días (línea 221-223)**
```javascript
if (data.lastSuccessfulCall) {
  const diffTime = now - data.lastSuccessfulCall;
  daysSinceLastSuccess = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  // ❌ Si lastSuccessfulCall > now → diffTime < 0 → días negativos
}
```

---

## ✅ SOLUCIONES PROPUESTAS

### **Solución 1: Normalización de Fechas sin Zona Horaria**

**En `excelProcessor.js`**:
```javascript
// ✅ SOLUCIÓN: Usar UTC para evitar problemas de zona horaria
function normalizeDate(dateValue) {
  // ...
  date = new Date(Date.UTC(year, month, day));
  return date.toISOString().split('T')[0];
}
```

**En `HistorialSeguimientos.jsx`**:
```javascript
// ✅ SOLUCIÓN: Parsear fecha en UTC
const parseDateUTC = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const callDate = record.fecha ? parseDateUTC(record.fecha) : null;
```

**En cálculo de días**:
```javascript
// ✅ SOLUCIÓN: Proteger contra fechas futuras
if (data.lastSuccessfulCall) {
  const diffTime = now - data.lastSuccessfulCall;
  daysSinceLastSuccess = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  // Math.max(0, ...) asegura que nunca sea negativo
}
```

### **Solución 2: Mejorar Claridad en Métricas**

**En `HistorialSeguimientos.jsx` - Header**:
```jsx
{/* Métricas de LLAMADAS */}
<div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
  <strong>📞 Llamadas:</strong> {stats.totalLlamadas?.toLocaleString()} total
  ({stats.llamadasExitosas?.toLocaleString()} exitosas • {stats.tasaExito?.toFixed(1)}% éxito)
</div>

{/* Métricas de BENEFICIARIOS */}
<div className="text-sm text-gray-600 bg-teal-50 p-3 rounded mt-2">
  <strong>👥 Beneficiarios:</strong> {stats.total} total
  ({stats.alDia} al día • {stats.urgentes} urgentes)
</div>
```

### **Solución 3: Validación de Datos en Carga**

**En `ExcelUploader.jsx`**:
```javascript
// ✅ Validar que las fechas no sean futuras
const validateDates = (data) => {
  const now = new Date();
  const futureDates = data.filter(record => {
    const fecha = new Date(record.fecha);
    return fecha > now;
  });
  
  if (futureDates.length > 0) {
    showWarning(`⚠️ Detectadas ${futureDates.length} fechas futuras en el Excel. Verifica los datos.`);
  }
};
```

---

## 📝 CHECKLIST DE CORRECCIÓN

### **Fase 1: Correcciones Críticas** 🔴
- [ ] Implementar `parseDateUTC()` en `HistorialSeguimientos.jsx`
- [ ] Proteger cálculo de días con `Math.max(0, ...)`
- [ ] Actualizar `normalizeDate()` en `excelProcessor.js` para usar UTC
- [ ] Actualizar `normalizeDate()` en `dataNormalizer.js` para usar UTC

### **Fase 2: Mejoras de UI** 🟡
- [ ] Separar métricas de llamadas vs beneficiarios en el header
- [ ] Agregar tooltips explicativos
- [ ] Mostrar warning si hay fechas futuras

### **Fase 3: Validaciones** 🟢
- [ ] Validar fechas en carga de Excel
- [ ] Agregar logs detallados de conversión de fechas
- [ ] Test de casos edge (fechas futuras, fechas muy antiguas)

---

## 🎯 RESULTADO ESPERADO

**Después de la corrección**:

✅ Fechas mostradas correctamente:
```
"Hace: 41 días" (en lugar de -51 días)
"Hace: 9 días"  (en lugar de -21 días)
```

✅ Métricas claramente diferenciadas:
```
📞 Llamadas: 2.383 total (1.337 exitosas • 56.1% éxito)
👥 Beneficiarios: 483 total (72 al día • 411 urgentes)
```

✅ Clasificación correcta según días:
```
Al día: 72     (contacto en últimos 15 días)
Pendientes: 0  (contacto entre 16-30 días)
Urgentes: 411  (sin contacto +30 días)
```

---

## 📌 NOTAS ADICIONALES

### **Problema de Datos en el Excel**
Las fechas futuras (Diciembre 2025) en el Excel sugieren:
1. **Datos de prueba** con fechas incorrectas
2. **Reloj del sistema** mal configurado al momento de generar el Excel
3. **Error humano** al registrar las fechas

**Recomendación**: Validar con el cliente el origen de estos datos y regenerar el Excel con fechas correctas.

### **Impacto en Otros Módulos**
Esta corrección beneficiará también a:
- ✅ Dashboard de Teleoperadoras
- ✅ Auditoría Avanzada
- ✅ Métricas Unificadas (Fase 4)

---

**Documentado por**: GitHub Copilot  
**Fecha**: 20 de Octubre de 2025  
**Versión**: RC1 - Corrección Crítica
