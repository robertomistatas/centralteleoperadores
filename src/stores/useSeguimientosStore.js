import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import firestoreService from '../services/firestoreService';
import { seguimientoService } from '../services/seguimientoService';
import { normalizeName } from '../utils/validators';
import logger from '../utils/logger';
import { auth } from '../firebase';

const { COLLECTIONS } = firestoreService;

/**
 * Store para gestión de seguimientos y eventos del calendario
 * Maneja la sincronización en tiempo real con Firestore
 * 
 * Refactorización: Usa firestoreService centralizado y nomenclatura operatorId/operatorName
 */
export const useSeguimientosStore = create(
  subscribeWithSelector((set, get) => ({
    // Estados del store
    seguimientos: [], // Array de seguimientos del operador
    calendarEvents: [], // Eventos formateados para el calendario
    byBeneficiary: {}, // Índice de seguimientos por beneficiario
    isLoading: false,
    error: null,
    currentUserId: null,
    unsubscribe: null, // Función para cancelar la suscripción de Firestore
    selectedDate: null, // Fecha seleccionada en el calendario
    dailyContacts: [], // Contactos del día seleccionado

    // ===== SUSCRIPCIÓN A FIRESTORE =====
    
    /**
     * Inicializa suscripción a Firestore para un operador
     * @param {string} userId - ID del operador (operatorId)
     */
    initializeSubscription: (userId) => {
      const { unsubscribe: currentUnsubscribe } = get();
      
      // 🔥 CRÍTICO: Verificar que Firebase Auth tenga un usuario autenticado
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        logger.warn('⚠️ Intento de suscripción sin usuario autenticado. Esperando autenticación...');
        
        // Esperar a que Auth esté listo
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
          if (user) {
            logger.info('✅ Usuario autenticado, reiniciando suscripción:', user.email);
            unsubscribeAuth(); // Cancelar listener de auth
            get().initializeSubscription(userId); // Reintentar suscripción
          }
        });
        
        return;
      }
      
      // Cancelar suscripción anterior si existe
      if (currentUnsubscribe) {
        currentUnsubscribe();
      }

      set({ 
        isLoading: true, 
        error: null, 
        currentUserId: userId,
        seguimientos: [],
        calendarEvents: [],
        byBeneficiary: {},
      });

      logger.store('Inicializando suscripción de seguimientos para operador:', userId);

      try {
        // Suscribirse a cambios en tiempo real usando firestoreService
        const unsubscribe = firestoreService.onSnapshotCollection(
          COLLECTIONS.SEGUIMIENTOS,
          {
            where: ['operatorId', '==', userId],
            orderBy: ['fechaContacto', 'desc'],
          },
          (seguimientos) => {
            logger.store('Seguimientos actualizados:', seguimientos.length);
            
            // Crear índice por beneficiario
            const byBeneficiary = {};
            seguimientos.forEach((seg) => {
              const benefId = seg.beneficiarioId || seg.beneficiaryId;
              if (benefId) {
                if (!byBeneficiary[benefId]) {
                  byBeneficiary[benefId] = [];
                }
                byBeneficiary[benefId].push(seg);
              }
            });
            
            // Actualizar seguimientos y generar eventos del calendario
            set({ 
              seguimientos,
              byBeneficiary,
              calendarEvents: get().formatSeguimientosToEvents(seguimientos),
              isLoading: false,
              error: null
            });
          },
          (error) => {
            logger.error('Error en suscripción de seguimientos:', error);
            set({ 
              error: error.message,
              isLoading: false
            });
          }
        );

        set({ unsubscribe });
      } catch (error) {
        logger.error('Error inicializando suscripción:', error);
        set({ 
          error: error.message,
          isLoading: false
        });
      }
    },

    /**
     * Alias para compatibilidad (subscribeToTeleoperadora)
     */
    subscribeToTeleoperadora: (operatorId) => {
      get().initializeSubscription(operatorId);
    },

    // Función para formatear seguimientos a eventos del calendario
    formatSeguimientosToEvents: (seguimientos) => {
      return seguimientos.map(seguimiento => {
        // Convertir fecha a objeto Date
        let eventDate;
        if (seguimiento.fechaContacto?.toDate) {
          // Es un Timestamp de Firestore
          eventDate = seguimiento.fechaContacto.toDate();
        } else if (seguimiento.fechaContacto instanceof Date) {
          // Ya es un objeto Date
          eventDate = seguimiento.fechaContacto;
        } else if (typeof seguimiento.fechaContacto === 'string') {
          // Es una string de fecha
          eventDate = new Date(seguimiento.fechaContacto);
        } else {
          // Fallback a fecha actual
          eventDate = new Date();
        }

        // Determinar color según el resultado del contacto
        let color = '#3B82F6'; // Azul por defecto
        switch (seguimiento.resultado?.toLowerCase()) {
          case 'exitoso':
          case 'contacto exitoso':
            color = '#10B981'; // Verde
            break;
          case 'sin respuesta':
          case 'no contesta':
            color = '#F59E0B'; // Amarillo
            break;
          case 'ocupado':
          case 'línea ocupada':
            color = '#EF4444'; // Rojo
            break;
          case 'reagendado':
            color = '#8B5CF6'; // Púrpura
            break;
          default:
            color = '#6B7280'; // Gris
        }

        return {
          id: seguimiento.id,
          title: seguimiento.beneficiarioNombre || 'Contacto',
          start: eventDate,
          end: eventDate, // Para eventos de un día
          allDay: true,
          resource: {
            ...seguimiento,
            color,
            phone: seguimiento.telefono,
            result: seguimiento.resultado,
            notes: seguimiento.observaciones
          }
        };
      });
    },

    // ===== ACCIONES CRUD =====

    /**
     * Crea un nuevo seguimiento
     * @param {object} seguimientoData - Datos del seguimiento
     */
    createSeguimiento: async (seguimientoData) => {
      const { currentUserId } = get();
      if (!currentUserId) {
        throw new Error('Usuario no autenticado');
      }

      set({ isLoading: true, error: null });

      try {
        logger.store('Creando seguimiento');
        
        // Normalizar nombre del beneficiario
        const normalizedData = {
          ...seguimientoData,
          beneficiarioNombre: normalizeName(seguimientoData.beneficiarioNombre || seguimientoData.nombre),
          operatorId: currentUserId,
          operatorName: seguimientoData.operatorName || '',
        };
        
        const seguimientoId = await seguimientoService.createSeguimiento(
          currentUserId, 
          normalizedData
        );
        
        logger.store('Seguimiento creado:', seguimientoId);
        
        // La actualización del store se hace automáticamente via onSnapshot
        set({ isLoading: false });
        
        // Notificar a métricas que hubo cambio (si se integra con useMetricsStore)
        // useMetricsStore.getState().recomputeForBeneficiary(seguimientoData.beneficiarioId);
        
        return seguimientoId;
      } catch (error) {
        logger.error('Error creando seguimiento:', error);
        set({ 
          error: error.message,
          isLoading: false
        });
        throw error;
      }
    },

    /**
     * Alias para compatibilidad
     */
    addSeguimiento: async (seguimientoData) => {
      return await get().createSeguimiento(seguimientoData);
    },

    /**
     * Actualiza un seguimiento existente
     * @param {string} seguimientoId - ID del seguimiento
     * @param {object} updates - Campos a actualizar
     */
    updateSeguimiento: async (seguimientoId, updates) => {
      set({ isLoading: true, error: null });

      try {
        logger.store('Actualizando seguimiento:', seguimientoId);
        
        await firestoreService.update(COLLECTIONS.SEGUIMIENTOS, seguimientoId, updates);

        logger.store('Seguimiento actualizado');
        set({ isLoading: false });
        return true;
      } catch (error) {
        logger.error('Error actualizando seguimiento:', error);
        set({ 
          error: error.message,
          isLoading: false
        });
        throw error;
      }
    },

    /**
     * Elimina un seguimiento
     * @param {string} seguimientoId - ID del seguimiento
     */
    deleteSeguimiento: async (seguimientoId) => {
      set({ isLoading: true, error: null });

      try {
        logger.store('Eliminando seguimiento:', seguimientoId);
        
        await firestoreService.remove(COLLECTIONS.SEGUIMIENTOS, seguimientoId);
        
        logger.store('Seguimiento eliminado');
        set({ isLoading: false });
        return true;
      } catch (error) {
        logger.error('Error eliminando seguimiento:', error);
        set({ 
          error: error.message,
          isLoading: false
        });
        throw error;
      }
    },

    // Obtener contactos de un día específico
    getContactsByDate: (selectedDate) => {
      const { seguimientos } = get();
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const dailyContacts = seguimientos.filter(seguimiento => {
        let contactDate;
        if (seguimiento.fechaContacto?.toDate) {
          contactDate = seguimiento.fechaContacto.toDate();
        } else if (seguimiento.fechaContacto instanceof Date) {
          contactDate = seguimiento.fechaContacto;
        } else if (typeof seguimiento.fechaContacto === 'string') {
          contactDate = new Date(seguimiento.fechaContacto);
        } else {
          return false;
        }

        return contactDate >= startOfDay && contactDate <= endOfDay;
      });

      set({ selectedDate, dailyContacts });
      return dailyContacts;
    },

    // Limpiar datos del store
    clearStore: () => {
      const { unsubscribe } = get();
      if (unsubscribe) {
        unsubscribe();
      }
      
      set({
        seguimientos: [],
        calendarEvents: [],
        isLoading: false,
        error: null,
        currentUserId: null,
        unsubscribe: null,
        selectedDate: null,
        dailyContacts: []
      });
    },

    // Obtener estadísticas de seguimientos
    getStats: () => {
      const { seguimientos } = get();
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const thisMonthContacts = seguimientos.filter(seg => {
        let contactDate;
        if (seg.fechaContacto?.toDate) {
          contactDate = seg.fechaContacto.toDate();
        } else if (seg.fechaContacto instanceof Date) {
          contactDate = seg.fechaContacto;
        } else if (typeof seg.fechaContacto === 'string') {
          contactDate = new Date(seg.fechaContacto);
        } else {
          return false;
        }
        return contactDate >= startOfMonth;
      });

      const exitosos = thisMonthContacts.filter(seg => 
        seg.resultado?.toLowerCase().includes('exitoso')
      ).length;

      const sinRespuesta = thisMonthContacts.filter(seg => 
        seg.resultado?.toLowerCase().includes('sin respuesta') ||
        seg.resultado?.toLowerCase().includes('no contesta')
      ).length;

      const ocupados = thisMonthContacts.filter(seg => 
        seg.resultado?.toLowerCase().includes('ocupado')
      ).length;

      return {
        totalContactos: thisMonthContacts.length,
        exitosos,
        sinRespuesta,
        ocupados,
        tasaExito: thisMonthContacts.length > 0 ? Math.round((exitosos / thisMonthContacts.length) * 100) : 0
      };
    }
  }))
);