/**
 * useAsignationsStore.js
 * Store para gestión de asignaciones de beneficiarios a operadores
 * 
 * Refactorización: Centraliza asignaciones con nomenclatura estándar operatorId/operatorName
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import firestoreService from '../services/firestoreService';
import logger from '../utils/logger';

const { COLLECTIONS } = firestoreService;

/**
 * Estado inicial del store
 */
const initialState = {
  // Asignaciones: Map de operatorId => [beneficiaryIds]
  asignations: {},
  
  // Índice inverso: Map de beneficiaryId => operatorId
  beneficiaryToOperator: {},
  
  // Beneficiarios sin asignar
  unassigned: [],
  
  // Estados
  isLoading: false,
  error: null,
  lastSync: null,
  
  // Listener de Firestore
  unsubscribe: null,
};

/**
 * Store de asignaciones
 */
export const useAsignationsStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // ===== ACCIONES DE CARGA =====
      
      /**
       * Carga todas las asignaciones
       */
      loadAll: async () => {
        try {
          set({ isLoading: true, error: null });
          logger.store('Cargando todas las asignaciones');

          const assignments = await firestoreService.fetchCollection(COLLECTIONS.ASSIGNMENTS);
          
          // Reorganizar en estructura de mapa
          const asignations = {};
          const beneficiaryToOperator = {};
          
          assignments.forEach((assignment) => {
            const operatorId = assignment.operatorId;
            const beneficiaryId = assignment.beneficiaryId;
            
            if (!operatorId || !beneficiaryId) return;
            
            // Agregar a asignaciones por operador
            if (!asignations[operatorId]) {
              asignations[operatorId] = [];
            }
            asignations[operatorId].push(beneficiaryId);
            
            // Índice inverso
            beneficiaryToOperator[beneficiaryId] = operatorId;
          });

          set({
            asignations,
            beneficiaryToOperator,
            isLoading: false,
            lastSync: new Date().toISOString(),
          });

          logger.store('Asignaciones cargadas:', Object.keys(asignations).length, 'operadores');
          return asignations;
          
        } catch (error) {
          logger.error('Error cargando asignaciones:', error);
          set({ isLoading: false, error: error.message });
          return null;
        }
      },

      /**
       * Carga asignaciones de un operador específico
       * @param {string} operatorId - ID del operador
       */
      loadByOperator: async (operatorId) => {
        try {
          set({ isLoading: true, error: null });
          logger.store('Cargando asignaciones para operador:', operatorId);

          const assignments = await firestoreService.fetchCollection(
            COLLECTIONS.ASSIGNMENTS,
            {
              where: ['operatorId', '==', operatorId],
            }
          );

          const beneficiaryIds = assignments.map((a) => a.beneficiaryId);

          // Actualizar en el mapa
          set((state) => ({
            asignations: {
              ...state.asignations,
              [operatorId]: beneficiaryIds,
            },
            isLoading: false,
            lastSync: new Date().toISOString(),
          }));

          // Actualizar índice inverso
          beneficiaryIds.forEach((beneficiaryId) => {
            set((state) => ({
              beneficiaryToOperator: {
                ...state.beneficiaryToOperator,
                [beneficiaryId]: operatorId,
              },
            }));
          });

          logger.store('Asignaciones cargadas:', beneficiaryIds.length);
          return beneficiaryIds;
          
        } catch (error) {
          logger.error('Error cargando asignaciones del operador:', error);
          set({ isLoading: false, error: error.message });
          return [];
        }
      },

      // ===== ACCIONES DE MODIFICACIÓN =====
      
      /**
       * Asigna un beneficiario a un operador
       * @param {string} operatorId - ID del operador
       * @param {string} beneficiaryId - ID del beneficiario
       * @param {object} metadata - Metadatos adicionales
       */
      assign: async (operatorId, beneficiaryId, metadata = {}) => {
        try {
          logger.store('Asignando beneficiario:', beneficiaryId, 'a operador:', operatorId);

          // Verificar si ya está asignado a otro operador
          const { beneficiaryToOperator } = get();
          const currentOperator = beneficiaryToOperator[beneficiaryId];
          
          if (currentOperator && currentOperator !== operatorId) {
            // Desasignar primero
            await get().unassign(beneficiaryId);
          }

          // Crear asignación en Firestore
          const assignmentData = {
            operatorId,
            beneficiaryId,
            assignedAt: new Date().toISOString(),
            ...metadata,
          };

          await firestoreService.create(COLLECTIONS.ASSIGNMENTS, assignmentData);

          // Actualizar estado local
          set((state) => {
            const operatorAssignments = state.asignations[operatorId] || [];
            
            return {
              asignations: {
                ...state.asignations,
                [operatorId]: [...operatorAssignments, beneficiaryId],
              },
              beneficiaryToOperator: {
                ...state.beneficiaryToOperator,
                [beneficiaryId]: operatorId,
              },
              unassigned: state.unassigned.filter((id) => id !== beneficiaryId),
            };
          });

          logger.store('Asignación completada');
          return true;
          
        } catch (error) {
          logger.error('Error asignando beneficiario:', error);
          set({ error: error.message });
          return false;
        }
      },

      /**
       * Desasigna un beneficiario
       * @param {string} beneficiaryId - ID del beneficiario
       */
      unassign: async (beneficiaryId) => {
        try {
          logger.store('Desasignando beneficiario:', beneficiaryId);

          const { beneficiaryToOperator } = get();
          const operatorId = beneficiaryToOperator[beneficiaryId];

          if (!operatorId) {
            logger.warn('Beneficiario no está asignado:', beneficiaryId);
            return true;
          }

          // Buscar y eliminar la asignación en Firestore
          const assignments = await firestoreService.fetchCollection(
            COLLECTIONS.ASSIGNMENTS,
            {
              where: [
                ['operatorId', '==', operatorId],
                ['beneficiaryId', '==', beneficiaryId],
              ],
            }
          );

          if (assignments.length > 0) {
            await firestoreService.remove(COLLECTIONS.ASSIGNMENTS, assignments[0].id);
          }

          // Actualizar estado local
          set((state) => {
            const operatorAssignments = state.asignations[operatorId] || [];
            
            return {
              asignations: {
                ...state.asignations,
                [operatorId]: operatorAssignments.filter((id) => id !== beneficiaryId),
              },
              beneficiaryToOperator: Object.fromEntries(
                Object.entries(state.beneficiaryToOperator).filter(
                  ([key]) => key !== beneficiaryId
                )
              ),
              unassigned: [...state.unassigned, beneficiaryId],
            };
          });

          logger.store('Desasignación completada');
          return true;
          
        } catch (error) {
          logger.error('Error desasignando beneficiario:', error);
          set({ error: error.message });
          return false;
        }
      },

      /**
       * Reasigna un beneficiario a otro operador
       * @param {string} beneficiaryId - ID del beneficiario
       * @param {string} newOperatorId - ID del nuevo operador
       */
      reassign: async (beneficiaryId, newOperatorId) => {
        await get().unassign(beneficiaryId);
        return await get().assign(newOperatorId, beneficiaryId);
      },

      // ===== UTILIDADES =====
      
      /**
       * Obtiene las asignaciones de un operador
       * @param {string} operatorId - ID del operador
       * @returns {Array} IDs de beneficiarios
       */
      getOperatorAssignments: (operatorId) => {
        const { asignations } = get();
        return asignations[operatorId] || [];
      },

      /**
       * Obtiene el operador asignado a un beneficiario
       * @param {string} beneficiaryId - ID del beneficiario
       * @returns {string|null} ID del operador o null
       */
      getBeneficiaryOperator: (beneficiaryId) => {
        const { beneficiaryToOperator } = get();
        return beneficiaryToOperator[beneficiaryId] || null;
      },

      /**
       * Recomputa beneficiarios sin asignar
       * @param {Array} allBeneficiaries - Lista completa de beneficiarios
       */
      recomputeUnassigned: (allBeneficiaries = []) => {
        const { beneficiaryToOperator } = get();
        
        const unassigned = allBeneficiaries
          .filter((b) => !beneficiaryToOperator[b.id])
          .map((b) => b.id);

        set({ unassigned });
        logger.store('Beneficiarios sin asignar:', unassigned.length);
      },

      /**
       * Obtiene estadísticas de asignaciones
       */
      getStats: () => {
        const { asignations, unassigned } = get();
        
        const totalOperators = Object.keys(asignations).length;
        const totalAssigned = Object.values(asignations).reduce(
          (sum, arr) => sum + arr.length,
          0
        );

        return {
          totalOperators,
          totalAssigned,
          totalUnassigned: unassigned.length,
          avgPerOperator: totalOperators > 0 ? (totalAssigned / totalOperators).toFixed(1) : 0,
        };
      },

      // ===== SUSCRIPCIÓN EN TIEMPO REAL =====
      
      /**
       * Suscribe a cambios en asignaciones
       */
      subscribeToFirestore: () => {
        const { unsubscribe: currentUnsubscribe } = get();
        
        // Cancelar suscripción anterior
        if (currentUnsubscribe) {
          currentUnsubscribe();
        }

        logger.store('Suscribiéndose a cambios de asignaciones');

        const unsubscribe = firestoreService.onSnapshotCollection(
          COLLECTIONS.ASSIGNMENTS,
          {},
          (assignments) => {
            // Reorganizar en estructura de mapa
            const asignations = {};
            const beneficiaryToOperator = {};
            
            assignments.forEach((assignment) => {
              const operatorId = assignment.operatorId;
              const beneficiaryId = assignment.beneficiaryId;
              
              if (!operatorId || !beneficiaryId) return;
              
              if (!asignations[operatorId]) {
                asignations[operatorId] = [];
              }
              asignations[operatorId].push(beneficiaryId);
              beneficiaryToOperator[beneficiaryId] = operatorId;
            });

            set({
              asignations,
              beneficiaryToOperator,
              lastSync: new Date().toISOString(),
            });

            logger.store('Asignaciones actualizadas en tiempo real');
          },
          (error) => {
            logger.error('Error en suscripción de asignaciones:', error);
            set({ error: error.message });
          }
        );

        set({ unsubscribe });
      },

      // ===== RESET =====
      
      /**
       * Resetea el store a estado inicial
       */
      reset: () => {
        const { unsubscribe } = get();
        if (unsubscribe) {
          unsubscribe();
        }
        set(initialState);
        logger.store('Store de asignaciones reseteado');
      },
    }),
    {
      name: 'asignations-storage',
      partialize: (state) => ({
        asignations: state.asignations,
        beneficiaryToOperator: state.beneficiaryToOperator,
        unassigned: state.unassigned,
        lastSync: state.lastSync,
      }),
    }
  )
);

export default useAsignationsStore;
