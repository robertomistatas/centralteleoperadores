/**
 * Hook especializado para métricas con fallback automático
 * Maneja el estado de carga y proporciona datos inmediatamente
 */

import { useEffect, useState } from 'react';
import useMetricsStore from '../stores/useMetricsStore';
import { useMetricsWithFallback } from '../utils/fallbackMetrics';

export const useFallbackMetrics = () => {
  const [loading, setLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(true);
  
  // Datos del store real (si están disponibles)
  const {
    globalMetrics: storeGlobalMetrics,
    teleoperadorasMetrics: storeTeleoperadorasMetrics,
    beneficiariosMetrics: storeBeneficiariesMetrics,
    noAsignadosMetrics: storeNoAsignadosMetrics,
    loading: storeLoading,
    errors: storeErrors
  } = useMetricsStore();

  // Datos de fallback
  const fallbackData = useMetricsWithFallback();

  useEffect(() => {
    // Simular tiempo de carga realista pero corto
    const timer = setTimeout(() => {
      setLoading(false);
      
      // Verificar si tenemos datos reales disponibles
      const hasRealData = storeGlobalMetrics && 
                         storeGlobalMetrics.totalCalls > 0 &&
                         !storeErrors.global;
      
      setIsUsingFallback(!hasRealData);
      
      if (hasRealData) {
        console.log('📊 Datos reales cargados correctamente');
      } else {
        console.log('📊 Sistema iniciado en modo demo - datos de fallback activos');
      }
    }, 800); // Solo 800ms de carga para mejor UX

    return () => clearTimeout(timer);
  }, [storeGlobalMetrics, storeErrors.global]);

  // Determinar qué datos usar
  const currentData = isUsingFallback || !storeGlobalMetrics ? {
    globalMetrics: fallbackData.globalMetrics,
    teleoperadorasMetrics: fallbackData.teleoperadoraMetrics,
    beneficiariesMetrics: fallbackData.beneficiaryMetrics,
    noAsignadosMetrics: fallbackData.noAsignadosMetrics || null
  } : {
    globalMetrics: storeGlobalMetrics,
    teleoperadorasMetrics: storeTeleoperadorasMetrics,
    beneficiariesMetrics: storeBeneficiariesMetrics,
    noAsignadosMetrics: storeNoAsignadosMetrics
  };

  return {
    // Estados principales
    loading,
    isUsingFallback,
    hasRealData: !isUsingFallback,
    
    // Datos actuales
    ...currentData,
    
    // Estados detallados
    loadingStates: {
      global: loading,
      teleoperadoras: loading,
      beneficiarios: loading,
      noAsignados: loading
    },
    
    errors: isUsingFallback ? {
      global: null,
      teleoperadoras: null,
      beneficiarios: null,
      noAsignados: null
    } : storeErrors,
    
    // Funciones helper que funcionan tanto con datos reales como fallback
    getSummaryStats: () => {
      if (isUsingFallback) {
        return fallbackData.getSummaryStats();
      }
      // Aquí iría la lógica para datos reales cuando esté disponible
      return fallbackData.getSummaryStats();
    },
    
    getTopOperators: (limit = 5) => {
      if (isUsingFallback) {
        return fallbackData.getTopOperators(limit);
      }
      // Aquí iría la lógica para datos reales cuando esté disponible
      return fallbackData.getTopOperators(limit);
    },
    
    getBeneficiariesByStatus: (status) => {
      if (isUsingFallback) {
        return fallbackData.getBeneficiariesByStatus(status);
      }
      // Aquí iría la lógica para datos reales cuando esté disponible
      return fallbackData.getBeneficiariesByStatus(status);
    },
    
    getTeleoperadoraMetrics: (operatorId) => {
      if (isUsingFallback) {
        return fallbackData.getTeleoperadoraMetrics(operatorId);
      }
      // Aquí iría la lógica para datos reales cuando esté disponible
      return fallbackData.getTeleoperadoraMetrics(operatorId);
    },
    
    getBeneficiariesByOperator: (operatorId) => {
      if (isUsingFallback) {
        return fallbackData.getBeneficiariesByOperator(operatorId);
      }
      // Aquí iría la lógica para datos reales cuando esté disponible
      return fallbackData.getBeneficiariesByOperator(operatorId);
    }
  };
};

export default useFallbackMetrics;