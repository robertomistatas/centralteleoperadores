import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Servicio para gestión de seguimientos periódicos
 * Maneja CRUD de contactos con beneficiarios
 */
class SeguimientoService {
  constructor() {
    this.collection = 'seguimientos';
  }

  /**
   * Crear un nuevo seguimiento
   */
  async createSeguimiento(userId, seguimientoData) {
    try {
      const docRef = await addDoc(collection(db, this.collection), {
        ...seguimientoData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Seguimiento creado:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creando seguimiento:', error);
      throw new Error('Error al crear el seguimiento');
    }
  }

  /**
   * Obtener todos los seguimientos de un usuario
   */
  async getSeguimientos(userId) {
    try {
      const q = query(
        collection(db, this.collection),
        where('userId', '==', userId),
        orderBy('fechaContacto', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const seguimientos = [];

      querySnapshot.forEach((doc) => {
        seguimientos.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ Seguimientos obtenidos: ${seguimientos.length}`);
      return seguimientos;
    } catch (error) {
      console.error('❌ Error obteniendo seguimientos:', error);
      // Retornar array vacío en caso de error para no romper la UI
      return [];
    }
  }

  /**
   * Obtener seguimientos de un beneficiario específico
   */
  async getSeguimientosByBeneficiario(userId, beneficiarioId) {
    try {
      const q = query(
        collection(db, this.collection),
        where('userId', '==', userId),
        where('beneficiarioId', '==', beneficiarioId),
        orderBy('fechaContacto', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const seguimientos = [];

      querySnapshot.forEach((doc) => {
        seguimientos.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return seguimientos;
    } catch (error) {
      console.error('❌ Error obteniendo seguimientos del beneficiario:', error);
      return [];
    }
  }

  /**
   * Actualizar un seguimiento existente
   */
  async updateSeguimiento(seguimientoId, updateData) {
    try {
      const docRef = doc(db, this.collection, seguimientoId);
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Seguimiento actualizado:', seguimientoId);
      return true;
    } catch (error) {
      console.error('❌ Error actualizando seguimiento:', error);
      throw new Error('Error al actualizar el seguimiento');
    }
  }

  /**
   * Eliminar un seguimiento
   */
  async deleteSeguimiento(seguimientoId) {
    try {
      const docRef = doc(db, this.collection, seguimientoId);
      await deleteDoc(docRef);

      console.log('✅ Seguimiento eliminado:', seguimientoId);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando seguimiento:', error);
      throw new Error('Error al eliminar el seguimiento');
    }
  }

  /**
   * Obtener estadísticas de seguimientos por operadora
   */
  async getEstadisticasOperadora(userId, operadorId = null) {
    try {
      let q;
      
      if (operadorId) {
        q = query(
          collection(db, this.collection),
          where('userId', '==', userId),
          where('operadorId', '==', operadorId)
        );
      } else {
        q = query(
          collection(db, this.collection),
          where('userId', '==', userId)
        );
      }

      const querySnapshot = await getDocs(q);
      const seguimientos = [];

      querySnapshot.forEach((doc) => {
        seguimientos.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Calcular estadísticas
      const stats = {
        totalSeguimientos: seguimientos.length,
        exitosos: seguimientos.filter(s => s.tipoResultado === 'exitoso').length,
        fallidos: seguimientos.filter(s => s.tipoResultado === 'fallido').length,
        noRespuesta: seguimientos.filter(s => s.tipoResultado === 'no-respuesta').length,
        ocupados: seguimientos.filter(s => s.tipoResultado === 'ocupado').length,
        mensajes: seguimientos.filter(s => s.tipoResultado === 'mensaje').length,
        
        // Beneficiarios únicos contactados
        beneficiariosContactados: new Set(seguimientos.map(s => s.beneficiarioId || s.beneficiario)).size,
        
        // Seguimientos por tipo de contacto
        llamadas: seguimientos.filter(s => s.tipoContacto === 'llamada').length,
        videollamadas: seguimientos.filter(s => s.tipoContacto === 'videollamada').length,
        whatsapp: seguimientos.filter(s => s.tipoContacto === 'whatsapp').length,
        presenciales: seguimientos.filter(s => s.tipoContacto === 'presencial').length,
        
        // Seguimientos recientes (últimos 30 días)
        recientes: seguimientos.filter(s => {
          const fechaSeguimiento = new Date(s.fechaContacto);
          const hace30Dias = new Date();
          hace30Dias.setDate(hace30Dias.getDate() - 30);
          return fechaSeguimiento >= hace30Dias;
        }).length
      };

      // Calcular porcentajes
      stats.porcentajeExito = stats.totalSeguimientos > 0 
        ? Math.round((stats.exitosos / stats.totalSeguimientos) * 100) 
        : 0;

      return stats;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        totalSeguimientos: 0,
        exitosos: 0,
        fallidos: 0,
        noRespuesta: 0,
        ocupados: 0,
        mensajes: 0,
        beneficiariosContactados: 0,
        llamadas: 0,
        videollamadas: 0,
        whatsapp: 0,
        presenciales: 0,
        recientes: 0,
        porcentajeExito: 0
      };
    }
  }

  /**
   * Obtener beneficiarios con estado según regla 15/30 días
   */
  async getBeneficiariosConEstado(userId, beneficiarios = []) {
    try {
      const seguimientos = await this.getSeguimientos(userId);
      
      return beneficiarios.map(beneficiario => {
        const seguimientosBenef = seguimientos.filter(s => 
          s.beneficiarioId === beneficiario.id || 
          s.beneficiario === beneficiario.beneficiary
        );

        const contactosExitosos = seguimientosBenef.filter(s => s.tipoResultado === 'exitoso');
        
        if (contactosExitosos.length === 0) {
          return {
            ...beneficiario,
            estado: 'urgente',
            ultimoContacto: null,
            diasSinContacto: null,
            totalSeguimientos: seguimientosBenef.length
          };
        }

        const ultimoContacto = contactosExitosos.sort((a, b) => 
          new Date(b.fechaContacto) - new Date(a.fechaContacto)
        )[0];

        const diasSinContacto = Math.floor(
          (new Date() - new Date(ultimoContacto.fechaContacto)) / (1000 * 60 * 60 * 24)
        );

        let estado;
        if (diasSinContacto <= 15) {
          estado = 'al-dia';
        } else if (diasSinContacto <= 30) {
          estado = 'pendiente';
        } else {
          estado = 'urgente';
        }

        return {
          ...beneficiario,
          estado,
          ultimoContacto: ultimoContacto.fechaContacto,
          diasSinContacto,
          totalSeguimientos: seguimientosBenef.length
        };
      });
    } catch (error) {
      console.error('❌ Error calculando estados de beneficiarios:', error);
      return beneficiarios.map(b => ({ ...b, estado: 'urgente', totalSeguimientos: 0 }));
    }
  }

  /**
   * Buscar seguimientos por filtros
   */
  async buscarSeguimientos(userId, filtros = {}) {
    try {
      let q = query(
        collection(db, this.collection),
        where('userId', '==', userId)
      );

      // Aplicar filtros adicionales
      if (filtros.beneficiario) {
        q = query(q, where('beneficiario', '==', filtros.beneficiario));
      }

      if (filtros.tipoResultado) {
        q = query(q, where('tipoResultado', '==', filtros.tipoResultado));
      }

      if (filtros.tipoContacto) {
        q = query(q, where('tipoContacto', '==', filtros.tipoContacto));
      }

      if (filtros.operador) {
        q = query(q, where('operador', '==', filtros.operador));
      }

      // Ordenar por fecha más reciente
      q = query(q, orderBy('fechaContacto', 'desc'));

      const querySnapshot = await getDocs(q);
      const seguimientos = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Filtrar por rango de fechas en el cliente (ya que Firestore tiene limitaciones)
        if (filtros.fechaInicio && filtros.fechaFin) {
          const fechaSeguimiento = new Date(data.fechaContacto);
          const fechaInicio = new Date(filtros.fechaInicio);
          const fechaFin = new Date(filtros.fechaFin);
          
          if (fechaSeguimiento < fechaInicio || fechaSeguimiento > fechaFin) {
            return; // Skip este documento
          }
        }

        seguimientos.push({
          id: doc.id,
          ...data
        });
      });

      return seguimientos;
    } catch (error) {
      console.error('❌ Error buscando seguimientos:', error);
      return [];
    }
  }

  /**
   * Migrar datos existentes de llamadas a seguimientos (utilidad de una sola vez)
   */
  async migrarDatosLlamadas(userId, callData = []) {
    try {
      console.log('🔄 Iniciando migración de datos de llamadas...');
      
      const seguimientosMigrados = [];
      
      for (const call of callData) {
        const seguimiento = {
          beneficiarioId: call.id || null,
          beneficiario: call.beneficiary || call.beneficiario,
          telefono: call.phone || call.telefono,
          tipoContacto: 'llamada',
          tipoResultado: this.mapearResultadoLlamada(call.result || call.resultado),
          observaciones: call.observations || call.observaciones || '',
          fechaContacto: call.date || call.fecha || new Date().toISOString(),
          operadorId: userId,
          operador: call.operator || call.operador || 'Sistema',
          
          // Datos adicionales de la llamada original
          duracion: call.duration || call.duracion || 0,
          evento: call.event || call.evento || '',
          migrado: true, // Flag para identificar datos migrados
          datosOriginales: call
        };

        try {
          const docRef = await addDoc(collection(db, this.collection), {
            ...seguimiento,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          seguimientosMigrados.push(docRef.id);
        } catch (error) {
          console.error('Error migrando seguimiento:', call, error);
        }
      }

      console.log(`✅ Migración completada: ${seguimientosMigrados.length} seguimientos migrados`);
      return seguimientosMigrados;
    } catch (error) {
      console.error('❌ Error en migración:', error);
      throw new Error('Error en la migración de datos');
    }
  }

  /**
   * Mapear resultado de llamada antigua a nuevo formato
   */
  mapearResultadoLlamada(resultado) {
    if (!resultado) return 'fallido';
    
    const resultadoLower = resultado.toLowerCase();
    
    if (resultadoLower.includes('exitoso') || resultadoLower.includes('successful')) {
      return 'exitoso';
    } else if (resultadoLower.includes('ocupado') || resultadoLower.includes('busy')) {
      return 'ocupado';
    } else if (resultadoLower.includes('no contest') || resultadoLower.includes('no responde')) {
      return 'no-respuesta';
    } else if (resultadoLower.includes('mensaje') || resultadoLower.includes('message')) {
      return 'mensaje';
    } else {
      return 'fallido';
    }
  }

  /**
   * Limpiar seguimientos antiguos (opcional, para mantenimiento)
   */
  async limpiarSeguimientosAntiguos(userId, diasAntiguedad = 365) {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

      const q = query(
        collection(db, this.collection),
        where('userId', '==', userId),
        where('fechaContacto', '<', fechaLimite.toISOString())
      );

      const querySnapshot = await getDocs(q);
      const eliminados = [];

      for (const documento of querySnapshot.docs) {
        await deleteDoc(documento.ref);
        eliminados.push(documento.id);
      }

      console.log(`✅ Limpieza completada: ${eliminados.length} seguimientos antiguos eliminados`);
      return eliminados.length;
    } catch (error) {
      console.error('❌ Error en limpieza:', error);
      throw new Error('Error al limpiar seguimientos antiguos');
    }
  }
}

// Exportar instancia singleton
export const seguimientoService = new SeguimientoService();
export default seguimientoService;
