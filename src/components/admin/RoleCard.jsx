import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Crown, Users, Award } from 'lucide-react';

const RoleCard = ({ role, userCount }) => {
  const iconMap = {
    super_admin: Crown,
    admin: Shield,
    auditor: Award,
    teleoperadora: Users
  };

  const colorMap = {
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200'
  };

  const Icon = iconMap[role.id] || Users;
  const colorClass = colorMap[role.color] || colorMap.blue;

  return (
    <motion.div
      className={`${colorClass} border-2 rounded-xl p-6 hover:shadow-lg transition-shadow`}
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClass} ring-1 ring-black/5`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{userCount}</div>
          <div className="text-xs opacity-75">usuario{userCount !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-2">{role.name}</h3>
        <p className="text-sm opacity-75 mb-4">{role.description}</p>
        
        <div className="space-y-2">
          <div className="text-xs font-medium opacity-90">Permisos:</div>
          <div className="flex flex-wrap gap-1">
            {role.permissions.slice(0, 3).map(permission => (
              <span 
                key={permission}
                className="text-xs px-2 py-1 bg-white/50 dark:bg-black/20 rounded-full"
              >
                {permission === 'all' ? 'Todos' : permission}
              </span>
            ))}
            {role.permissions.length > 3 && (
              <span className="text-xs px-2 py-1 bg-white/50 dark:bg-black/20 rounded-full">
                +{role.permissions.length - 3} más
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-current/20">
          <div className="flex justify-between text-xs">
            <span>Nivel de acceso</span>
            <span className="font-medium">{role.level}/100</span>
          </div>
          <div className="mt-2 bg-white/30 dark:bg-black/30 rounded-full h-2">
            <motion.div
              className="bg-current rounded-full h-2"
              initial={{ width: 0 }}
              animate={{ width: `${role.level}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RoleCard;
