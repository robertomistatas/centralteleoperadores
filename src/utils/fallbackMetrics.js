/**
 * Proveedor de métricas de fallback
 * Proporciona datos simulados cuando Firestore no está disponible
 */

// Datos simulados para dashboards
export const createFallbackMetrics = () => {
  // Solo log una vez al inicializar
  if (!window._fallbackMetricsLogged) {
    console.log('📊 Usando métricas de fallback (sin conexión a Firestore)');
    window._fallbackMetricsLogged = true;
  }
  
  return {
    // Métricas globales simuladas
    globalMetrics: {
      totalCalls: 150,
      successfulCalls: 120,
      failedCalls: 30,
      uniqueBeneficiaries: 85,
      uniqueOperators: 4,
      averageDuration: 180, // 3 minutos
      successRate: 80,
      lastUpdated: new Date(),
      // Distribución por día de la semana
      dayDistribution: {
        monday: 28,
        tuesday: 32,
        wednesday: 25,
        thursday: 30,
        friday: 20,
        saturday: 10,
        sunday: 5
      },
      // Distribución por hora del día
      hourDistribution: {
        '8': 5,
        '9': 12,
        '10': 18,
        '11': 22,
        '12': 15,
        '13': 8,
        '14': 20,
        '15': 25,
        '16': 18,
        '17': 7
      }
    },
    
    // Métricas por operadora simuladas
    teleoperadoraMetrics: [
      {
        operatorName: 'Daniela Carmona',
        totalCalls: 45,
        successfulCalls: 38,
        failedCalls: 7,
        successRate: 84.4,
        averageDuration: 165,
        uniqueBeneficiaries: 28
      },
      {
        operatorName: 'Antonella Valdebenito',
        totalCalls: 38,
        successfulCalls: 30,
        failedCalls: 8,
        successRate: 78.9,
        averageDuration: 195,
        uniqueBeneficiaries: 25
      },
      {
        operatorName: 'Karol Aguayo',
        totalCalls: 42,
        successfulCalls: 35,
        failedCalls: 7,
        successRate: 83.3,
        averageDuration: 175,
        uniqueBeneficiaries: 30
      },
      {
        operatorName: 'Javiera Reyes Alvarado',
        totalCalls: 25,
        successfulCalls: 17,
        failedCalls: 8,
        successRate: 68.0,
        averageDuration: 190,
        uniqueBeneficiaries: 18
      }
    ],
    
    // Estados de beneficiarios simulados
    beneficiaryMetrics: {
      alDia: 45,
      pendiente: 25,
      urgente: 15,
      total: 85
    }
  };
};

/**
 * Hook para usar métricas con fallback automático
 */
export const useMetricsWithFallback = () => {
  const fallbackData = createFallbackMetrics();
  
  return {
    ...fallbackData,
    isUsingFallback: true,
    status: 'ready', // Cambiar a 'ready' para indicar que está listo inmediatamente
    loading: {
      global: false,
      teleoperadoras: false,
      beneficiarios: false,
      noAsignados: false
    },
    errors: {
      global: null,
      teleoperadoras: null,
      beneficiarios: null,
      noAsignados: null
    },
    
    // Funciones helper que coinciden con useMetricsStore
    getSummaryStats: () => ({
      totalCalls: fallbackData.globalMetrics.totalCalls,
      successfulCalls: fallbackData.globalMetrics.successfulCalls,
      failedCalls: fallbackData.globalMetrics.failedCalls,
      uniqueBeneficiaries: fallbackData.globalMetrics.uniqueBeneficiaries,
      uniqueOperators: fallbackData.globalMetrics.uniqueOperators,
      averageDuration: fallbackData.globalMetrics.averageDuration,
      successRate: fallbackData.globalMetrics.successRate,
      beneficiariesByStatus: {
        'Al día': fallbackData.beneficiaryMetrics.alDia,
        'Pendiente': fallbackData.beneficiaryMetrics.pendiente,
        'Urgente': fallbackData.beneficiaryMetrics.urgente
      }
    }),
    
    getTopOperators: (limit = 5) => {
      return fallbackData.teleoperadoraMetrics
        .sort((a, b) => b.totalCalls - a.totalCalls)
        .slice(0, limit)
        .map((op, index) => ({
          rank: index + 1,
          operatorName: op.operatorName,
          totalCalls: op.totalCalls,
          successRate: op.successRate,
          uniqueBeneficiaries: op.uniqueBeneficiaries
        }));
    },
    
    getBeneficiariesByStatus: (status) => {
      const mockBeneficiaries = [];
      const count = fallbackData.beneficiaryMetrics[status?.toLowerCase().replace(' ', '')] || 0;
      
      for (let i = 0; i < Math.min(count, 10); i++) {
        mockBeneficiaries.push({
          id: `beneficiary-${status}-${i}`,
          nombreOriginal: `Beneficiario ${status} ${i + 1}`,
          status: status,
          lastCall: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          successRate: Math.floor(Math.random() * 30) + 70
        });
      }
      
      return mockBeneficiaries;
    },
    
    getTeleoperadoraMetrics: (operatorId) => {
      const operator = fallbackData.teleoperadoraMetrics.find(op => 
        op.operatorName.toLowerCase().includes(operatorId?.toLowerCase() || '')
      ) || fallbackData.teleoperadoraMetrics[0];
      
      return {
        ...operator,
        nombreOriginal: operator.operatorName,
        totalDuration: operator.averageDuration * operator.totalCalls,
        lastUpdated: new Date().toISOString(),
        calls: Array.from({ length: Math.min(operator.totalCalls, 20) }, (_, i) => ({
          id: `call-${operator.operatorName}-${i}`,
          fecha: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          beneficiario: `Beneficiario ${i + 1}`,
          duracion: Math.floor(Math.random() * 300) + 60,
          exitosa: Math.random() > 0.2,
          observaciones: `Llamada simulada ${i + 1}`
        }))
      };
    },
    
    getBeneficiariesByOperator: (operatorId) => {
      const operator = fallbackData.teleoperadoraMetrics.find(op => 
        op.operatorName.toLowerCase().includes(operatorId?.toLowerCase() || '')
      ) || fallbackData.teleoperadoraMetrics[0];
      
      return Array.from({ length: Math.min(operator.uniqueBeneficiaries, 15) }, (_, i) => ({
        id: `beneficiary-op-${operatorId}-${i}`,
        nombreOriginal: `Beneficiario ${operator.operatorName} ${i + 1}`,
        status: ['Al día', 'Pendiente', 'Urgente'][Math.floor(Math.random() * 3)],
        successRate: Math.floor(Math.random() * 30) + 70,
        lastCall: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }));
    }
  };
};

export default { createFallbackMetrics, useMetricsWithFallback };