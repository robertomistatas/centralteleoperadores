# Central de Teleoperadores

## 📋 Descripción
WebApp para el seguimiento y gestión de llamadas de teleasistencia. Sistema completo para la administración de teleoperadores, asignación de beneficiarios y análisis de llamadas.

## ✨ Funcionalidades

### 🎯 Panel Principal (Dashboard)
- Métricas en tiempo real de llamadas totales, exitosas y fallidas
- Estadísticas de beneficiarios y teleoperadores
- Cumplimiento de protocolo y seguimientos pendientes
- Análisis detallado por teleoperadora

### 👥 Gestión de Asignaciones
- **Crear y gestionar teleoperadores** con información completa
- **Carga masiva de beneficiarios** mediante archivos Excel
- **Formato específico:** Nombre | Teléfono(s) | Comuna
- **Soporte para múltiples teléfonos** por beneficiario
- **Validación automática** de números telefónicos (9 dígitos)

### 📞 Registro de Llamadas
- Importación de registros de llamadas desde Excel
- Análisis automático de resultados
- Clasificación por evento (entrante/saliente)
- Métricas de duración y efectividad

### 📊 Historial de Seguimientos
- Clasificación por estado: Al día, Pendiente, Urgente
- Filtros avanzados por teleoperadora y beneficiario
- Seguimiento de frecuencia de contacto
- Alertas para casos urgentes

## 🛠️ Tecnologías

- **Frontend:** React 18 + Vite
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide React
- **Excel:** SheetJS (XLSX)
- **Desarrollo:** ESLint + PostCSS

## 🚀 Desarrollo

### Instalación
```bash
npm install
```

### Servidor de desarrollo
```bash
npm run dev
```

### Build para producción
```bash
npm run build
```

### Deploy
```bash
npm run deploy
```

## 📂 Estructura del Proyecto
```
src/
├── App.jsx          # Componente principal
├── main.jsx         # Punto de entrada
└── index.css        # Estilos globales
```

## 🔧 Configuración

### Formato Excel para Asignaciones
- **Columna A:** Nombre del beneficiario
- **Columna B:** Teléfono(s) - separados por |, - o espacios (9 dígitos cada uno)
- **Columna C:** Comuna

### Formato Excel para Registro de Llamadas
- Importación automática con análisis de campos estándar
- Procesamiento de duración, resultado y observaciones

## 📈 Estado del Proyecto

**Versión:** 1.0.0 - Checkpoint inicial
**Fecha:** Julio 2025
**Estado:** ✅ Módulo de Asignaciones completado

### Próximas funcionalidades
- Persistencia en base de datos
- Exportación de reportes
- Notificaciones automáticas
- Dashboard avanzado con gráficos

## 👥 Contribución

Central de Teleasistencia © 2025

---

**Demo en vivo:** [GitHub Pages](https://robertomistatas.github.io/centralteleoperadores/)
