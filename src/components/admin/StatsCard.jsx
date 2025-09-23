import React from 'react';
import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon: Icon, color = 'blue' }) => {
  const colorConfig = {
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      icon: 'text-purple-600 dark:text-purple-400',
      text: 'text-purple-900 dark:text-purple-100'
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      text: 'text-blue-900 dark:text-blue-100'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      text: 'text-green-900 dark:text-green-100'
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      icon: 'text-orange-600 dark:text-orange-400',
      text: 'text-orange-900 dark:text-orange-100'
    }
  };

  const colors = colorConfig[color] || colorConfig.blue;

  return (
    <motion.div
      className={`${colors.bg} ${colors.border} border-2 rounded-xl p-6 hover:shadow-lg transition-shadow`}
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <motion.div 
            className={`text-3xl font-bold ${colors.text}`}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </motion.div>
          <h3 className={`text-sm font-medium ${colors.text} mt-1`}>
            {title}
          </h3>
        </div>
        
        <div className={`p-3 rounded-lg ${colors.bg} ring-1 ring-black/5`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;
