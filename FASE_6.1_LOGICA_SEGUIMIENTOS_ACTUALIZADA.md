# FASE 6.1 - LÓGICA DE SEGUIMIENTOS ACTUALIZADA

**Fecha:** 13 de noviembre de 2025  
**Rama:** `bugfix/historial-operator-fix-20251020T1830`  
**Versión:** 6.1.0  
**Autor:** Equipo Central Teleoperadores

---

## 📋 Resumen Ejecutivo

Se ha implementado una actualización crítica en la lógica de validación de seguimientos para reflejar la nueva política empresarial de la gerencia. El sistema ahora considera válidos tanto los seguimientos realizados mediante **llamadas salientes exitosas** como aquellos generados por **llamadas entrantes del beneficiario a la central**.

### Impacto

- ✅ Mayor cobertura de seguimientos (se incluyen llamadas entrantes)
- ✅ Métricas más precisas sobre contacto real con beneficiarios
- ✅ Mejor clasificación de estados (Al día / Pendiente / Urgente)
- ✅ Retrocompatibilidad total con datos existentes

---

## 🎯 Nueva Lógica Empresarial

### Definición de "Seguimiento Válido"

Un seguimiento se considera **VÁLIDO** cuando cumple **cualquiera** de las siguientes condiciones:

```javascript
isValidCall = (
  (tipo_llamada === 'saliente' && resultado === 'exitosa') ||
  (tipo_llamada === 'entrante')
)
```

#### Casos de Uso

| Tipo Llamada | Resultado | ¿Es Válido? | Razón |
|--------------|-----------|-------------|--------|
| Saliente | Exitosa | ✅ SÍ | Contacto efectivo realizado por teleoperadora |
| Saliente | Fallida | ❌ NO | No se logró contacto |
| Saliente | Sin identificar | ❌ NO | Estado indeterminado |
| **Entrante** | **Cualquiera** | ✅ **SÍ** | **Beneficiario inició contacto** |
| Entrante | Exitosa | ✅ SÍ | Llamada entrante atendida |
| Entrante | Fallida | ✅ SÍ | Llamada entrante no atendida (pero hubo intento) |
| Entrante | Sin identificar | ✅ SÍ | Llamada entrante registrada |

**⚠️ Nota importante:** Las llamadas entrantes se consideran válidas independiente del resultado porque demuestran que el beneficiario está activo e intentó contactar con la central.

---

## 🔄 Lógica Anterior vs Nueva

### ANTES (Lógica v6.0)

```javascript
// Solo se consideraban válidas las llamadas salientes exitosas
const isSuccessful = record.resultado === 'exitosa';

// Filtrado en métricas
const exitosas = records.filter(r => r.resultado === 'exitosa');
```

**Limitaciones:**
- ❌ No reconocía llamadas entrantes
- ❌ Beneficiarios que llamaban a la central no aparecían "al día"
- ❌ Métricas de cobertura subestimadas

### DESPUÉS (Lógica v6.1)

```javascript
// Nueva función que evalúa ambas políticas
export const isValidCall = (record = {}) => {
  const resultado = record.resultado || '';
  const direction = record.callDirection || record.tipo_llamada || '';
  const normalizedDirection = normalizeCallDirection(direction);
  
  // POLÍTICA 1: Llamada entrante siempre es válida
  if (normalizedDirection === 'entrante') {
    return true;
  }
  
  // POLÍTICA 2: Llamada saliente solo válida si es exitosa
  if (normalizedDirection === 'saliente' && resultado === 'exitosa') {
    return true;
  }
  
  return false;
};
```

**Ventajas:**
- ✅ Reconoce llamadas entrantes como seguimientos válidos
- ✅ Mantiene validación de salientes exitosas
- ✅ Clasifica correctamente estados temporales
- ✅ Auditoría completa con logging

---

## 📐 Clasificación Temporal (Sin Cambios)

La clasificación de estados se mantiene igual, pero ahora usa **la fecha del último seguimiento válido**:

| Estado | Condición | Días desde último contacto válido |
|--------|-----------|-----------------------------------|
| 🟢 **Al día** | Seguimiento válido ≤ 15 días | 0-15 días |
| 🟡 **Pendiente** | Seguimiento válido 16-30 días | 16-30 días |
| 🔴 **Urgente** | Sin seguimiento válido > 30 días | >30 días o nunca |

