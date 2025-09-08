# Módulo Beneficiarios Base

## 📋 Descripción

El módulo **Beneficiarios Base** es un componente fundamental de la aplicación de Seguimientos Telefónicos que centraliza la gestión de todos los beneficiarios del sistema. Su función principal es servir como la fuente única de verdad para la información de beneficiarios y permitir que otros módulos (Asignaciones, Seguimientos, Auditoría) validen y conecten datos de manera consistente.

## 🎯 Funcionalidades Principales

### 1. Gestión de Archivos Excel
- **Subida de Excel**: Interface drag & drop para cargar archivos Excel con beneficiarios
- **Vista previa**: Validación y preview de datos antes de confirmar la carga
- **Formato estándar**: Soporte para el formato específico chileno de beneficiarios
- **Validación automática**: Detección de números inválidos (000000000) y datos faltantes
- **Barra de progreso**: Feedback visual durante el proceso de carga

### 2. Normalización de Datos
- **Nombres**: Normalización de tildes, espacios y capitalización
- **Teléfonos**: Limpieza y validación de números telefónicos
- **Direcciones**: Estandarización de formato de direcciones
- **Duplicados**: Detección inteligente de registros duplicados

### 3. Validación y Consistencia
- **Cruce de datos**: Comparación automática con módulo de Asignaciones
- **Beneficiarios sin asignar**: Identificación de beneficiarios sin teleoperadora
- **Alertas**: Notificaciones de inconsistencias entre módulos
- **Reportes**: Estadísticas de cobertura y calidad de datos

### 4. Interface de Usuario
- **Dashboard**: Resumen visual con estadísticas clave
- **Lista completa**: Visualización paginada con búsqueda y filtros
- **Búsqueda avanzada**: Por nombre, teléfono o dirección
- **Acciones rápidas**: Edición, eliminación y asignación de beneficiarios

## 📁 Estructura del Módulo

```
src/
├── components/
│   ├── BeneficiariosBase.jsx          # Componente principal
│   └── beneficiaries/
│       ├── ExcelUpload.jsx            # Subida de archivos Excel
│       ├── BeneficiaryList.jsx        # Lista de beneficiarios
│       └── UnassignedBeneficiaries.jsx # Beneficiarios sin asignar
├── services/
│   └── beneficiaryService.js          # Servicios de Firestore
├── stores/
│   └── useBeneficiaryStore.js         # Store de Zustand
└── utils/
    └── stringNormalization.js         # Utilidades de normalización
```

## 🔧 Servicios y API

### BeneficiaryService
```javascript
// Cargar beneficiarios desde Excel
await beneficiaryService.uploadBeneficiaries(data, userId, onProgress);

// Obtener todos los beneficiarios
const beneficiaries = await beneficiaryService.getAllBeneficiaries(userId);

// Buscar beneficiarios
const results = await beneficiaryService.searchBeneficiaries(searchTerm);

// Validar existencia
const exists = await beneficiaryService.validateBeneficiaryExists(name, phone);
```

### Store de Zustand
```javascript
// Cargar beneficiarios
const { loadBeneficiaries, beneficiaries, stats } = useBeneficiaryStore();

// Subir Excel
await uploadBeneficiaries(data, userId);

// Encontrar no asignados
const unassigned = findUnassignedBeneficiaries(assignments);
```

## 📊 Formato de Excel Esperado

El módulo espera archivos Excel con la siguiente estructura:

| Columna | Campo | Descripción | Requerido |
|---------|-------|-------------|-----------|
| A | Nombre | Nombre completo del beneficiario | ✅ Sí |
| B | Fono | Teléfono principal | ⚠️ Al menos uno |
| C | Sim | Teléfono secundario | ⚠️ Al menos uno |
| D | Dirección | Dirección completa | ✅ Sí |
| E | App Sim | Tercer número de contacto | ❌ No |

### Ejemplo de datos válidos:
```
Nombre                    | Fono      | Sim       | Dirección           | App Sim
LUZMIRA DEL CARMEN       | 999399124 | 000000000 | PASAJE GRACIELA 52  | 999399124
NILDA ELIANA BARRAZA     | 222694209 | 920614098 | AVENIDA IRARRAZAVAL | 0
```

### Validaciones automáticas:
- ✅ Números `000000000` son ignorados automáticamente
- ✅ Se requiere al menos un teléfono válido por beneficiario
- ✅ Nombres y direcciones no pueden estar vacíos
- ✅ Se normalizan tildes y espacios automáticamente

## 🔒 Permisos y Seguridad

