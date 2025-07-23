import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Store para manejo de datos de la aplicación de auditoría
 * Gestiona operadores, asignaciones y configuraciones
 */
const useAppStore = create(
  persist(
    (set, get) => ({
      // Estado de operadores
      operators: [],
      operatorAssignments: {},
      
      // Estado de la aplicación
      activeTab: 'dashboard',
      isLoading: false,
      
      // Configuraciones
      settings: {
        autoRefresh: false,
        refreshInterval: 30000, // 30 segundos
        defaultView: 'dashboard'
      },

      // Acciones para operadores
      setOperators: (operators) => {
        set({ operators: operators || [] });
      },

      addOperator: (operator) => {
        set(state => ({
          operators: [...state.operators, operator]
        }));
      },

      updateOperator: (operatorId, updates) => {
        set(state => ({
          operators: state.operators.map(op => 
            op.id === operatorId ? { ...op, ...updates } : op
          )
        }));
      },

      removeOperator: (operatorId) => {
        set(state => ({
          operators: state.operators.filter(op => op.id !== operatorId),
          operatorAssignments: Object.fromEntries(
            Object.entries(state.operatorAssignments).filter(([id]) => id !== operatorId)
          )
        }));
      },

      // Acciones para asignaciones
      setOperatorAssignments: (assignments) => {
        set({ operatorAssignments: assignments || {} });
      },

      updateOperatorAssignments: (operatorId, assignments) => {
        set(state => ({
          operatorAssignments: {
            ...state.operatorAssignments,
            [operatorId]: assignments
          }
        }));
      },

      clearOperatorAssignments: (operatorId) => {
        set(state => {
          const newAssignments = { ...state.operatorAssignments };
          delete newAssignments[operatorId];
          return { operatorAssignments: newAssignments };
        });
      },

      // Acciones de navegación
      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      // Acciones de configuración
      updateSettings: (newSettings) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings }
        }));
      },

      // Getters útiles
      getOperatorById: (operatorId) => {
        const { operators } = get();
        return operators.find(op => op.id === operatorId) || null;
      },

      getOperatorAssignments: (operatorId) => {
        const { operatorAssignments } = get();
        return operatorAssignments[operatorId] || [];
      },

      getAllAssignments: () => {
        const { operatorAssignments, operators } = get();
        const allAssignments = [];
        
        Object.entries(operatorAssignments).forEach(([operatorId, assignments]) => {
          const operator = operators.find(op => op.id === operatorId);
          if (operator && assignments) {
            assignments.forEach(assignment => {
              allAssignments.push({
                id: assignment.id,
                operator: operator.name,
                beneficiary: assignment.beneficiary,
                phone: assignment.primaryPhone,
                commune: assignment.commune
              });
            });
          }
        });
        
        return allAssignments;
      },

      getTotalAssignments: () => {
        const { operatorAssignments } = get();
        return Object.values(operatorAssignments)
          .reduce((total, assignments) => total + (assignments?.length || 0), 0);
      },

      // Acciones de limpieza
      clearAllData: () => {
        set({
          operators: [],
          operatorAssignments: {},
          activeTab: 'dashboard'
        });
      }
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        operators: state.operators,
        operatorAssignments: state.operatorAssignments,
        settings: state.settings
      })
    }
  )
);

export default useAppStore;
