import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { operatorService, assignmentService } from '../firestoreService';

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
        
        console.log('🔍 getAllAssignments - operatorAssignments:', operatorAssignments);
        console.log('🔍 getAllAssignments - operators:', operators);
        
        Object.entries(operatorAssignments).forEach(([operatorId, assignments]) => {
          const operator = operators.find(op => op.id === operatorId);
          if (operator && assignments) {
            console.log(`📋 Procesando asignaciones para ${operator.name}:`, assignments.length);
            assignments.forEach(assignment => {
              const assignmentData = {
                id: assignment.id,
                operator: operator.name,           // ⭐ Campo correcto para operadora
                operatorName: operator.name,      // ⭐ Campo alternativo
                operatorEmail: operator.email,    // ⭐ Campo de email
                beneficiary: assignment.beneficiary,
                phone: assignment.primaryPhone,
                commune: assignment.commune
              };
              allAssignments.push(assignmentData);
              console.log('✅ Asignación agregada:', assignmentData);
            });
          }
        });
        
        console.log('📊 Total asignaciones devueltas:', allAssignments.length);
        return allAssignments;
      },

      // 🔍 Nueva función: Buscar asignaciones específicamente por email de teleoperadora
      getAssignmentsByEmail: (userEmail) => {
        const { operatorAssignments, operators } = get();
        const normalizedEmail = userEmail?.toLowerCase().trim();
        
        console.log('🔍 Buscando asignaciones para email:', normalizedEmail);
        console.log('🔍 Operadores disponibles:', operators.map(op => ({
          id: op.id,
          name: op.name,
          email: op.email
        })));
        
        // Buscar operador por email
        const matchingOperator = operators.find(op => {
          const opEmail = op.email?.toLowerCase().trim();
          const opName = op.name?.toLowerCase().trim();
          
          // Estrategias de matching
          const exactEmailMatch = opEmail === normalizedEmail;
          const nameInEmail = normalizedEmail.includes(opName?.split(' ')[0]) || normalizedEmail.includes(opName?.split(' ')[1]);
          const emailInName = opName?.includes(normalizedEmail.split('@')[0]);
          
          console.log(`🔍 Verificando operador ${op.name}:`, {
            opEmail,
            exactEmailMatch,
            nameInEmail,
            emailInName
          });
          
          return exactEmailMatch || nameInEmail || emailInName;
        });
        
        if (matchingOperator) {
          console.log('✅ Operador encontrado:', matchingOperator);
          const assignments = operatorAssignments[matchingOperator.id] || [];
          console.log('✅ Asignaciones encontradas:', assignments.length);
          
          return assignments.map(assignment => ({
            id: assignment.id,
            operator: matchingOperator.name,
            operatorName: matchingOperator.name,
            operatorEmail: matchingOperator.email,
            beneficiary: assignment.beneficiary,
            phone: assignment.primaryPhone,
            commune: assignment.commune
          }));
        } else {
          console.warn('❌ No se encontró operador para email:', normalizedEmail);
          return [];
        }
      },

      getTotalAssignments: () => {
        const { operatorAssignments } = get();
        return Object.values(operatorAssignments)
          .reduce((total, assignments) => total + (assignments?.length || 0), 0);
      },

      // 🔄 Funciones de carga desde Firebase (agregadas para corregir error)
      loadOperators: async () => {
        try {
          set({ isLoading: true });
          console.log('📥 Cargando operadores desde Firebase...');
          
          const operators = await operatorService.getAll();
          console.log('✅ Operadores cargados:', operators.length);
          
          set({ 
            operators: operators || [],
            isLoading: false
          });
          
          return operators;
        } catch (error) {
          console.error('❌ Error cargando operadores:', error);
          set({ isLoading: false });
          return []; // Retornar array vacío en caso de error
        }
      },

      // 🔥 NUEVA: Forzar recarga de operadores (para sincronización)
      reloadOperators: async () => {
        console.log('🔄 Forzando recarga de operadores...');
        return get().loadOperators();
      },

      loadAssignments: async () => {
        try {
          set({ isLoading: true });
          console.log('📥 Cargando asignaciones desde Firebase...');
          
          const assignments = await assignmentService.getAll();
          console.log('✅ Asignaciones cargadas:', assignments.length);
          
          // Agrupar asignaciones por operador
          const groupedAssignments = {};
          assignments.forEach(assignment => {
            if (assignment.operatorId) {
              if (!groupedAssignments[assignment.operatorId]) {
                groupedAssignments[assignment.operatorId] = [];
              }
              groupedAssignments[assignment.operatorId].push(assignment);
            }
          });
          
          set({ 
            operatorAssignments: groupedAssignments,
            isLoading: false
          });
          
          console.log('📊 Asignaciones agrupadas por operador:', Object.keys(groupedAssignments).length);
          return assignments;
        } catch (error) {
          console.error('❌ Error cargando asignaciones:', error);
          set({ isLoading: false });
          return []; // Retornar array vacío en caso de error
        }
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
      // ✅ Storage personalizado con manejo de errores QuotaExceeded
      storage: {
        getItem: (name) => {
          try {
            const value = localStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch (error) {
            console.error('❌ Error leyendo app-storage:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            if (error.name === 'QuotaExceededError') {
              console.warn('⚠️ LocalStorage lleno en app-storage. NO guardando datos.');
              // NO intentar guardar nada - estos datos se cargan desde Firebase
              console.log('💡 Los datos de operadores/asignaciones se cargarán desde Firebase al iniciar');
            } else {
              console.error('❌ Error guardando app-storage:', error);
            }
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (error) {
            console.error('❌ Error eliminando app-storage:', error);
          }
        }
      },
      partialize: (state) => ({
        // ✅ PERSISTENCIA ESTRATÉGICA: Guardar operators/assignments para evitar recargas
        // Aunque sean 804 asignaciones, es preferible a perder datos en cada navegación
        settings: state.settings,
        operators: state.operators,  // ✅ PERSISTIR para mantener entre navegaciones
        operatorAssignments: state.operatorAssignments  // ✅ PERSISTIR para mantener entre navegaciones
      }),
      version: 2, // ✅ INCREMENTAR para forzar migración y limpiar caché antiguo
      migrate: (persistedState, version) => {
        // Función de migración: limpiar versión 1 (sin operators/assignments)
        if (version < 2) {
          console.log('🔄 Migrando useAppStore a versión 2 - agregando operators/assignments');
          return {
            ...persistedState,
            operators: persistedState.operators || [],
            operatorAssignments: persistedState.operatorAssignments || {}
          };
        }
        return persistedState;
      }
    }
  )
);

export default useAppStore;
