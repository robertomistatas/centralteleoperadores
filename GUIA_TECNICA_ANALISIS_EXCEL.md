# 🔧 Guía Técnica: Sistema de Análisis de Excel

## 📚 Arquitectura del Sistema

### 🏗️ Estructura de Capas

```
┌─────────────────────────────────────────┐
│          CAPA DE PRESENTACIÓN           │
│    (ExcelUploader.jsx)                  │
│    - UI/UX                              │
│    - Interacciones del usuario          │
│    - Drag & Drop                        │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│          CAPA DE ESTADO                 │
│    (useExcelStore.js)                   │
│    - State management con Zustand       │
│    - Lógica de negocio                  │
│    - Caching y historial                │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│          CAPA DE SERVICIOS              │
│    (excelProcessor.js)                  │
│    - Procesamiento de archivos          │
│    - Normalización de datos             │
│    - Validaciones                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│          CAPA DE DATOS                  │
│    (SheetJS, Crypto API)                │
│    - Lectura de Excel                   │
│    - Hash generation                    │
└─────────────────────────────────────────┘
```

---

## 🎨 Componente ExcelUploader

### Props
Ninguna (usa hooks internos)

### Hooks Utilizados

#### 1. **useState**
```javascript
const [isDragging, setIsDragging] = useState(false);
const [showPreview, setShowPreview] = useState(false);
const [currentPage, setCurrentPage] = useState(1);
const [filterClasificacion, setFilterClasificacion] = useState('all');
```

#### 2. **useRef**
```javascript
const fileInputRef = useRef(null);
```

#### 3. **useExcelStore** (Zustand)
```javascript
const {
  file,
  fullData,
  resumen,
  columnMapping,
  warnings,
  loading,
  loadingStage,
  error,
  // ... métodos
} = useExcelStore();
```

#### 4. **useUIStore** (Zustand)
```javascript
const { showSuccess, showError, showWarning, showInfo } = useUIStore();
```

### Funciones Principales

#### `handleFileSelect(selectedFile)`
```javascript
const handleFileSelect = useCallback(async (selectedFile) => {
  if (!selectedFile) return;
  
  try {
    // 1. Limpiar estado anterior
    clear();
    
    // 2. Validar archivo
    const validation = validateExcelFile(selectedFile);
    if (!validation.valid) {
      showError(validation.error);
      return;
    }
    
    // 3. Generar hash
    setLoading(true, 'reading');
    const hash = await generateFileHash(selectedFile);
    
    // 4. Verificar duplicados
    const alreadyProcessed = isFileProcessed(hash);
    if (alreadyProcessed) {
      showInfo('Archivo ya analizado');
    }
    
    // 5. Procesar archivo
    setLoading(true, 'processing');
    const result = await parseAndNormalizeExcel(selectedFile);
    
    // 6. Guardar resultados
    setLoading(true, 'analyzing');
    processAnalysisResult(result);
    
    // 7. Mostrar UI
    showSuccess('Archivo procesado');
    setShowPreview(true);
    
  } catch (err) {
    logger.error('Error procesando archivo', { error: err.message });
    setError(err.message);
    showError(`Error: ${err.message}`);
  }
}, [/* deps */]);
```

#### `renderProgressBar()`
```javascript
const renderProgressBar = () => {
  if (!loading) return null;
  
  const stages = {
    reading: { label: 'Leyendo archivo...', progress: 33 },
    processing: { label: 'Procesando datos...', progress: 66 },
    analyzing: { label: 'Analizando resultados...', progress: 90 }
  };
  
  const stage = stages[loadingStage] || { label: 'Cargando...', progress: 0 };
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div 
        className="bg-blue-600 h-3 rounded-full transition-all duration-500"
        style={{ width: `${stage.progress}%` }}
      >
        {stage.progress > 30 && `${stage.progress}%`}
      </div>
    </div>
  );
};
```

---

## 🗄️ Store: useExcelStore

### Estructura del Estado

```typescript
interface ExcelState {
  // Archivo
  file: File | null;
  fileHash: string | null;
  
  // Datos
  previewData: Array<Record<string, any>>;
  fullData: Array<Record<string, any>>;
  
  // Métricas
  resumen: {
    total: number;
    exitosas: number;
    fallidas: number;
    sinIdentificar: number;
    conTelefono: number;
    conFecha: number;
    conBeneficiario: number;
  };
  
  // Metadata
  columnMapping: Record<string, string>;
  warnings: Array<{
    type: string;
    message: string;
    details: string | string[];
  }>;
  metadata: {
    filename: string;
    filesize: number;
    processedAt: string;
    sheetName: string;
    originalColumns: string[];
  } | null;
  
  // UI
  loading: boolean;
  loadingStage: 'reading' | 'processing' | 'analyzing' | null;
  error: string | null;
  
  // Historial
  processedFiles: Array<{
    hash: string;
    filename: string;
    timestamp: string;
    resumen: ExcelState['resumen'];
  }>;
  
  // Config
  safeMode: boolean;
}
```

