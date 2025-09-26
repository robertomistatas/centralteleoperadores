/**
 * Store de Zustand para métricas en tiempo real
 * Se conecta a Firestore usando onSnapshot para actualizaciones automáticas
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { db } from '../firebase'; // Ajustar ruta según tu configuración
import { 
  doc, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  where 
} from 'firebase/firestore';

const useMetricsStore = create(
  subscribeWithSelector((set, get) => ({
    // Estado inicial
    globalMetrics: null,
    teleoperadorasMetrics: {},
    beneficiariosMetrics: {},
    noAsignadosMetrics: null,
    
    // Estados de carga
    loading: {
      global: true,
      teleoperadoras: true,
      beneficiarios: true,
      noAsignados: true
    },
    
    // Errores
    errors: {
      global: null,
      teleoperadoras: null,
      beneficiarios: null,
      noAsignados: null
    },
    
    // Listeners activos (para cleanup)
    unsubscribers: [],
    
    /**
     * Inicializar listeners de Firestore (temporalmente deshabilitado)
     */
    initializeListeners: () => {
      console.log('⚠️ Listeners de métricas deshabilitados hasta que la BD esté inicializada');
      return; // Salir temprano para evitar errores
      
      const state = get();
      
      // Limpiar listeners existentes
      state.cleanup();
      
      const unsubscribers = [];
      
      // 1. Listener para métricas globales
      try {
        const globalRef = doc(db, 'metrics', 'global');
        const unsubGlobal = onSnapshot(
          globalRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              // Convertir timestamps de Firestore a Date
              if (data.lastUpdated?.toDate) {
                data.lastUpdated = data.lastUpdated.toDate();
              }
              
              set((state) => ({
                globalMetrics: data,
                loading: { ...state.loading, global: false },
                errors: { ...state.errors, global: null }
              }));
            } else {
              set((state) => ({
                globalMetrics: null,
                loading: { ...state.loading, global: false },
                errors: { ...state.errors, global: 'No hay datos globales disponibles' }
              }));
            }
          },
          (error) => {
            console.error('Error en listener de métricas globales:', error);
            set((state) => ({
              loading: { ...state.loading, global: false },
              errors: { ...state.errors, global: error.message }
            }));
          }
        );
        unsubscribers.push(unsubGlobal);
      } catch (error) {
        console.error('Error configurando listener global:', error);
        set((state) => ({
          loading: { ...state.loading, global: false },
          errors: { ...state.errors, global: error.message }
        }));
      }
      
      // 2. Listener para métricas de teleoperadoras
      try {
        const operatorsRef = collection(db, 'metrics', 'teleoperadoras', 'operators');
        const unsubOperators = onSnapshot(
          operatorsRef,
          (snapshot) => {
            const operatorsData = {};
            
            snapshot.docs.forEach((doc) => {
              const data = doc.data();
              
              // Convertir timestamps
              if (data.lastUpdated?.toDate) {
                data.lastUpdated = data.lastUpdated.toDate();
              }
              
              // Convertir fechas en las llamadas
              if (data.calls && Array.isArray(data.calls)) {
                data.calls = data.calls.map(call => ({
                  ...call,
                  fecha: call.fecha?.toDate ? call.fecha.toDate() : call.fecha
                }));
              }
              
              operatorsData[doc.id] = data;
            });
            
            set((state) => ({
              teleoperadorasMetrics: operatorsData,
              loading: { ...state.loading, teleoperadoras: false },
              errors: { ...state.errors, teleoperadoras: null }
            }));
          },
          (error) => {
            console.error('Error en listener de teleoperadoras:', error);
            set((state) => ({
              loading: { ...state.loading, teleoperadoras: false },
              errors: { ...state.errors, teleoperadoras: error.message }
            }));
          }
        );
        unsubscribers.push(unsubOperators);
      } catch (error) {
        console.error('Error configurando listener teleoperadoras:', error);
        set((state) => ({
          loading: { ...state.loading, teleoperadoras: false },
          errors: { ...state.errors, teleoperadoras: error.message }
        }));
      }
      
      // 3. Listener para métricas de beneficiarios (limitado para performance)
      try {
        const beneficiariesRef = query(
          collection(db, 'metrics', 'beneficiarios', 'beneficiaries'),
          orderBy('lastUpdated', 'desc'),
          limit(100) // Limitar para mejor performance
        );
        
        const unsubBeneficiaries = onSnapshot(
          beneficiariesRef,
          (snapshot) => {
            const beneficiariesData = {};
            
            snapshot.docs.forEach((doc) => {
              const data = doc.data();
              
              // Convertir timestamps
              if (data.lastUpdated?.toDate) {
                data.lastUpdated = data.lastUpdated.toDate();
              }
              if (data.lastCall?.toDate) {
                data.lastCall = data.lastCall.toDate();
              }
              if (data.lastSuccessfulCall?.toDate) {
                data.lastSuccessfulCall = data.lastSuccessfulCall.toDate();
              }
              
              // Convertir fechas en las llamadas
              if (data.calls && Array.isArray(data.calls)) {
                data.calls = data.calls.map(call => ({
                  ...call,
                  fecha: call.fecha?.toDate ? call.fecha.toDate() : call.fecha
                }));
              }
              
              beneficiariesData[doc.id] = data;
            });
            
            set((state) => ({
              beneficiariosMetrics: beneficiariesData,
              loading: { ...state.loading, beneficiarios: false },
              errors: { ...state.errors, beneficiarios: null }
            }));
          },
          (error) => {
            console.error('Error en listener de beneficiarios:', error);
            set((state) => ({
              loading: { ...state.loading, beneficiarios: false },
              errors: { ...state.errors, beneficiarios: error.message }
            }));
          }
        );
        unsubscribers.push(unsubBeneficiaries);
      } catch (error) {
        console.error('Error configurando listener beneficiarios:', error);
        set((state) => ({
          loading: { ...state.loading, beneficiarios: false },
          errors: { ...state.errors, beneficiarios: error.message }
        }));
      }
      
      // 4. Listener para beneficiarios no asignados
      try {
        const noAsignadosRef = doc(db, 'metrics', 'noAsignados');
        const unsubNoAsignados = onSnapshot(
          noAsignadosRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              
              // Convertir timestamps
              if (data.lastUpdated?.toDate) {
                data.lastUpdated = data.lastUpdated.toDate();
              }
              
              // Convertir fechas en beneficiarios
              if (data.beneficiaries && Array.isArray(data.beneficiaries)) {
                data.beneficiaries = data.beneficiaries.map(beneficiary => ({
                  ...beneficiary,
                  lastCall: beneficiary.lastCall?.toDate ? beneficiary.lastCall.toDate() : beneficiary.lastCall
                }));
              }
              
              set((state) => ({
                noAsignadosMetrics: data,
                loading: { ...state.loading, noAsignados: false },
                errors: { ...state.errors, noAsignados: null }
              }));
            } else {
              set((state) => ({
                noAsignadosMetrics: null,
                loading: { ...state.loading, noAsignados: false },
                errors: { ...state.errors, noAsignados: null }
              }));
            }
          },
          (error) => {
            console.error('Error en listener de no asignados:', error);
            set((state) => ({
              loading: { ...state.loading, noAsignados: false },
              errors: { ...state.errors, noAsignados: error.message }
            }));
          }
        );
        unsubscribers.push(unsubNoAsignados);
      } catch (error) {
        console.error('Error configurando listener no asignados:', error);
        set((state) => ({
          loading: { ...state.loading, noAsignados: false },
          errors: { ...state.errors, noAsignados: error.message }
        }));
      }
      
      // Guardar unsubscribers
      set({ unsubscribers });
    },
    
    /**
     * Limpiar todos los listeners
     */
    cleanup: () => {
      const { unsubscribers } = get();
      unsubscribers.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      set({ unsubscribers: [] });
    },
    
    /**
     * Obtener métricas de una teleoperadora específica
     */
    getTeleoperadoraMetrics: (operatorId) => {
      const { teleoperadorasMetrics } = get();
      return teleoperadorasMetrics[operatorId] || null;
    },
    
    /**
     * Obtener métricas de un beneficiario específico
     */
    getBeneficiaryMetrics: (beneficiaryId) => {
      const { beneficiariosMetrics } = get();
      return beneficiariosMetrics[beneficiaryId] || null;
    },
    
    /**
     * Obtener lista de teleoperadoras ordenada por performance
     */
    getTopOperators: (limit = 10) => {
      const { teleoperadorasMetrics } = get();
      
      return Object.values(teleoperadorasMetrics)
        .sort((a, b) => {
          // Ordenar por tasa de éxito y luego por total de llamadas
          if (b.successRate !== a.successRate) {
            return b.successRate - a.successRate;
          }
          return b.totalCalls - a.totalCalls;
        })
        .slice(0, limit);
    },
    
    /**
     * Obtener beneficiarios por estado
     */
    getBeneficiariesByStatus: (status) => {
      const { beneficiariosMetrics } = get();
      
      return Object.values(beneficiariosMetrics)
        .filter(beneficiary => beneficiary.status === status)
        .sort((a, b) => {
          // Ordenar por fecha de última llamada (más reciente primero)
          if (!a.lastCall && !b.lastCall) return 0;
          if (!a.lastCall) return 1;
          if (!b.lastCall) return -1;
          return new Date(b.lastCall) - new Date(a.lastCall);
        });
    },
    
    /**
     * Obtener estadísticas resumidas
     */
    getSummaryStats: () => {
      const { globalMetrics, teleoperadorasMetrics, beneficiariosMetrics, noAsignadosMetrics } = get();
      
      const totalOperators = Object.keys(teleoperadorasMetrics).length;
      const totalBeneficiaries = Object.keys(beneficiariosMetrics).length;
      
      // Contar beneficiarios por estado
      const beneficiariesByStatus = Object.values(beneficiariosMetrics).reduce((acc, beneficiary) => {
        acc[beneficiary.status] = (acc[beneficiary.status] || 0) + 1;
        return acc;
      }, {});
      
      return {
        totalCalls: globalMetrics?.totalCalls || 0,
        successRate: globalMetrics?.successRate || 0,
        totalOperators,
        totalBeneficiaries,
        beneficiariesByStatus,
        unassignedBeneficiaries: noAsignadosMetrics?.totalUnassigned || 0,
        lastUpdated: globalMetrics?.lastUpdated || null
      };
    },
    
    /**
     * Buscar beneficiarios
     */
    searchBeneficiaries: (searchTerm) => {
      const { beneficiariosMetrics } = get();
      
      if (!searchTerm || searchTerm.length < 2) {
        return Object.values(beneficiariosMetrics);
      }
      
      const normalizedSearch = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      return Object.values(beneficiariosMetrics).filter(beneficiary => {
        const normalizedName = beneficiary.nombreOriginal?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
        const phoneMatch = beneficiary.telefonos?.some(phone => phone.includes(searchTerm)) || false;
        
        return normalizedName.includes(normalizedSearch) || phoneMatch;
      });
    },
    
    /**
     * Filtrar beneficiarios por teleoperadora
     */
    getBeneficiariesByOperator: (operatorId) => {
      const { beneficiariosMetrics } = get();
      
      return Object.values(beneficiariosMetrics).filter(beneficiary => {
        return beneficiary.calls?.some(call => 
          call.teleoperadora?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 
          operatorId?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        );
      });
    }
  }))
);

export default useMetricsStore;