**Ejemplo de cálculo:**

```javascript
// Beneficiario con historial mixto:
// - 10 días atrás: Llamada saliente fallida → NO VÁLIDA
// - 12 días atrás: Llamada entrante → VÁLIDA ✅
// - 45 días atrás: Llamada saliente exitosa → VÁLIDA pero antigua

// Último seguimiento válido: 12 días atrás (llamada entrante)
// Estado: 🟢 AL DÍA
```

---

## 🗂️ Archivos Modificados

### 1. `src/utils/dataNormalizer.js`

**Líneas añadidas:** ~100 líneas  
**Funciones nuevas:**
- `normalizeCallDirection(direction)` - Normaliza tipo de llamada a 'entrante' o 'saliente'
- `isValidCall(record)` - Determina si un registro es seguimiento válido
- `getValidFollowups(records)` - Filtra array para obtener solo seguimientos válidos

**Cambios en `normalizeRecord()`:**
```javascript
// ANTES
return {
  id, operatorName, beneficiaryName, phone,
  resultado, fecha, observaciones, duracion, tipo,
  _original
};

// DESPUÉS
const normalized = {
  id, operatorName, beneficiaryName, phone,
  resultado, 
  callDirection: normalizeCallDirection(rawDirection), // ⭐ NUEVO
  fecha, observaciones, duracion, tipo,
  _original
};

normalized.isValidFollowup = isValidCall(normalized); // ⭐ NUEVO FLAG

return normalized;
```

### 2. `src/services/excelProcessor.js`

**Cambio:** Añadido mapeo de columna `tipoLlamada`

```javascript
// ANTES
const COLUMN_MAPPINGS = {
  beneficiario: [...],
  telefono: [...],
  fecha: [...],
  resultado: [...]
};

// DESPUÉS
const COLUMN_MAPPINGS = {
  beneficiario: [...],
  telefono: [...],
  fecha: [...],
  resultado: [...],
  tipoLlamada: ['tipo', 'tipo llamada', 'tipo_llamada', 
                'dirección', 'direction', 'entrante', 
                'saliente', 'inbound', 'outbound'] // ⭐ NUEVO
};
```

**Normalización en parsing:**
```javascript
case 'tipoLlamada':
  const tipo = value ? String(value).toLowerCase().trim() : '';
  if (tipo.includes('entrant') || tipo === 'entrante' || tipo === 'inbound') {
    normalized[normalizedCol] = 'entrante';
  } else if (tipo.includes('salient') || tipo === 'saliente' || tipo === 'outbound') {
    normalized[normalizedCol] = 'saliente';
  } else {
    normalized[normalizedCol] = 'saliente'; // default retrocompatibilidad
  }
  break;
```

### 3. `src/services/metricsEngine.js`

**Cambio:** Nueva métrica `seguimientosValidos`

```javascript
// ANTES
const total = normalizedRecords.length;
const byResult = groupByResult(normalizedRecords);
const exitosas = byResult.exitosas.length;

// DESPUÉS
const total = normalizedRecords.length;
const validFollowups = getValidFollowups(normalizedRecords); // ⭐ NUEVO
const totalSeguimientosValidos = validFollowups.length;      // ⭐ NUEVO

const byResult = groupByResult(normalizedRecords);
const exitosas = byResult.exitosas.length;

// Nueva tasa empresarial
const tasaSeguimientosValidos = 
  total > 0 ? (totalSeguimientosValidos / total) * 100 : 0;
```

**Objeto de retorno ampliado:**
```javascript
return {
  total,
  exitosas,
  fallidas,
  sinIdentificar,
  seguimientosValidos: totalSeguimientosValidos,  // ⭐ NUEVO
  validFollowups: validFollowups,                 // ⭐ NUEVO (array completo)
  tasaExito: parseFloat(tasaExito.toFixed(2)),
  tasaSeguimientosValidos: parseFloat(tasaSeguimientosValidos.toFixed(2)), // ⭐ NUEVO
  // ...resto de métricas
};
```