### Acciones (Methods)

#### Setters Básicos
```javascript
setFile(file, hash)
setPreviewData(data)
setFullData(data)
setResumen(resumen)
setColumnMapping(mapping)
setWarnings(warnings)
setMetadata(metadata)
setLoading(loading, stage)
setError(error)
```

#### Lógica de Análisis
```javascript
processAnalysisResult(result) {
  const { data, resumen, columnMapping, warnings, metadata } = result;
  
  set({
    fullData: data,
    previewData: data.slice(0, 20),
    resumen,
    columnMapping,
    warnings,
    metadata,
    loading: false,
    error: null
  });
  
  get().addToHistory();
}
```

#### Historial
```javascript
addToHistory() {
  const { file, fileHash, resumen, metadata, processedFiles } = get();
  
  const historyEntry = {
    hash: fileHash,
    filename: file.name,
    timestamp: new Date().toISOString(),
    resumen: { ...resumen },
    metadata
  };
  
  // Limitar a 10 entradas
  const newHistory = [historyEntry, ...processedFiles].slice(0, 10);
  set({ processedFiles: newHistory });
}

isFileProcessed(hash) {
  return get().processedFiles.find(f => f.hash === hash);
}
```

#### Utilidades
```javascript
getPaginatedData(page = 1, pageSize = 20) {
  const { fullData } = get();
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    data: fullData.slice(startIndex, endIndex),
    page,
    pageSize,
    totalPages: Math.ceil(fullData.length / pageSize),
    totalRows: fullData.length
  };
}

getFilteredData(clasificacion) {
  const { fullData } = get();
  
  if (!clasificacion || clasificacion === 'all') {
    return fullData;
  }
  
  return fullData.filter(row => row._clasificacion === clasificacion);
}

searchData(searchTerm) {
  const { fullData } = get();
  
  if (!searchTerm || searchTerm.trim() === '') {
    return fullData;
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  return fullData.filter(row => {
    return Object.values(row).some(value => {
      if (typeof value === 'string') {
        return value.toLowerCase().includes(term);
      }
      return false;
    });
  });
}
```

#### Estadísticas Computadas
```javascript
getSuccessRate() {
  const { resumen } = get();
  if (resumen.total === 0) return 0;
  return Math.round((resumen.exitosas / resumen.total) * 100);
}

getFailureRate() {
  const { resumen } = get();
  if (resumen.total === 0) return 0;
  return Math.round((resumen.fallidas / resumen.total) * 100);
}

getOperatorStats() {
  const { fullData } = get();
  const stats = {};
  
  fullData.forEach(row => {
    const operadora = row.operadora || 'Sin asignar';
    
    if (!stats[operadora]) {
      stats[operadora] = {
        total: 0,
        exitosas: 0,
        fallidas: 0,
        sinIdentificar: 0
      };
    }
    
    stats[operadora].total++;
    stats[operadora][row._clasificacion]++;
  });
  
  return stats;
}
```

---

## ⚙️ Servicio: excelProcessor

### Función Principal: `parseAndNormalizeExcel(file)`

