/**
 * chartUtils.js
 * Utilidades para configuración de gráficos con Recharts
 * 
 * FASE 2 - TAREA 6: Configuración de colores y helpers para visualizaciones
 * 
 * Exporta:
 * - chartColors: Paleta de colores consistente
 * - formatChartTooltip: Formateador de tooltips
 * - getChartConfig: Configuración base para gráficos
 */

/**
 * Paleta de colores para gráficos
 * Consistente con el diseño de la aplicación
 */
export const chartColors = {
  // Colores principales
  primary: '#3B82F6',    // Azul
  secondary: '#8B5CF6',  // Púrpura
  success: '#10B981',    // Verde
  warning: '#F59E0B',    // Amarillo
  error: '#EF4444',      // Rojo
  info: '#06B6D4',       // Cyan

  // Colores adicionales para variedad
  purple: '#A855F7',
  pink: '#EC4899',
  indigo: '#6366F1',
  teal: '#14B8A6',
  orange: '#F97316',
  lime: '#84CC16',

  // Grises
  gray: '#6B7280',
  darkGray: '#374151',
  lightGray: '#D1D5DB'
};

/**
 * Array de colores para uso en loops (PieChart, BarChart múltiple)
 */
export const chartColorArray = [
  chartColors.success,
  chartColors.error,
  chartColors.warning,
  chartColors.primary,
  chartColors.info,
  chartColors.purple,
  chartColors.pink,
  chartColors.orange,
  chartColors.teal,
  chartColors.lime
];

/**
 * Formatea valores para tooltips
 * 
 * @param {number} value - Valor a formatear
 * @param {string} type - Tipo de valor ('number', 'percent', 'currency')
 * @returns {string} Valor formateado
 */
export const formatChartValue = (value, type = 'number') => {
  if (value === null || value === undefined) return 'N/A';

  switch (type) {
    case 'percent':
      return `${parseFloat(value).toFixed(1)}%`;
    
    case 'currency':
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP'
      }).format(value);
    
    case 'number':
    default:
      return new Intl.NumberFormat('es-CL').format(value);
  }
};

/**
 * Formatea datos para tooltip personalizado
 * Retorna un objeto con los datos formateados (no JSX)
 * 
 * @param {Object} props - Props del tooltip de Recharts
 * @returns {Object|null} Datos formateados para el tooltip
 */
export const formatChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return {
    active: true,
    label,
    items: payload.map((entry) => ({
      name: entry.name,
      value: formatChartValue(entry.value, entry.unit || 'number'),
      color: entry.color
    }))
  };
};

/**
 * Configuración base para gráficos Recharts
 * Reduce código repetitivo
 */
export const getChartConfig = (type = 'default') => {
  const baseConfig = {
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
    animationDuration: 800
  };

  const configs = {
    default: baseConfig,
    
    pie: {
      ...baseConfig,
      innerRadius: 0,
      outerRadius: 80,
      paddingAngle: 2
    },

    bar: {
      ...baseConfig,
      barSize: 30,
      barGap: 4
    },

    line: {
      ...baseConfig,
      strokeWidth: 2,
      dot: { r: 4 },
      activeDot: { r: 6 }
    }
  };

  return configs[type] || baseConfig;
};

/**
 * Genera datos de ejemplo para testing de gráficos
 * Útil para desarrollo sin datos reales
 */
export const generateMockChartData = (type = 'pie') => {
  switch (type) {
    case 'pie':
      return [
        { name: 'Exitosas', value: 400, color: chartColors.success },
        { name: 'Fallidas', value: 100, color: chartColors.error },
        { name: 'Sin identificar', value: 50, color: chartColors.warning }
      ];

    case 'bar':
      return [
        { name: 'María González', tasa: 85.5, total: 120 },
        { name: 'Juan Pérez', tasa: 82.3, total: 95 },
        { name: 'Ana López', tasa: 78.9, total: 110 },
        { name: 'Carlos Ruiz', tasa: 75.4, total: 88 },
        { name: 'Sofía Castro', tasa: 72.1, total: 102 }
      ];

    case 'line':
      const dates = [];
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push({
          fecha: date.toISOString().split('T')[0],
          llamadas: Math.floor(Math.random() * 50) + 50,
          exitosas: Math.floor(Math.random() * 40) + 30
        });
      }
      return dates;

    default:
      return [];
  }
};

/**
 * Calcula el color según un porcentaje (para indicadores)
 * 
 * @param {number} percentage - Porcentaje (0-100)
 * @returns {string} Color hex
 */
export const getColorByPercentage = (percentage) => {
  if (percentage >= 80) return chartColors.success;
  if (percentage >= 60) return chartColors.warning;
  return chartColors.error;
};

/**
 * Trunca nombres largos para etiquetas de gráficos
 * 
 * @param {string} name - Nombre a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Nombre truncado
 */
export const truncateLabel = (name, maxLength = 20) => {
  if (!name) return '';
  if (name.length <= maxLength) return name;
  return `${name.substring(0, maxLength - 3)}...`;
};

/**
 * Exporta configuración de grid para CartesianGrid
 */
export const gridConfig = {
  strokeDasharray: '3 3',
  stroke: chartColors.lightGray,
  opacity: 0.5
};

/**
 * Exporta configuración de ejes
 */
export const axisConfig = {
  tick: { fill: chartColors.gray, fontSize: 12 },
  tickLine: { stroke: chartColors.lightGray },
  axisLine: { stroke: chartColors.gray }
};

/**
 * Exporta configuración de leyenda
 */
export const legendConfig = {
  wrapperStyle: {
    paddingTop: '20px'
  },
  iconType: 'circle',
  iconSize: 10
};

export default {
  chartColors,
  chartColorArray,
  formatChartValue,
  formatChartTooltip,
  getChartConfig,
  generateMockChartData,
  getColorByPercentage,
  truncateLabel,
  gridConfig,
  axisConfig,
  legendConfig
};
