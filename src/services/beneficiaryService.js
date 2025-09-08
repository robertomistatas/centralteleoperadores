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
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { normalizeString, normalizePhone, extractValidPhones } from '../utils/stringNormalization';

const COLLECTIONS = {
  BENEFICIARIES: 'beneficiaries',
  BENEFICIARY_UPLOADS: 'beneficiaryUploads'
};

/**
 * Servicio para gestión de beneficiarios base
 * Maneja la carga, validación y consulta de beneficiarios
 */
export const beneficiaryService = {
  /**
   * Procesa y guarda beneficiarios desde Excel
   * @param {Array} beneficiariesData - Datos de beneficiarios del Excel
   * @param {string} userId - ID del usuario que sube los datos
   * @param {Function} onProgress - Callback para progreso
   * @returns {Object} - Resultado del procesamiento
   */
  async uploadBeneficiaries(beneficiariesData, userId, onProgress = () => {}) {
    try {
      const batch = writeBatch(db);
      const uploadId = `upload_${Date.now()}`;
      const processedBeneficiaries = [];
      const errors = [];
      
      // Procesar cada beneficiario
      for (let i = 0; i < beneficiariesData.length; i++) {
        const rawData = beneficiariesData[i];
        
        try {
          // Normalizar y validar datos
          const processedBeneficiary = this.processBeneficiaryData(rawData, i + 1);
          
          if (processedBeneficiary.isValid) {
            // Crear documento en Firestore
            const docRef = doc(collection(db, COLLECTIONS.BENEFICIARIES));
            
            const beneficiaryDoc = {
              ...processedBeneficiary.data,
              uploadId,
              creadoEn: serverTimestamp(),
              actualizadoEn: serverTimestamp(),
              creadoPor: userId,
              rowNumber: i + 1
            };
            
            batch.set(docRef, beneficiaryDoc);
            processedBeneficiaries.push({
              id: docRef.id,
              ...beneficiaryDoc
            });
          } else {
            errors.push({
              row: i + 1,
              data: rawData,
              errors: processedBeneficiary.errors
            });
          }
        } catch (error) {
          errors.push({
            row: i + 1,
            data: rawData,
            errors: [`Error de procesamiento: ${error.message}`]
          });
        }
        
        // Reportar progreso
        onProgress({
          processed: i + 1,
          total: beneficiariesData.length,
          successful: processedBeneficiaries.length,
          errors: errors.length
        });
      }
      
      // Guardar metadatos del upload
      const uploadDoc = doc(collection(db, COLLECTIONS.BENEFICIARY_UPLOADS), uploadId);
      batch.set(uploadDoc, {
        id: uploadId,
        userId,
        totalRecords: beneficiariesData.length,
        successfulRecords: processedBeneficiaries.length,
        errorRecords: errors.length,
        uploadedAt: serverTimestamp(),
        status: 'completed'
      });
      
      // Ejecutar batch
      await batch.commit();
      
      return {
        success: true,
        uploadId,
        totalProcessed: beneficiariesData.length,
        successful: processedBeneficiaries.length,
        errors: errors.length,
        errorDetails: errors,
        data: processedBeneficiaries
      };
    } catch (error) {
      console.error('Error en uploadBeneficiaries:', error);
      throw new Error(`Error al cargar beneficiarios: ${error.message}`);
    }
  },

  /**
   * Procesa y valida los datos de un beneficiario individual
   * @param {Object} rawData - Datos crudos del Excel
   * @param {number} rowNumber - Número de fila para referencia
   * @returns {Object} - Datos procesados y validación
   */
  processBeneficiaryData(rawData, rowNumber) {
    const errors = [];
    
    // Extraer datos de las columnas esperadas
    const nombre = rawData.Nombre || rawData.nombre || rawData.A || '';
    const fono = rawData.Fono || rawData.fono || rawData.B || '';
    const sim = rawData.Sim || rawData.sim || rawData.C || '';
    const direccion = rawData.Direccion || rawData.direccion || rawData.D || '';
    const appSim = rawData['App Sim'] || rawData.appSim || rawData.E || '';
    
    // Validar nombre (obligatorio)
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      errors.push('Nombre es obligatorio');
    }
    
    // Validar dirección (obligatoria)
    if (!direccion || typeof direccion !== 'string' || direccion.trim().length === 0) {
      errors.push('Dirección es obligatoria');
    }
    
    // Procesar teléfonos
    const normalizedFono = normalizePhone(fono);
    const normalizedSim = normalizePhone(sim);
    const normalizedAppSim = normalizePhone(appSim);
    
    // Validar que al menos un teléfono sea válido
    const validPhones = [normalizedFono, normalizedSim, normalizedAppSim].filter(Boolean);
    if (validPhones.length === 0) {
      errors.push('Al menos un teléfono válido es requerido');
    }
    
    const processedData = {
      nombre: nombre.toString().trim(),
      fono: normalizedFono || null,
      sim: normalizedSim || null,
      direccion: direccion.toString().trim(),
      appSim: normalizedAppSim || null,
      // Campos para búsqueda optimizada
      nombreNormalizado: normalizeString(nombre),
      telefonosValidos: validPhones,
      // Metadata
      datosOriginales: {
        nombre,
        fono: fono.toString(),
        sim: sim.toString(),
        direccion,
        appSim: appSim.toString()
      }
    };
    
    return {
      isValid: errors.length === 0,
      errors,
      data: processedData
    };
  },

  /**
   * Obtiene todos los beneficiarios
   * @param {string} userId - ID del usuario (opcional para filtrar)
   * @returns {Array} - Lista de beneficiarios
   */
  async getAllBeneficiaries(userId = null) {
    try {
      let q;
      
      if (userId) {
        q = query(
          collection(db, COLLECTIONS.BENEFICIARIES),
          where('creadoPor', '==', userId),
          orderBy('creadoEn', 'desc')
        );
      } else {
        q = query(
          collection(db, COLLECTIONS.BENEFICIARIES),
          orderBy('creadoEn', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error al obtener beneficiarios:', error);
      return [];
    }
  },

  /**
   * Busca beneficiarios por nombre o teléfono
   * @param {string} searchTerm - Término de búsqueda
   * @returns {Array} - Beneficiarios encontrados
   */
  async searchBeneficiaries(searchTerm) {
    try {
      const allBeneficiaries = await this.getAllBeneficiaries();
      
      if (!searchTerm || searchTerm.trim().length === 0) {
        return allBeneficiaries;
      }
      
      const normalizedSearch = normalizeString(searchTerm);
      const phoneSearch = normalizePhone(searchTerm);
      
      return allBeneficiaries.filter(beneficiary => {
        // Búsqueda por nombre
        if (beneficiary.nombreNormalizado && 
            beneficiary.nombreNormalizado.includes(normalizedSearch)) {
          return true;
        }
        
        // Búsqueda por teléfonos
        if (phoneSearch && beneficiary.telefonosValidos) {
          return beneficiary.telefonosValidos.some(phone => 
            phone.includes(phoneSearch)
          );
        }
        
        return false;
      });
    } catch (error) {
      console.error('Error en búsqueda de beneficiarios:', error);
      return [];
    }
  },

  /**
   * Obtiene un beneficiario por ID
   * @param {string} beneficiaryId - ID del beneficiario
   * @returns {Object|null} - Beneficiario o null
   */
  async getBeneficiaryById(beneficiaryId) {
    try {
      const docRef = doc(db, COLLECTIONS.BENEFICIARIES, beneficiaryId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error al obtener beneficiario:', error);
      return null;
    }
  },

  /**
   * Actualiza un beneficiario
   * @param {string} beneficiaryId - ID del beneficiario
   * @param {Object} updates - Datos a actualizar
   * @returns {boolean} - Éxito de la operación
   */
  async updateBeneficiary(beneficiaryId, updates) {
    try {
      const docRef = doc(db, COLLECTIONS.BENEFICIARIES, beneficiaryId);
      
      const processedUpdates = {
        ...updates,
        actualizadoEn: serverTimestamp()
      };
      
      // Si se actualiza el nombre, actualizar también la versión normalizada
      if (updates.nombre) {
        processedUpdates.nombreNormalizado = normalizeString(updates.nombre);
      }
      
      // Si se actualizan teléfonos, recalcular teléfonos válidos
      if (updates.fono !== undefined || updates.sim !== undefined || updates.appSim !== undefined) {
        const currentDoc = await this.getBeneficiaryById(beneficiaryId);
        if (currentDoc) {
          const updatedBeneficiary = { ...currentDoc, ...updates };
          processedUpdates.telefonosValidos = extractValidPhones(updatedBeneficiary);
        }
      }
      
      await updateDoc(docRef, processedUpdates);
      return true;
    } catch (error) {
      console.error('Error al actualizar beneficiario:', error);
      return false;
    }
  },

  /**
   * Elimina un beneficiario
   * @param {string} beneficiaryId - ID del beneficiario
   * @returns {boolean} - Éxito de la operación
   */
  async deleteBeneficiary(beneficiaryId) {
    try {
      const docRef = doc(db, COLLECTIONS.BENEFICIARIES, beneficiaryId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error al eliminar beneficiario:', error);
      return false;
    }
  },

  /**
   * Obtiene historial de uploads
   * @param {string} userId - ID del usuario
   * @returns {Array} - Historial de uploads
   */
  async getUploadHistory(userId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.BENEFICIARY_UPLOADS),
        where('userId', '==', userId),
        orderBy('uploadedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return [];
    }
  },

  /**
   * Valida si un beneficiario existe por nombre o teléfono
   * @param {string} name - Nombre a buscar
   * @param {string} phone - Teléfono a buscar
   * @returns {Object|null} - Beneficiario encontrado o null
   */
  async validateBeneficiaryExists(name, phone) {
    try {
      const allBeneficiaries = await this.getAllBeneficiaries();
      
      const normalizedName = normalizeString(name);
      const normalizedPhone = normalizePhone(phone);
      
      return allBeneficiaries.find(beneficiary => {
        // Coincidencia por nombre
        if (normalizedName && beneficiary.nombreNormalizado === normalizedName) {
          return true;
        }
        
        // Coincidencia por teléfono
        if (normalizedPhone && beneficiary.telefonosValidos) {
          return beneficiary.telefonosValidos.includes(normalizedPhone);
        }
        
        return false;
      }) || null;
    } catch (error) {
      console.error('Error al validar beneficiario:', error);
      return null;
    }
  }
};
