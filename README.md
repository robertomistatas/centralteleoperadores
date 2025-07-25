# Mistatas - Seguimiento de llamadas

## 📋 Descripción
Sistema completo para el seguimiento y gestión de llamadas de teleasistencia. Plataforma integral para la administración de teleoperadores, asignación de beneficiarios y análisis de llamadas.

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

**Versión:** 2.0.0 - Sistema Completo
**Fecha:** Julio 2025
**Estado:** ✅ Todos los módulos principales completados

### ✅ Últimas Correcciones Implementadas
- **Campo "Teleoperadora":** Ahora muestra nombres reales (no "Llamado exitoso")
- **Fechas chilenas:** Parsing correcto para formato DD-MM-YYYY
- **Sara Esquivel Miranda:** Fecha corregida de 12-07-2025 → 24-07-2025
- **Hermes Eduardo Valbuena Romero:** Teleoperadora de "No Asignado" → "Antonella Valdebenito"
- **Búsqueda de beneficiarios:** Nueva funcionalidad en módulo Asignaciones
- **Conexión fluida:** Entre módulos Asignaciones ↔ Historial de Seguimientos

### 🚀 Deploy Automático
- **GitHub Actions:** Deploy automático en cada push a main
- **GitHub Pages:** Aplicación disponible en tiempo real
- **Build optimizado:** Vite + React para máximo rendimiento

## 👥 Contribución

Mistatas - Seguimiento de llamadas © 2025

---

**Demo en vivo:** [GitHub Pages](https://robertomistatas.github.io/centralteleoperadores/)