```javascript
export async function parseAndNormalizeExcel(file) {
  logger.info('[excelProcessor] Iniciando análisis', { filename: file.name });
  
  try {
    // 1. Leer archivo
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { 
      type: 'array',
      cellDates: true
    });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // 2. Convertir a JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false,
      defval: '',
      blankrows: false
    });
    
    if (!rawData || rawData.length === 0) {
      throw new Error('El archivo está vacío');
    }
    
    // 3. Detectar columnas
    const firstRow = rawData[0];
    const originalColumns = Object.keys(firstRow);
    const columnMapping = {};
    const unmappedColumns = [];
    
    originalColumns.forEach(col => {
      const detected = detectColumnType(col);
      if (detected) {
        columnMapping[col] = detected;
      } else {
        unmappedColumns.push(col);
      }
    });
    
    // 4. Normalizar datos
    const normalizedData = rawData.map((row, index) => {
      const normalized = {
        _rowIndex: index + 2,
        _original: { ...row }
      };
      
      for (const [originalCol, normalizedCol] of Object.entries(columnMapping)) {
        let value = row[originalCol];
        
        switch (normalizedCol) {
          case 'telefono':
            normalized[normalizedCol] = normalizePhone(value);
            break;
          case 'fecha':
            normalized[normalizedCol] = normalizeDate(value);
            break;
          case 'duracion':
            normalized[normalizedCol] = value ? parseInt(value) || 0 : 0;
            break;
          default:
            normalized[normalizedCol] = value ? String(value).trim() : '';
        }
      }
      
      // Clasificar resultado
      normalized._clasificacion = normalized.resultado 
        ? classifyResult(normalized.resultado)
        : 'sin_identificar';
      
      return normalized;
    });
    
    // 5. Calcular resumen
    const resumen = {
      total: normalizedData.length,
      exitosas: normalizedData.filter(r => r._clasificacion === 'exitosa').length,
      fallidas: normalizedData.filter(r => r._clasificacion === 'fallida').length,
      sinIdentificar: normalizedData.filter(r => r._clasificacion === 'sin_identificar').length,
      conTelefono: normalizedData.filter(r => r.telefono && r.telefono.length > 0).length,
      conFecha: normalizedData.filter(r => r.fecha && r.fecha.length > 0).length,
      conBeneficiario: normalizedData.filter(r => r.beneficiario && r.beneficiario.length > 0).length
    };
    
    // 6. Generar warnings
    const warnings = [];
    
    if (unmappedColumns.length > 0) {
      warnings.push({
        type: 'unmapped_columns',
        message: `${unmappedColumns.length} columnas no reconocidas`,
        details: unmappedColumns
      });
    }
    
    if (resumen.sinIdentificar > resumen.total * 0.5) {
      warnings.push({
        type: 'high_unidentified',
        message: `${Math.round((resumen.sinIdentificar / resumen.total) * 100)}% sin clasificar`,
        details: 'Revise formato de columna "resultado"'
      });
    }
    
    logger.info('[excelProcessor] Análisis completado', { resumen, warnings: warnings.length });
    
    return {
      data: normalizedData,
      resumen,
      columnMapping,
      warnings,
      metadata: {
        filename: file.name,
        filesize: file.size,
        processedAt: new Date().toISOString(),
        sheetName: firstSheetName,
        originalColumns
      }
    };
    
  } catch (error) {
    logger.error('[excelProcessor] Error', { error: error.message });
    throw new Error(`Error al procesar archivo: ${error.message}`);
  }
}
```

### Funciones de Normalización

#### `normalizePhone(phone)`
```javascript
function normalizePhone(phone) {
  if (!phone) return '';
  
  // Limpiar
  let cleaned = String(phone)
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/\+56/g, '');
  
  // Validar formato chileno
  if (cleaned.match(/^9\d{8}$/)) {
    return cleaned; // 9 dígitos empezando con 9
  }
  
  if (cleaned.match(/^\d{8}$/)) {
    return cleaned; // 8 dígitos (fijo)
  }
  
  return cleaned;
}
```

#### `normalizeDate(dateValue)`
```javascript
function normalizeDate(dateValue) {
  if (!dateValue) return '';
  
  try {
    let date;
    
    // Formato chileno DD-MM-YYYY o DD/MM/YYYY
    if (typeof dateValue === 'string' && /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(dateValue)) {
      const parts = dateValue.split(/[-/]/);
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      date = new Date(year, month, day);
    }
    // Excel serial date
    else if (typeof dateValue === 'number') {
      date = new Date((dateValue - 25569) * 86400 * 1000);
    }
    // Estándar
    else {
      date = new Date(dateValue);
    }
    
    if (date && !isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return String(dateValue);
  } catch (error) {
    logger.warn('Error normalizando fecha', { dateValue, error: error.message });
    return String(dateValue);
  }
}
```

#### `classifyResult(resultado)`
```javascript
function classifyResult(resultado) {
  if (!resultado) return 'sin_identificar';
  
  const normalized = resultado.toLowerCase().trim();
  
  const successKeywords = [
    'exitosa', 'éxito', 'contactado', 'atendido', 
    'completado', 'respondió', 'success'
  ];
  
  const failedKeywords = [
    'no contesta', 'no respondió', 'fallida', 
    'ocupado', 'busy', 'apagado'
  ];
  
  if (successKeywords.some(keyword => normalized.includes(keyword))) {
    return 'exitosa';
  }
  
  if (failedKeywords.some(keyword => normalized.includes(keyword))) {
    return 'fallida';
  }
  
  return 'sin_identificar';
}
```

### Hash Generation

