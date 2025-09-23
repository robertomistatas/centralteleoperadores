import React from 'react';
import { motion } from 'framer-motion';

/**
 * Componente de tarjeta para mostrar métricas KPI
 * Usado en el dashboard de seguimientos periódicos
 */
const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue', 
  subtitle, 
  percentage = null,
  trend = null 
}) => {
  // Configuración de colores por tipo - ESTILO LIMPIO Y PROFESIONAL
  const colorConfig = {
    blue: {
      bg: 'bg-white',
      border: 'border-gray-200',
      icon: 'text-gray-600',
      text: 'text-gray-900',
      accent: 'text-gray-600',
      shadow: 'shadow-sm hover:shadow-md'
    },
    green: {
      bg: 'bg-white',
      border: 'border-gray-200',
      icon: 'text-teal-600',
      text: 'text-gray-900',
      accent: 'text-teal-600',
      shadow: 'shadow-sm hover:shadow-md'
    },
    yellow: {
      bg: 'bg-white',
      border: 'border-gray-200',
      icon: 'text-orange-500',
      text: 'text-gray-900',
      accent: 'text-orange-500',
      shadow: 'shadow-sm hover:shadow-md'
    },
    red: {
      bg: 'bg-white',
      border: 'border-gray-200',
      icon: 'text-red-500',
      text: 'text-gray-900',
      accent: 'text-red-500',
      shadow: 'shadow-sm hover:shadow-md'
    }
  };

  const colors = colorConfig[color] || colorConfig.blue;

  return (
    <motion.div
      className={`
        ${colors.bg} ${colors.border} ${colors.shadow}
        border rounded-xl p-6 transition-all duration-200
        cursor-default
      `}
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
    >
      {/* Header con icono y título */}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg bg-gray-50`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
        
        {/* Indicador de tendencia (opcional) */}
        {trend && (
          <div className={`text-xs font-medium ${
            trend > 0 ? 'text-teal-600' : trend < 0 ? 'text-red-500' : 'text-gray-500'
          }`}>
            {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}%
          </div>
        )}
      </div>

      {/* Valor principal */}
      <div className="mb-2">
        <motion.div 
          className={`text-3xl font-bold ${colors.text}`}
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 200,
            delay: 0.1
          }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </motion.div>
        
        {/* Porcentaje (si se proporciona) */}
        {percentage !== null && (
          <motion.div 
            className={`text-sm font-medium ${colors.accent} mt-1`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {percentage}% del total
          </motion.div>
        )}
      </div>

      {/* Título y subtítulo */}
      <div>
        <h3 className={`text-sm font-medium text-gray-600 mb-1`}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-500 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Barra de progreso visual (opcional) */}
      {percentage !== null && percentage <= 100 && (
        <div className="mt-4">
          <div className="w-full bg-gray-100 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full ${
                color === 'green' ? 'bg-teal-500' :
                color === 'yellow' ? 'bg-orange-500' :
                color === 'red' ? 'bg-red-500' :
                'bg-gray-400'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ 
                duration: 1, 
                ease: "easeOut",
                delay: 0.3
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MetricCard;