### 4. `src/components/historial/HistorialSeguimientos.jsx`

**Cambio:** Uso de `isValidCall()` en lugar de comparación directa

```javascript
// ANTES (línea 193)
const isSuccessful = record.resultado === 'exitosa';

// DESPUÉS
import { isValidCall } from '../../utils/dataNormalizer';

const isSuccessful = isValidCall(record);
```

### 5. `src/stores/useCallStore.js`

**Cambio:** Lógica ampliada en `processCallData()`

```javascript
// ANTES
const isSuccessful = (
  result === 'Llamado exitoso' || 
  result === 'exitoso' || 
  result === 'Exitoso'
) && duration > 0;

// DESPUÉS
import { normalizeCallDirection } from '../utils/dataNormalizer';

const tipoLlamada = call.tipo_llamada || 
                   call.callDirection || 
                   call.tipoLlamada || 
                   call.direction || '';
const normalizedDirection = normalizeCallDirection(tipoLlamada);

const isSuccessful = (
  // Política 1: Saliente exitosa
  (normalizedDirection === 'saliente' && 
   (result === 'Llamado exitoso' || result === 'exitoso' || result === 'Exitoso') && 
   duration > 0)
  ||
  // Política 2: Entrante (siempre válida)
  (normalizedDirection === 'entrante')
);
```

---

## 🧪 Casos de Prueba

### Caso 1: Llamada Saliente Exitosa (Lógica Existente)

**Input:**
```javascript
{
  beneficiario: "Juan Pérez",
  telefono: "912345678",
  fecha: "2025-11-10",
  resultado: "Llamado exitoso",
  tipo_llamada: "saliente",
  duracion: 120
}
```

**Output esperado:**
```javascript
{
  beneficiaryName: "Juan Pérez",
  phone: "912345678",
  fecha: "2025-11-10",
  resultado: "exitosa",
  callDirection: "saliente",
  isValidFollowup: true,  // ✅ VÁLIDO
  isSuccessful: true
}
```

**Estado en Historial:** 🟢 Al día (si es reciente)

---

### Caso 2: Llamada Saliente Fallida (Sin Cambios)

**Input:**
```javascript
{
  beneficiario: "María González",
  telefono: "987654321",
  fecha: "2025-11-08",
  resultado: "No contesta",
  tipo_llamada: "saliente",
  duracion: 0
}
```

**Output esperado:**
```javascript
{
  beneficiaryName: "María González",
  phone: "987654321",
  fecha: "2025-11-08",
  resultado: "fallida",
  callDirection: "saliente",
  isValidFollowup: false,  // ❌ NO VÁLIDO
  isSuccessful: false
}
```

**Estado en Historial:** Depende del último seguimiento **válido** previo

---

### Caso 3: Llamada Entrante (NUEVA LÓGICA) ⭐

**Input:**
```javascript
{
  beneficiario: "Carlos Muñoz",
  telefono: "956789012",
  fecha: "2025-11-13",
  resultado: "Llamada fallida",  // ⚠️ Incluso fallida
  tipo_llamada: "entrante",
  duracion: 0
}
```

**Output esperado:**
```javascript
{
  beneficiaryName: "Carlos Muñoz",
  phone: "956789012",
  fecha: "2025-11-13",
  resultado: "fallida",           // Clasificación de resultado (sin cambio)
  callDirection: "entrante",
  isValidFollowup: true,           // ✅ VÁLIDO (nueva política)
  isSuccessful: true               // ✅ Considerado exitoso (seguimiento válido)
}
```

**Estado en Historial:** 🟢 Al día (seguimiento válido reciente)

---

### Caso 4: Registro Sin Tipo de Llamada (Retrocompatibilidad)

**Input:**
```javascript
{
  beneficiario: "Ana Torres",
  telefono: "945678901",
  fecha: "2025-10-20",
  resultado: "Exitoso"
  // ⚠️ Sin campo tipo_llamada
}
```

**Output esperado:**
```javascript
{
  beneficiaryName: "Ana Torres",
  phone: "945678901",
  fecha: "2025-10-20",
  resultado: "exitosa",
  callDirection: "saliente",      // ⭐ Default para retrocompatibilidad
  isValidFollowup: true,          // ✅ VÁLIDO (saliente exitosa)
  isSuccessful: true
}
```