```javascript
export async function generateFileHash(file) {
  try {
    logger.info('[excelProcessor] Generando hash', { filename: file.name });
    
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    logger.info('[excelProcessor] Hash generado', { hash: hashHex.substring(0, 16) + '...' });
    return hashHex;
  } catch (error) {
    logger.error('[excelProcessor] Error generando hash', { error: error.message });
    throw new Error(`Error al generar hash: ${error.message}`);
  }
}
```

---

## 🔒 Modo Seguro

### Implementación

#### 1. **Variable de Entorno**
```properties
# .env
VITE_EXCEL_SAFE_MODE=true
```

#### 2. **Lectura en Store**
```javascript
// src/stores/useExcelStore.js
const initialState = {
  // ...
  safeMode: import.meta.env.VITE_EXCEL_SAFE_MODE !== 'false',
};
```

#### 3. **Validación en Componente**
```javascript
// src/components/excel/ExcelUploader.jsx
const safeMode = isSafeModeEnabled();

if (safeMode) {
  showInfo('🔒 Modo seguro activo – No se guardarán datos en Firestore');
}
```

#### 4. **Prevención de Escritura**
```javascript
// En futuras implementaciones
if (!safeMode) {
  // Solo entonces permitir escritura en Firestore
  await setDoc(doc(db, 'analysis', id), data);
}
```

---

## 🧪 Testing

### Unit Tests (Sugeridos)

```javascript
// excelProcessor.test.js
describe('excelProcessor', () => {
  describe('normalizePhone', () => {
    it('debería limpiar +56', () => {
      expect(normalizePhone('+56987654321')).toBe('987654321');
    });
    
    it('debería eliminar espacios y guiones', () => {
      expect(normalizePhone('9 8765-4321')).toBe('987654321');
    });
  });
  
  describe('normalizeDate', () => {
    it('debería convertir formato chileno', () => {
      expect(normalizeDate('14-10-2025')).toBe('2025-10-14');
    });
    
    it('debería manejar serial date de Excel', () => {
      expect(normalizeDate(45564)).toBe('2024-09-24');
    });
  });
  
  describe('classifyResult', () => {
    it('debería clasificar como exitosa', () => {
      expect(classifyResult('Llamada exitosa')).toBe('exitosa');
    });
    
    it('debería clasificar como fallida', () => {
      expect(classifyResult('No contesta')).toBe('fallida');
    });
  });
});
```

### Integration Tests

```javascript
// ExcelUploader.test.jsx
describe('ExcelUploader', () => {
  it('debería renderizar zona de carga', () => {
    render(<ExcelUploader />);
    expect(screen.getByText(/arrastra un archivo/i)).toBeInTheDocument();
  });
  
  it('debería mostrar error si archivo inválido', async () => {
    const { showError } = useUIStore.getState();
    const file = new File([''], 'test.txt', { type: 'text/plain' });
    
    await handleFileSelect(file);
    
    expect(showError).toHaveBeenCalledWith(
      expect.stringContaining('formato no válido')
    );
  });
});
```

---

## 🚀 Optimizaciones Futuras

### 1. **Web Workers**
```javascript
// excelWorker.js
self.addEventListener('message', async (e) => {
  const { file } = e.data;
  
  // Procesamiento pesado en worker
  const result = await parseAndNormalizeExcel(file);
  
  self.postMessage({ type: 'complete', result });
});

// En componente
const worker = new Worker('./excelWorker.js');
worker.postMessage({ file });
worker.onmessage = (e) => {
  if (e.data.type === 'complete') {
    processAnalysisResult(e.data.result);
  }
};
```

### 2. **Virtual Scrolling**
```javascript
// Para tablas grandes
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: fullData.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
});
```

### 3. **Caching con IndexedDB**
```javascript
// Persistir análisis en navegador
import { set, get } from 'idb-keyval';

// Guardar
await set(`analysis-${fileHash}`, {
  data: normalizedData,
  resumen,
  timestamp: Date.now()
});

// Recuperar
const cached = await get(`analysis-${fileHash}`);
if (cached && Date.now() - cached.timestamp < 86400000) {
  // Usar caché si tiene menos de 24h
  return cached;
}
```

---

## 📖 Glosario

- **SheetJS (xlsx)**: Librería para leer/escribir archivos Excel
- **Zustand**: Librería de state management minimalista
- **SHA-256**: Algoritmo de hash criptográfico
- **Idempotencia**: Propiedad de operaciones que producen el mismo resultado al repetirse
- **Normalización**: Proceso de convertir datos a formato estándar
- **Store**: Almacén centralizado de estado en Zustand
- **Modo seguro**: Configuración que previene escritura en base de datos

---

**Última actualización:** Octubre 14, 2025  
**Versión:** 1.0.0  
**Mantenedor:** GitHub Copilot