### Roles de Usuario
- **Administradores**: Acceso completo al módulo
- **Teleoperadoras**: Sin acceso directo (consultas en segundo plano)

### Reglas de Firestore
```javascript
// Beneficiarios - solo el creador puede acceder
match /beneficiaries/{document} {
  allow read, write: if request.auth != null && resource.data.creadoPor == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.creadoPor == request.auth.uid;
}
```

## 🚀 Casos de Uso

### 1. Carga inicial de beneficiarios
```javascript
// Usuario administrador sube Excel con 1000+ beneficiarios
// Sistema procesa, valida y almacena en Firestore
// Genera estadísticas y reportes de consistencia
```

### 2. Validación de asignaciones
```javascript
// El módulo detecta automáticamente beneficiarios sin teleoperadora
// Alerta a administradores sobre inconsistencias
// Permite asignación rápida desde la interfaz
```

### 3. Búsqueda y gestión diaria
```javascript
// Teleoperadoras buscan beneficiarios por nombre/teléfono
// Sistema valida existencia y devuelve datos normalizados
// Garantiza consistencia entre módulos
```

## 🔄 Integración con Otros Módulos

### Módulo de Asignaciones
- Valida que beneficiarios asignados existan en la base
- Detecta beneficiarios sin asignar automáticamente
- Permite asignación directa desde el dashboard

### Módulo de Seguimientos
- Valida existencia de beneficiarios antes de registrar llamadas
- Normaliza nombres y teléfonos para búsquedas consistentes
- Proporciona datos completos para el historial

### Módulo de Auditoría
- Cruza datos entre beneficiarios base y llamadas registradas
- Detecta llamadas a números no registrados
- Genera reportes de cobertura y calidad

## 📈 Métricas y Estadísticas

El módulo proporciona las siguientes métricas en tiempo real:

- **Total de beneficiarios**: Cantidad total en la base
- **Con teléfono válido**: Beneficiarios con al menos un número
- **Sin teléfono**: Beneficiarios sin números válidos
- **Sin asignar**: Beneficiarios sin teleoperadora asignada
- **Datos incompletos**: Registros con información faltante

## 🛠️ Configuración y Deploy

### Variables de entorno requeridas:
```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_PROJECT_ID=centralteleoperadores
```

### Índices de Firestore requeridos:
```json
{
  "collectionGroup": "beneficiaries",
  "fields": [
    {"fieldPath": "creadoPor", "order": "ASCENDING"},
    {"fieldPath": "creadoEn", "order": "DESCENDING"}
  ]
}
```

### Comandos de deploy:
```bash
# Aplicar reglas de Firestore
firebase deploy --only firestore:rules

# Crear índices
firebase deploy --only firestore:indexes

# Deploy completo
npm run build && firebase deploy
```

## 🐛 Troubleshooting

### Problemas comunes:

1. **Error de permisos en Firestore**
   - Verificar reglas de seguridad
   - Confirmar autenticación del usuario
   - Revisar índices existentes

2. **Excel no se procesa correctamente**
   - Validar formato de columnas
   - Verificar codificación del archivo
   - Revisar tamaño máximo (10MB)

3. **Búsquedas lentas**
   - Confirmar índices de Firestore
   - Optimizar filtros de búsqueda
   - Considerar paginación

### Logs útiles:
```javascript
// Debug de carga de beneficiarios
console.log('Beneficiarios cargados:', beneficiaries.length);

// Debug de normalización
console.log('Texto normalizado:', normalizeString(input));

// Debug de coincidencias
console.log('Coincidencia encontrada:', findBeneficiaryMatch(beneficiary, list));
```

## 📝 Próximas Mejoras

- [ ] **Importación desde otras fuentes**: CSV, Google Sheets
- [ ] **Exportación de datos**: PDF, Excel con filtros aplicados
- [ ] **Historial de cambios**: Auditoría de modificaciones por usuario
- [ ] **Integración con API externa**: Validación de direcciones
- [ ] **Notificaciones automáticas**: Alertas por email/SMS
- [ ] **Dashboard analytics**: Gráficos avanzados con Chart.js

---

## 👨‍💻 Desarrollo

### Tecnologías utilizadas:
- **React 18** con Hooks
- **Zustand** para gestión de estado
- **Tailwind CSS** + **shadcn/ui** para estilos
- **Framer Motion** para animaciones
- **Firebase Firestore** para persistencia
- **XLSX** para procesamiento de Excel

### Estilo de código:
- Componentes funcionales con React Hooks
- Custom hooks para lógica reutilizable
- Comentarios JSDoc en funciones principales
- Manejo de errores con try/catch
- Validación de props con PropTypes
