import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { beneficiaryService } from '../services/beneficiaryService';
import { findBeneficiaryMatch } from '../utils/stringNormalization';

/**
 * Store para manejo de beneficiarios base
 * Centraliza el estado de beneficiarios, uploads y validaciones
 */
const useBeneficiaryStore = create(
  persist(
    (set, get) => ({
      // Estado principal
      beneficiaries: [],
      uploadHistory: [],
      shouldReload: false, // Flag para controlar recarga desde Firebase - cambiado a false por defecto
      
      // Estados de UI
      isLoading: false,
      isUploading: false,
      uploadProgress: 0,
      searchTerm: '',
      selectedBeneficiary: null,
      
      // Estadísticas
      stats: {
        total: 0,
        withPhones: 0,
        withoutPhones: 0,
        incomplete: 0,
        unassigned: 0
      },
      
      // Configuraciones
      settings: {
        autoValidateAssignments: true,
        showUnassignedAlerts: true,
        maxUploadSize: 10 * 1024 * 1024, // 10MB
      },

      // Acciones - Gestión de beneficiarios
      setBeneficiaries: (beneficiaries) => {
        const stats = get().calculateStats(beneficiaries);
        set({ 
          beneficiaries: beneficiaries || [],
          stats
        });
      },

      addBeneficiary: (beneficiary) => {
        set(state => {
          const newBeneficiaries = [...state.beneficiaries, beneficiary];
          const stats = state.calculateStats(newBeneficiaries);
          return {
            beneficiaries: newBeneficiaries,
            stats
          };
        });
      },

      updateBeneficiary: (beneficiaryId, updates) => {
        set(state => {
          const newBeneficiaries = state.beneficiaries.map(b => 
            b.id === beneficiaryId ? { ...b, ...updates } : b
          );
          const stats = state.calculateStats(newBeneficiaries);
          return {
            beneficiaries: newBeneficiaries,
            stats
          };
        });
      },

      removeBeneficiary: (beneficiaryId) => {
        set(state => {
          const newBeneficiaries = state.beneficiaries.filter(b => b.id !== beneficiaryId);
          const stats = state.calculateStats(newBeneficiaries);
          return {
            beneficiaries: newBeneficiaries,
            stats
          };
        });
      },

      // Limpiar todos los datos
      clearAllData: () => {
        console.log('🧹 Limpiando todos los datos del store...');
        set({
          beneficiaries: [],
          uploadHistory: [],
          searchTerm: '',
          selectedBeneficiary: null,
          stats: {
            total: 0,
            withPhones: 0,
            withoutPhones: 0,
            incomplete: 0,
            unassigned: 0
          },
          shouldReload: false
        });
        
        // También limpiar localStorage
        try {
          localStorage.removeItem('beneficiary-store');
          console.log('🧹 localStorage limpiado');
        } catch (error) {
          console.error('Error al limpiar localStorage:', error);
        }
      },

      // Acciones - Búsqueda y filtros
      setSearchTerm: (term) => {
        set({ searchTerm: term });
      },

      getFilteredBeneficiaries: () => {
        const { beneficiaries, searchTerm } = get();
        
        if (!searchTerm || searchTerm.trim() === '') {
          return beneficiaries;
        }

        const search = searchTerm.toLowerCase().trim();
        return beneficiaries.filter(b => 
          (b.nombre && b.nombre.toLowerCase().includes(search)) ||
          (b.direccion && b.direccion.toLowerCase().includes(search)) ||
          (b.fono && b.fono.includes(search)) ||
          (b.sim && b.sim.includes(search)) ||
          (b.appSim && b.appSim.includes(search))
        );
      },

      // Acciones - Upload
      setUploadProgress: (progress) => {
        set({ uploadProgress: progress });
      },

      setIsUploading: (isUploading) => {
        set({ isUploading });
      },

      addUploadRecord: (uploadRecord) => {
        set(state => ({
          uploadHistory: [uploadRecord, ...state.uploadHistory]
        }));
      },

      // Acciones - Estados de loading
      setIsLoading: (isLoading) => {
        set({ isLoading });
      },

      setSelectedBeneficiary: (beneficiary) => {
        set({ selectedBeneficiary: beneficiary });
      },

      // Acciones - Configuraciones
      updateSettings: (newSettings) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings }
        }));
      },

      // Utilidades
      calculateStats: (beneficiaries) => {
        const total = beneficiaries.length;
        const withPhones = beneficiaries.filter(b => 
          b.telefonosValidos && b.telefonosValidos.length > 0
        ).length;
        const withoutPhones = total - withPhones;
        const incomplete = beneficiaries.filter(b => 
          !b.nombre || !b.direccion || !b.telefonosValidos || b.telefonosValidos.length === 0
        ).length;

        return {
          total,
          withPhones,
          withoutPhones,
          incomplete,
          unassigned: 0 // Se calculará cuando se compare con assignments
        };
      },

      // Acciones asíncronas
      loadBeneficiaries: async (userId = null) => {
        const { beneficiaries: currentBeneficiaries, shouldReload } = get();
        
        // Si ya tenemos datos persistidos y no necesitamos recargar, usarlos
        if (currentBeneficiaries.length > 0 && !shouldReload) {
          console.log('📋 Usando beneficiarios del cache local:', currentBeneficiaries.length);
          return currentBeneficiaries;
        }
        
        console.log('📥 Cargando beneficiarios desde Firebase...');
        set({ isLoading: true });
        try {
          const beneficiaries = await beneficiaryService.getAllBeneficiaries(userId);
          console.log('✅ Beneficiarios cargados:', beneficiaries.length);
          get().setBeneficiaries(beneficiaries);
          set({ shouldReload: false }); // Marcar que ya no necesitamos recargar
          return beneficiaries;
        } catch (error) {
          console.error('❌ Error cargando beneficiarios:', error);
          // En caso de error, si tenemos datos en cache, usarlos
          if (currentBeneficiaries.length > 0) {
            console.log('🔄 Usando datos en cache debido a error de red');
            return currentBeneficiaries;
          }
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Forzar recarga completa
      forceReload: async (userId = null) => {
        set({ shouldReload: true });
        return await get().loadBeneficiaries(userId);
      },

      uploadBeneficiaries: async (beneficiariesData, userId) => {
        set({ isUploading: true, uploadProgress: 0 });
        
        try {
          const result = await beneficiaryService.uploadBeneficiaries(
            beneficiariesData,
            userId,
            (progress) => {
              const percentage = Math.round((progress.processed / progress.total) * 100);
              set({ uploadProgress: percentage });
            }
          );
          
          // Actualizar estado local
          if (result.success && result.data) {
            const currentBeneficiaries = get().beneficiaries;
            const newBeneficiaries = [...currentBeneficiaries, ...result.data];
            get().setBeneficiaries(newBeneficiaries);
            set({ shouldReload: false }); // No recargar después de un upload exitoso
          }
          
          // Agregar record de upload
          get().addUploadRecord({
            id: result.uploadId,
            timestamp: new Date(),
            totalRecords: result.totalProcessed,
            successfulRecords: result.successful,
            errorRecords: result.errors,
            fileName: result.fileName || 'archivo.xlsx'
          });
          
          return result;
        } catch (error) {
          console.error('Error subiendo beneficiarios:', error);
          throw error;
        } finally {
          set({ isUploading: false, uploadProgress: 0 });
        }
      },

      searchBeneficiaries: async (searchTerm) => {
        set({ isLoading: true });
        try {
          const results = await beneficiaryService.searchBeneficiaries(searchTerm);
          return results;
        } catch (error) {
          console.error('Error buscando beneficiarios:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      validateBeneficiaryExists: async (name, phone) => {
        try {
          return await beneficiaryService.validateBeneficiaryExists(name, phone);
        } catch (error) {
          console.error('Error validando beneficiario:', error);
          return null;
        }
      },

      updateBeneficiaryData: async (beneficiaryId, updates) => {
        set({ isLoading: true });
        try {
          const success = await beneficiaryService.updateBeneficiary(beneficiaryId, updates);
          if (success) {
            get().updateBeneficiary(beneficiaryId, updates);
          }
          return success;
        } catch (error) {
          console.error('Error actualizando beneficiario:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteBeneficiaryData: async (beneficiaryId) => {
        set({ isLoading: true });
        try {
          const success = await beneficiaryService.deleteBeneficiary(beneficiaryId);
          if (success) {
            get().removeBeneficiary(beneficiaryId);
          }
          return success;
        } catch (error) {
          console.error('Error eliminando beneficiario:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      loadUploadHistory: async (userId) => {
        try {
          const history = await beneficiaryService.getUploadHistory(userId);
          set({ uploadHistory: history });
          return history;
        } catch (error) {
          console.error('Error cargando historial:', error);
          throw error;
        }
      },

      // Utilidades para integración con otros módulos
      findUnassignedBeneficiaries: (assignments = []) => {
        const { beneficiaries } = get();
        
        console.log('🔍 findUnassignedBeneficiaries - beneficiaries:', beneficiaries.length);
        console.log('🔍 findUnassignedBeneficiaries - assignments:', assignments.length);
        
        if (assignments.length === 0) {
          console.log('⚠️ No hay asignaciones para comparar');
          return beneficiaries;
        }
        
        // Mapear asignaciones al formato esperado
        const assignedBeneficiaries = assignments.map(assignment => ({
          nombre: assignment.beneficiary || assignment.nombre || assignment.beneficiario,
          telefono: assignment.phone || assignment.primaryPhone || assignment.telefono || assignment.fono,
          teleoperadora: assignment.operator || assignment.operatorName || assignment.teleoperadora || assignment.operador
        })).filter(item => item.nombre);
        
        console.log('📋 Asignaciones procesadas:', assignedBeneficiaries.length);
        console.log('📋 Primera asignación:', assignedBeneficiaries[0]);
        
        const unassigned = beneficiaries.filter(beneficiary => {
          const match = findBeneficiaryMatch(beneficiary, assignedBeneficiaries);
          return !match;
        });
        
        console.log('👥 Beneficiarios sin asignar:', unassigned.length);
        
        // Actualizar estadísticas
        set(state => ({
          stats: { ...state.stats, unassigned: unassigned.length }
        }));
        
        return unassigned;
      },

      validateAssignmentConsistency: (assignments = []) => {
        const { beneficiaries } = get();
        
        const inconsistencies = {
          inAssignmentsNotInBase: [],
          inBaseNotInAssignments: [],
          dataConflicts: []
        };
        
        // Buscar asignaciones que no están en la base
        assignments.forEach(assignment => {
          const match = findBeneficiaryMatch(assignment, beneficiaries);
          if (!match) {
            inconsistencies.inAssignmentsNotInBase.push(assignment);
          }
        });
        
        // Buscar beneficiarios de la base que no están en asignaciones
        inconsistencies.inBaseNotInAssignments = get().findUnassignedBeneficiaries(assignments);
        
        return inconsistencies;
      },

      // Reset store
      reset: () => {
        set({
          beneficiaries: [],
          uploadHistory: [],
          isLoading: false,
          isUploading: false,
          uploadProgress: 0,
          searchTerm: '',
          selectedBeneficiary: null,
          stats: {
            total: 0,
            withPhones: 0,
            withoutPhones: 0,
            incomplete: 0,
            unassigned: 0
          }
        });
      }
    }),
    {
      name: 'beneficiary-store',
      partialize: (state) => ({
        beneficiaries: state.beneficiaries,
        uploadHistory: state.uploadHistory,
        settings: state.settings,
        stats: state.stats,
        shouldReload: state.shouldReload
      })
    }
  )
);

// Hacer store disponible globalmente para debugging
window.zustandStore = useBeneficiaryStore;

export default useBeneficiaryStore;
