# Inicializador de Firestore - Sistema de Métricas

Este script reemplaza```bash
# Carga inicial con reset
node src/scripts/initializeFirestore.cjs --reset --file=llamadas_enero.xlsx

# Actualización con datos nuevos
node src/scripts/initializeFirestore.cjs --file=llamadas_febrero.xlsx

# Carga completa con datos raw
node src/scripts/initializeFirestore.cjs --file=datos_completos.xlsx --saveRaw
``` Functions para usuarios en plan gratuito de Firebase. Procesa archivos Excel, calcula métricas y las guarda en Firestore localmente.

## 🚀 Inicio Rápido

### 1. Preparar Credenciales de Firebase

Necesitas un Service Account Key de Firebase:

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Selecciona tu proyecto `centralteleoperadores`
3. Ve a **Configuración del Proyecto** → **Cuentas de Servicio**
4. Haz clic en **"Generar nueva clave privada"**
5. Guarda el archivo como `serviceAccountKey.json` en la raíz del proyecto

### 2. Preparar Datos

Coloca tu archivo Excel con los datos de llamadas en `./data/llamadas.xlsx` o especifica otra ruta.

**Formato esperado del Excel:**
- Columnas requeridas: `fecha`, `teleoperadora`, `beneficiario`, `telefono`, `duracion`, `exitosa`, `motivo`
- Formatos alternativos también son soportados (date, operator, client, phone, success, etc.)

### 3. Ejecutar el Script

```bash
# Usando npm scripts (recomendado)
npm run init-firestore              # Ejecutar con archivo por defecto
npm run init-firestore:help         # Ver ayuda completa
npm run init-firestore:reset        # Limpiar datos existentes

# O directamente con node
node src/scripts/initializeFirestore.cjs
node src/scripts/initializeFirestore.cjs --file=mi_archivo.xlsx
node src/scripts/initializeFirestore.cjs --reset
node src/scripts/initializeFirestore.cjs --help
```

## 📊 ¿Qué hace el script?

### Procesamiento de Datos
1. **Lee el archivo Excel** y normaliza las columnas
2. **Limpia los datos** (fechas, teléfonos, valores booleanos)
3. **Calcula campos adicionales** (hora, día de semana, mes)

### Cálculo de Métricas
1. **Métricas Globales**: Total de llamadas, tasa de éxito, promedios
2. **Métricas por Teleoperadora**: Rendimiento individual, distribuciones
3. **Métricas de Beneficiarios**: Estados (Al día, Pendiente, Urgente)

### Almacenamiento en Firestore
```
📁 Colecciones creadas:
├── metricas_globales/current
├── metricas_teleoperadoras/[nombre_operadora]
├── metricas_beneficiarios/[nombre_beneficiario]
├── metricas_no_asignados/summary
└── datos_llamadas/[id_llamada] (opcional)
```

## 🎯 Opciones Avanzadas

### Argumentos Disponibles

| Argumento | Descripción | Ejemplo |
|-----------|-------------|---------|
| `--help` | Mostrar ayuda | `--help` |
| `--file=RUTA` | Archivo Excel personalizado | `--file=datos.xlsx` |
| `--reset` | Limpiar colecciones existentes | `--reset` |
| `--saveRaw` | Guardar datos raw | `--saveRaw` |
| `--serviceAccount=RUTA` | Service Account personalizado | `--serviceAccount=key.json` |

### Ejemplos de Uso

```bash
# Carga inicial con reset
  node src/scripts/initializeFirestore.cjs [opciones]

# Actualización con datos nuevos
node src/scripts/initializeFirestore.js --file=llamadas_febrero.xlsx

# Carga completa con datos raw
node src/scripts/initializeFirestore.js --file=datos_completos.xlsx --saveRaw
```

## 🏥 Reglas de Negocio

### Estados de Beneficiarios
- **Al día**: Última llamada hace ≤ 15 días
- **Pendiente**: Última llamada hace 16-30 días  
- **Urgente**: Última llamada hace > 30 días