**Estado en Historial:** Depende de cuándo fue (> 20 días = 🟡 Pendiente)

---

### Caso 5: Beneficiario con Historial Mixto

**Historial:**
```javascript
[
  { fecha: "2025-11-13", tipo_llamada: "entrante", resultado: "fallida" },     // -0 días ✅
  { fecha: "2025-11-05", tipo_llamada: "saliente", resultado: "No contesta" }, // -8 días ❌
  { fecha: "2025-10-28", tipo_llamada: "saliente", resultado: "Exitoso" },     // -16 días ✅
  { fecha: "2025-10-01", tipo_llamada: "entrante", resultado: "exitosa" }      // -43 días ✅
]
```

**Análisis:**
- **Seguimientos válidos:** 3 (entrante hoy, saliente exitosa hace 16 días, entrante hace 43 días)
- **Último seguimiento válido:** HOY (llamada entrante)
- **Estado:** 🟢 **AL DÍA**

**ANTES (sin nueva lógica):**
- Seguimientos válidos: 1 (solo saliente exitosa hace 16 días)
- Estado: 🟡 Pendiente

**MEJORA:** Ahora refleja que el beneficiario intentó contactar hoy.

---

## 📊 Impacto en Métricas

### Métricas Añadidas

| Métrica | Descripción | Cálculo |
|---------|-------------|---------|
| `seguimientosValidos` | Total de seguimientos válidos | `count(isValidCall = true)` |
| `tasaSeguimientosValidos` | % de llamadas que son seguimientos válidos | `(válidos / total) * 100` |
| `validFollowups` | Array completo de registros válidos | `filter(isValidCall)` |

### Métricas Mantenidas (Sin Cambio)

| Métrica | Descripción | Observación |
|---------|-------------|-------------|
| `total` | Total de registros | Sin cambio |
| `exitosas` | Registros con resultado='exitosa' | Sin cambio (clasificación de resultado) |
| `fallidas` | Registros con resultado='fallida' | Sin cambio |
| `tasaExito` | % de exitosas sobre total | Sin cambio (es diferente a `tasaSeguimientosValidos`) |

**⚠️ Importante:** `tasaExito` (basada en resultado) y `tasaSeguimientosValidos` (basada en política empresarial) son métricas **diferentes** y **complementarias**.

---

## 🔍 Ejemplo de Flujo Completo

### 1. Carga de Archivo Excel

Usuario carga `llamadas_noviembre.xlsx` con la siguiente estructura:

| Beneficiario | Teléfono | Fecha | Resultado | Tipo Llamada | Duración |
|--------------|----------|-------|-----------|--------------|----------|
| Juan Pérez | 912345678 | 10/11/2025 | Llamado exitoso | Saliente | 120 |
| María González | 987654321 | 08/11/2025 | No contesta | Saliente | 0 |
| Carlos Muñoz | 956789012 | 13/11/2025 | Llamada fallida | Entrante | 0 |
| Ana Torres | 945678901 | 20/10/2025 | Exitoso | (vacío) | 180 |

### 2. Procesamiento (excelProcessor.js)

```javascript
// Detecta columna "Tipo Llamada" → mapea a 'tipoLlamada'
// Normaliza valores:
// - "Entrante" → "entrante"
// - "Saliente" → "saliente"
// - (vacío) → "saliente" (default)
```

### 3. Normalización (dataNormalizer.js)

```javascript
// Para cada registro:
normalizeRecord({
  beneficiario: "Carlos Muñoz",
  telefono: "956789012",
  fecha: "13/11/2025",
  resultado: "Llamada fallida",
  tipoLlamada: "entrante",
  duracion: 0
});

// Retorna:
{
  beneficiaryName: "Carlos Muñoz",
  phone: "956789012",
  fecha: "2025-11-13",
  resultado: "fallida",
  callDirection: "entrante",
  isValidFollowup: isValidCall(this) // ✅ true
}
```

### 4. Cálculo de Métricas (metricsEngine.js)

