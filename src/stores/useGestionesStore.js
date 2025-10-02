import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Store para gestión de gestiones colaborativas
 * Maneja calendario compartido y listado con sincronización en tiempo real
 */

// Estados posibles de una gestión
export const GESTION_ESTADOS = {
  ABIERTO: 'abierto',
  PENDIENTE: 'pendiente', 
  EN_CURSO: 'en_curso',
  FINALIZADO: 'finalizado'
};

// Colores para cada estado
export const ESTADO_COLORS = {
  [GESTION_ESTADOS.ABIERTO]: '#3b82f6', // Azul
  [GESTION_ESTADOS.PENDIENTE]: '#f59e0b', // Amarillo  
  [GESTION_ESTADOS.EN_CURSO]: '#8b5cf6', // Púrpura
  [GESTION_ESTADOS.FINALIZADO]: '#10b981' // Verde
};

// Función para calcular estado automático basado en fecha
const calcularEstadoAutomatico = (fechaCreacion, ultimaActualizacion) => {
  const ahora = new Date();
  const fechaRef = ultimaActualizacion || fechaCreacion;
  const diferenciaDias = Math.floor((ahora - fechaRef) / (1000 * 60 * 60 * 24));
  
  if (diferenciaDias > 7) {
    return GESTION_ESTADOS.PENDIENTE;
  }
  
  return GESTION_ESTADOS.ABIERTO;
};