### Procesamiento por Lotes
- Máximo 500 documentos por lote (límite de Firestore)
- Procesamiento automático de archivos grandes
- Progreso detallado en consola

## 🔧 Solución de Problemas

### Error: "Service Account Key not found"
```bash
# Opción 1: Usar Firebase CLI
firebase login
export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"

# Opción 2: Especificar ruta
node src/scripts/initializeFirestore.cjs --serviceAccount=mi_key.json
```

### Error: "Excel file not found"
```bash
# Verificar que el archivo existe
ls ./data/llamadas.xlsx

# O especificar ruta completa
node src/scripts/initializeFirestore.cjs --file="C:/ruta/completa/archivo.xlsx"
```

### Error: "Permission denied"
- Verifica que el Service Account tiene permisos de **Editor** o **Propietario**
- Asegúrate de que Firestore esté habilitado en tu proyecto

## 📈 Salida del Script

### Información Mostrada
```
🚀 INICIALIZADOR DE FIRESTORE - SISTEMA DE MÉTRICAS
   Central Teleoperadores v1.0.0
======================================================================

📊 Leyendo archivo Excel: ./data/llamadas.xlsx
✅ Excel leído: 1,250 filas encontradas

🧹 Limpiando y normalizando datos...
✅ Datos limpiados: 1,247 filas válidas

📊 Calculando métricas globales...
✅ Métricas globales calculadas:
   - Total llamadas: 1,247
   - Llamadas exitosas: 892 (71.5%)
   - Beneficiarios únicos: 445
   - Teleoperadoras activas: 8

💾 Guardando en Firestore...
✅ Lote 1/3 guardado (500/1247 documentos)
✅ Lote 2/3 guardado (1000/1247 documentos)
✅ Lote 3/3 guardado (1247/1247 documentos)

🎉 PROCESO COMPLETADO EXITOSAMENTE
==================================================
📊 Total llamadas procesadas: 1,247
👥 Teleoperadoras: 8
🏥 Beneficiarios: 445
✅ Tasa de éxito global: 71.5%
==================================================
```

## 🔄 Integración con la App Web

Una vez ejecutado el script:

1. **La app web automáticamente detectará** los datos reales en Firestore
2. **Se desactivará el modo demo** y mostrará métricas reales
3. **Todos los dashboards** tendrán datos actualizados
4. **Las métricas se actualizarán** en tiempo real

## 🛠️ Desarrollo y Testing

### Funciones Exportadas
El script exporta funciones para testing:
```javascript
const {
  cleanData,
  calculateGlobalMetrics,
  calculateOperatorMetrics,
  parseDate,
  cleanPhone
} = require('./src/scripts/initializeFirestore.js');
```

### Modo de Desarrollo
```bash
# Ver datos sin guardarlos
node -e "
const script = require('./src/scripts/initializeFirestore.js');
const XLSX = require('xlsx');
const data = XLSX.utils.sheet_to_json(XLSX.readFile('./data/llamadas.xlsx'));
console.log(script.calculateGlobalMetrics(script.cleanData(data)));
"
```

## 📝 Notas Importantes

- ✅ Compatible con Excel (.xlsx, .xls)
- ✅ Maneja múltiples formatos de fecha
- ✅ Normaliza nombres de columnas automáticamente
- ✅ Procesamiento por lotes eficiente
- ✅ Colores en consola para mejor UX
- ✅ Validación exhaustiva de datos
- ✅ Cálculo de métricas complejas
- ⚠️ Requiere Node.js v14 o superior
- ⚠️ Service Account Key necesario
- ⚠️ Conexión a internet requerida

## 🆘 Soporte

Si encuentras problemas:
1. Ejecuta `npm run init-firestore:help` o `node src/scripts/initializeFirestore.cjs --help`
2. Revisa los logs detallados en consola
3. Verifica permisos de Firebase
4. Consulta la documentación de Firebase Admin SDK

¡Listo! Tu sistema de métricas ahora funcionará con datos reales sin necesidad de Cloud Functions. 🎉