```javascript
const validFollowups = getValidFollowups(normalizedRecords);
// Retorna: [Juan, Carlos, Ana] (3 de 4)
// María NO es válida (saliente fallida)

const tasaSeguimientosValidos = (3 / 4) * 100; // 75%
```

### 5. Visualización (HistorialSeguimientos.jsx)

```javascript
// Para cada beneficiario, calcula último seguimiento válido:

// Juan Pérez:
// - Última válida: 10/11/2025 (3 días) → 🟢 AL DÍA

// María González:
// - Sin seguimientos válidos → 🔴 URGENTE

// Carlos Muñoz:
// - Última válida: 13/11/2025 (hoy) → 🟢 AL DÍA

// Ana Torres:
// - Última válida: 20/10/2025 (24 días) → 🟡 PENDIENTE
```

---

## 🚀 Despliegue y Migración

### Compatibilidad

✅ **Retrocompatible:** Registros sin campo `tipo_llamada` se asumen como `'saliente'` (comportamiento anterior).

✅ **Sin migración de datos:** No requiere actualización de registros existentes en Firestore.

✅ **Gradual:** Nuevos archivos Excel con columna de tipo ya serán procesados correctamente.

### Validación Post-Despliegue

1. **Verificar procesamiento de Excel:**
   - Cargar archivo con columna "Tipo Llamada"
   - Confirmar que se detecta correctamente

2. **Verificar Historial:**
   - Buscar beneficiario con llamada entrante reciente
   - Confirmar que aparece 🟢 "Al día"

3. **Verificar métricas:**
   - Dashboard debe mostrar `seguimientosValidos` en consola
   - Comparar con `exitosas` (debería ser ≥)

---

## 📈 Métricas de Calidad del Código

- **Archivos modificados:** 5
- **Líneas añadidas:** ~180
- **Líneas eliminadas:** ~15
- **Funciones nuevas:** 3
- **Cobertura de tests:** Pendiente (próxima fase)
- **Tiempo de compilación:** Sin impacto (<1s adicional)
- **Performance:** Sin degradación (operaciones O(n) lineales)

---

## 🔮 Próximos Pasos

### Fase 6.2 (Propuesta)

- [ ] Añadir tests unitarios para `isValidCall()`
- [ ] Añadir tests de integración para flujo completo
- [ ] Crear visualización diferenciada de entrantes vs salientes en dashboard
- [ ] Añadir filtro "Solo entrantes" / "Solo salientes" en Historial
- [ ] Exportar métricas desagregadas a PDF de Auditoría

### Fase 7 (Propuesta)

- [ ] Implementar alertas automáticas para beneficiarios urgentes
- [ ] Dashboard ejecutivo con KPIs de seguimientos
- [ ] Integración con sistema de notificaciones

---

## 📞 Soporte

Para dudas o problemas relacionados con esta actualización:

- **Email:** soporte@centralteleoperadores.cl
- **Slack:** #canal-desarrollo
- **Documentación:** `/docs/FASE_6.1_LOGICA_SEGUIMIENTOS.md`

---

## 📝 Changelog

### [6.1.0] - 2025-11-13

#### Añadido
- Nueva función `isValidCall()` para validación de seguimientos
- Nueva función `normalizeCallDirection()` para normalizar tipo de llamada
- Nueva función `getValidFollowups()` para filtrado de seguimientos válidos
- Nuevo campo `callDirection` en registros normalizados
- Nuevo campo `isValidFollowup` en registros normalizados
- Nueva métrica `seguimientosValidos` en metricsEngine
- Nueva métrica `tasaSeguimientosValidos` en metricsEngine
- Mapeo de columna `tipoLlamada` en excelProcessor
- Logging detallado para llamadas entrantes

#### Modificado
- Lógica de `isSuccessful` en useCallStore para incluir entrantes
- Lógica de clasificación en HistorialSeguimientos para usar `isValidCall()`
- Función `normalizeRecord()` para incluir dirección de llamada

#### Mantenido
- Clasificación de resultados (exitosa/fallida/sin identificar)
- Estructura de métricas existente
- Compatibilidad con datos legacy
- Performance del sistema

---

**Documento generado automáticamente**  
**Central Teleoperadores v6.1.0**  
**© 2025 - Todos los derechos reservados**