export const useGestionesStore = create(
  subscribeWithSelector((set, get) => ({
    // Estados del store
    gestiones: [], // Array de todas las gestiones
    calendarEvents: [], // Eventos formateados para el calendario
    isLoading: false,
    error: null,
    unsubscribe: null, // Función para cancelar suscripción de Firestore
    selectedDate: null, // Fecha seleccionada en calendario
    selectedGestion: null, // Gestión seleccionada para detalles

    // Inicializar suscripción a Firestore para todas las gestiones
    initializeGestionesSubscription: () => {
      const { unsubscribe: currentUnsubscribe } = get();
      
      // Cancelar suscripción anterior si existe
      if (currentUnsubscribe) {
        currentUnsubscribe();
      }

      set({ 
        isLoading: true, 
        error: null,
        gestiones: [],
        calendarEvents: []
      });

      try {
        // Query para todas las gestiones ordenadas por fecha de creación
        const q = query(
          collection(db, 'gestiones'),
          orderBy('createdAt', 'desc')
        );

        // Suscribirse a cambios en tiempo real
        const unsubscribe = onSnapshot(q, 
          (querySnapshot) => {
            const gestiones = [];
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              
              // Calcular estado automático si no está finalizada
              let estadoFinal = data.estado;
              if (data.estado !== GESTION_ESTADOS.FINALIZADO) {
                const fechaCreacion = data.createdAt?.toDate() || new Date();
                const ultimaActualizacion = data.updatedAt?.toDate() || null;
                estadoFinal = calcularEstadoAutomatico(fechaCreacion, ultimaActualizacion);
              }

              gestiones.push({
                id: doc.id,
                ...data,
                estado: estadoFinal,
                // Convertir timestamps a objetos Date para facilitar el manejo
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || null,
                fechaVencimiento: data.fechaVencimiento?.toDate() || null
              });
            });

            console.log('🔄 Gestiones actualizadas:', gestiones.length);
            
            // Actualizar gestiones y generar eventos del calendario
            set({ 
              gestiones,
              calendarEvents: get().formatGestionesToEvents(gestiones),
              isLoading: false,
              error: null
            });
          },
          (error) => {
            console.error('❌ Error en suscripción de gestiones:', error);
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

    // Formatear gestiones a eventos del calendario
    formatGestionesToEvents: (gestiones) => {
      return gestiones.map(gestion => {
        // Usar fecha de vencimiento si existe, sino fecha de creación
        const eventDate = gestion.fechaVencimiento || gestion.createdAt;
        
        // Determinar título con ícono según tipo
        let tituloConIcono = gestion.titulo;
        switch (gestion.tipo) {
          case 'recordatorio_medicamentos':
            tituloConIcono = `💊 ${gestion.titulo}`;
            if (gestion.horaMedicamento) {
              tituloConIcono += ` (${gestion.horaMedicamento})`;
            }
            break;
          case 'toma_hora_cesfam':
            tituloConIcono = `🏥 ${gestion.titulo}`;
            if (gestion.centroSalud) {
              tituloConIcono += ` - ${gestion.centroSalud}`;
            }
            break;
          case 'gestion_municipal':
            tituloConIcono = `🏛️ ${gestion.titulo}`;
            break;
          default:
            tituloConIcono = `📋 ${gestion.titulo}`;
        }

        return {
          id: gestion.id,
          title: tituloConIcono,
          start: eventDate,
          end: eventDate,
          allDay: gestion.tipo !== 'recordatorio_medicamentos', // Los medicamentos no son todo el día
          resource: {
            ...gestion,
            color: ESTADO_COLORS[gestion.estado] || ESTADO_COLORS[GESTION_ESTADOS.ABIERTO]
          }
        };
      });
    },

    // Crear nueva gestión
    addGestion: async (gestionData, userId, userName) => {
      set({ isLoading: true, error: null });

      try {
        const nuevaGestion = {
          titulo: gestionData.titulo,
          descripcion: gestionData.descripcion,
          tipo: gestionData.tipo || 'gestion_municipal',
          creadorId: userId,
          creadorNombre: userName,
          estado: GESTION_ESTADOS.ABIERTO,
          fechaVencimiento: gestionData.fechaVencimiento || null,
          prioridad: gestionData.prioridad || 'media',
          categoria: gestionData.categoria || 'general',
          
          // Campos específicos por tipo (si existen)
          ...(gestionData.medicamentos && { medicamentos: gestionData.medicamentos }),
          ...(gestionData.horaMedicamento && { horaMedicamento: gestionData.horaMedicamento }),
          ...(gestionData.recurrencia && { recurrencia: gestionData.recurrencia }),
          ...(gestionData.centroSalud && { centroSalud: gestionData.centroSalud }),
          ...(gestionData.especialidad && { especialidad: gestionData.especialidad }),
          ...(gestionData.tipoGestionMunicipal && { tipoGestionMunicipal: gestionData.tipoGestionMunicipal }),
          ...(gestionData.departamento && { departamento: gestionData.departamento }),
          
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'gestiones'), nuevaGestion);
        
        // Si es una gestión recurrente de medicamentos, crear instancias futuras
        if (gestionData.tipo === 'recordatorio_medicamentos' && 
            gestionData.recurrencia && 
            gestionData.recurrencia !== 'unico') {
          await get().crearGestionesRecurrentes(docRef.id, gestionData, userId, userName);
        }
        
        console.log('✅ Gestión creada:', docRef.id);
        
        set({ isLoading: false });
        return docRef.id;
      } catch (error) {
        console.error('❌ Error creando gestión:', error);
        set({ 
          error: error.message,
          isLoading: false
        });
        throw error;
      }
    },

    // Crear gestiones recurrentes para recordatorios de medicamentos
    crearGestionesRecurrentes: async (gestionOriginalId, gestionData, userId, userName) => {
      try {
        const instanciasACrear = [];
        const fechaBase = gestionData.fechaVencimiento || new Date();
        
        // Determinar cuántas instancias crear según el tipo de recurrencia
        let cantidadInstancias = 0;
        let incrementoDias = 0;
        
        switch (gestionData.recurrencia) {
          case 'diario':
            cantidadInstancias = 30; // 30 días adelante
            incrementoDias = 1;
            break;
          case 'semanal':
            cantidadInstancias = 12; // 12 semanas adelante
            incrementoDias = 7;
            break;
          case 'mensual':
            cantidadInstancias = 12; // 12 meses adelante
            incrementoDias = 30;
            break;
          case 'permanente':
            cantidadInstancias = 365; // 1 año adelante
            incrementoDias = 1;
            break;
          default:
            return; // No es recurrente
        }
        
        // Crear instancias futuras
        for (let i = 1; i <= cantidadInstancias; i++) {
          const fechaInstancia = new Date(fechaBase);
          fechaInstancia.setDate(fechaInstancia.getDate() + (incrementoDias * i));
          
          const instancia = {
            titulo: `${gestionData.titulo} (${i + 1})`,
            descripcion: gestionData.descripcion,
            tipo: gestionData.tipo,
            creadorId: userId,
            creadorNombre: userName,
            estado: GESTION_ESTADOS.ABIERTO,
            fechaVencimiento: fechaInstancia,
            prioridad: gestionData.prioridad || 'media',
            categoria: gestionData.categoria || 'general',
            
            // Campos específicos
            medicamentos: gestionData.medicamentos,
            horaMedicamento: gestionData.horaMedicamento,
            recurrencia: 'instancia_recurrente', // Marcar como instancia
            gestionOriginalId: gestionOriginalId, // Referencia al original
            
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          instanciasACrear.push(instancia);
        }
        
        // Guardar todas las instancias en lotes para mejor rendimiento
        const batch = [];
        for (const instancia of instanciasACrear) {
          batch.push(addDoc(collection(db, 'gestiones'), instancia));
        }
        
        await Promise.all(batch);
        console.log(`✅ Creadas ${cantidadInstancias} instancias recurrentes`);
        
      } catch (error) {
        console.error('❌ Error creando gestiones recurrentes:', error);
      }
    },

    // Actualizar gestión completa (para edición)
    updateGestion: async (gestionId, updateData) => {
      set({ isLoading: true, error: null });

      try {
        const finalUpdateData = {
          ...updateData,
          updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, 'gestiones', gestionId), finalUpdateData);
        
        console.log('✅ Gestión actualizada completamente:', gestionId);
        set({ isLoading: false });
      } catch (error) {
        console.error('❌ Error actualizando gestión:', error);
        set({ 
          error: error.message,
          isLoading: false
        });
        throw error;
      }
    },

    // Actualizar estado de gestión
    updateGestionEstado: async (gestionId, nuevoEstado, datos = {}) => {
      set({ isLoading: true, error: null });

      try {
        const updateData = {
          estado: nuevoEstado,
          updatedAt: serverTimestamp(),
          ...datos
        };

        await updateDoc(doc(db, 'gestiones', gestionId), updateData);
        
        console.log('✅ Gestión actualizada:', gestionId);
        set({ isLoading: false });
      } catch (error) {
        console.error('❌ Error actualizando gestión:', error);
        set({ 
          error: error.message,
          isLoading: false
        });
        throw error;
      }
    },

    // Finalizar gestión con tipificación
    completeGestion: async (gestionId, solucion, userId, userName) => {
      set({ isLoading: true, error: null });

      try {
        const updateData = {
          estado: GESTION_ESTADOS.FINALIZADO,
          solucion: solucion,
          finalizadaPor: userId,
          finalizadaNombre: userName,
          fechaFinalizacion: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, 'gestiones', gestionId), updateData);
        
        console.log('✅ Gestión finalizada:', gestionId);
        set({ isLoading: false });
      } catch (error) {
        console.error('❌ Error finalizando gestión:', error);
        set({ 
          error: error.message,
          isLoading: false
        });
        throw error;
      }
    },

    // Marcar gestión en curso (cuando se está trabajando en ella)
    markGestionEnCurso: async (gestionId, userId) => {
      try {
        await get().updateGestionEstado(gestionId, GESTION_ESTADOS.EN_CURSO, {
          enCursoPor: userId,
          fechaEnCurso: serverTimestamp()
        });
      } catch (error) {
        console.error('❌ Error marcando gestión en curso:', error);
        throw error;
      }
    },

    // Eliminar gestión (solo para creador o admin)
    deleteGestion: async (gestionId) => {
      set({ isLoading: true, error: null });

      try {
        await deleteDoc(doc(db, 'gestiones', gestionId));
        console.log('✅ Gestión eliminada:', gestionId);
        set({ isLoading: false });
      } catch (error) {
        console.error('❌ Error eliminando gestión:', error);
        set({ 
          error: error.message,
          isLoading: false
        });
        throw error;
      }
    },

    // Obtener gestiones por fecha específica
    getGestionesByDate: (selectedDate) => {
      const { gestiones } = get();
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const gestionesDelDia = gestiones.filter(gestion => {
        const fechaComparacion = gestion.fechaVencimiento || gestion.createdAt;
        return fechaComparacion >= startOfDay && fechaComparacion <= endOfDay;
      });

      set({ selectedDate });
      return gestionesDelDia;
    },

    // Filtrar gestiones por estado
    getGestionesByEstado: (estado) => {
      const { gestiones } = get();
      return gestiones.filter(gestion => gestion.estado === estado);
    },

    // Obtener estadísticas generales
    getGestionesStats: () => {
      const { gestiones } = get();
      
      const stats = {
        total: gestiones.length,
        abiertas: gestiones.filter(g => g.estado === GESTION_ESTADOS.ABIERTO).length,
        pendientes: gestiones.filter(g => g.estado === GESTION_ESTADOS.PENDIENTE).length,
        enCurso: gestiones.filter(g => g.estado === GESTION_ESTADOS.EN_CURSO).length,
        finalizadas: gestiones.filter(g => g.estado === GESTION_ESTADOS.FINALIZADO).length
      };

      // Calcular porcentaje de resolución
      stats.porcentajeResolucion = stats.total > 0 
        ? Math.round((stats.finalizadas / stats.total) * 100) 
        : 0;

      return stats;
    },

    // Buscar gestiones por texto
    searchGestiones: (searchTerm) => {
      const { gestiones } = get();
      if (!searchTerm.trim()) return gestiones;

      const term = searchTerm.toLowerCase().trim();
      return gestiones.filter(gestion => 
        gestion.titulo.toLowerCase().includes(term) ||
        gestion.descripcion.toLowerCase().includes(term) ||
        gestion.creadorNombre.toLowerCase().includes(term)
      );
    },

    // Limpiar store
    clearGestionesStore: () => {
      const { unsubscribe } = get();
      if (unsubscribe) {
        unsubscribe();
      }
      
      set({
        gestiones: [],
        calendarEvents: [],
        isLoading: false,
        error: null,
        unsubscribe: null,
        selectedDate: null,
        selectedGestion: null
      });
    },

    // Setters para UI
    setSelectedGestion: (gestion) => set({ selectedGestion: gestion }),
    setSelectedDate: (date) => set({ selectedDate: date }),
    clearError: () => set({ error: null })
  }))
);