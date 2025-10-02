import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { seguimientoService } from '../services/seguimientoService';

/**
 * Store para gestión de seguimientos y eventos del calendario
 * Maneja la sincronización en tiempo real con Firestore
 */
export const useSeguimientosStore = create(
  subscribeWithSelector((set, get) => ({
    // Estados del store
    seguimientos: [], // Array de seguimientos de la teleoperadora
    calendarEvents: [], // Eventos formateados para el calendario
    isLoading: false,
    error: null,
    currentUserId: null,
    unsubscribe: null, // Función para cancelar la suscripción de Firestore
    selectedDate: null, // Fecha seleccionada en el calendario
    dailyContacts: [], // Contactos del día seleccionado

    // Acción para inicializar la suscripción a Firestore
    initializeSubscription: (userId) => {
      const { unsubscribe: currentUnsubscribe } = get();
      
      // Cancelar suscripción anterior si existe
      if (currentUnsubscribe) {
        currentUnsubscribe();
      }

      set({ 
        isLoading: true, 
        error: null, 
        currentUserId: userId,
        seguimientos: [],
        calendarEvents: []
      });

      try {
        // Crear query para seguimientos del usuario ordenados por fecha
        const q = query(
          collection(db, 'seguimientos'),
          where('userId', '==', userId),
          orderBy('fechaContacto', 'desc')
        );

        // Suscribirse a cambios en tiempo real
        const unsubscribe = onSnapshot(q, 
          (querySnapshot) => {
            const seguimientos = [];
            querySnapshot.forEach((doc) => {
              seguimientos.push({
                id: doc.id,
                ...doc.data()
              });
            });

            console.log('📅 Seguimientos actualizados:', seguimientos.length);
            
            // Actualizar seguimientos y generar eventos del calendario
            set({ 
              seguimientos,
              calendarEvents: get().formatSeguimientosToEvents(seguimientos),
              isLoading: false,
              error: null
            });
          },
          (error) => {
            console.error('❌ Error en suscripción de seguimientos:', error);
            set({ 
              error: error.message,
              isLoading: false
            });
          }
        );

        set({ unsubscribe });
      } catch (error) {
        console.error('❌ Error inicializando suscripción:', error);
        set({ 
          error: error.message,
          isLoading: false
        });
      }
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

    // Agregar nuevo seguimiento
    addSeguimiento: async (seguimientoData) => {
      const { currentUserId } = get();
      if (!currentUserId) {
        throw new Error('Usuario no autenticado');
      }

      set({ isLoading: true, error: null });

      try {
        const seguimientoId = await seguimientoService.createSeguimiento(
          currentUserId, 
          seguimientoData
        );
        
        console.log('✅ Seguimiento agregado al calendario:', seguimientoId);
        
        // La actualización del store se hace automáticamente via onSnapshot
        set({ isLoading: false });
        return seguimientoId;
      } catch (error) {
        console.error('❌ Error agregando seguimiento:', error);
        set({ 
          error: error.message,
          isLoading: false
        });
        throw error;
      }
    },

    // Actualizar seguimiento existente
    updateSeguimiento: async (seguimientoId, updates) => {
      set({ isLoading: true, error: null });

      try {
        await updateDoc(doc(db, 'seguimientos', seguimientoId), {
          ...updates,
          updatedAt: serverTimestamp()
        });

        console.log('✅ Seguimiento actualizado:', seguimientoId);
        set({ isLoading: false });
      } catch (error) {
        console.error('❌ Error actualizando seguimiento:', error);
        set({ 
          error: error.message,
          isLoading: false
        });
        throw error;
      }
    },

    // Eliminar seguimiento
    deleteSeguimiento: async (seguimientoId) => {
      set({ isLoading: true, error: null });

      try {
        await deleteDoc(doc(db, 'seguimientos', seguimientoId));
        console.log('✅ Seguimiento eliminado:', seguimientoId);
        set({ isLoading: false });
      } catch (error) {
        console.error('❌ Error eliminando seguimiento:', error);
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