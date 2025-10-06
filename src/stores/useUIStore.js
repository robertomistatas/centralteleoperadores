/**
 * useUIStore.js
 * Store para gestión de UI global: toasts, modales, loading states
 * 
 * Refactorización: Centraliza estado de UI para eliminar alert() y window.location.reload()
 */

import { create } from 'zustand';

/**
 * Estado inicial del store
 */
const initialState = {
  // Sistema de toasts
  toasts: [],
  toastIdCounter: 0,
  
  // Estado de carga global
  isLoading: false,
  loadingMessage: '',
  
  // Sistema de modales
  modal: {
    isOpen: false,
    type: null,
    title: '',
    content: '',
    onConfirm: null,
    onCancel: null,
    data: null,
  },
  
  // Sidebar/drawer state (para mobile)
  isSidebarOpen: false,
};

/**
 * Store de UI
 */
export const useUIStore = create((set, get) => ({
  ...initialState,

  // ===== TOASTS =====
  
  /**
   * Añade un nuevo toast
   * @param {object} toast - {type, message, duration}
   */
  pushToast: (toast) => {
    const id = get().toastIdCounter + 1;
    const newToast = {
      id,
      type: toast.type || 'info',
      message: toast.message || '',
      duration: toast.duration !== undefined ? toast.duration : 5000,
    };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
      toastIdCounter: id,
    }));
  },

  /**
   * Elimina un toast por ID
   * @param {number} id - ID del toast
   */
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  /**
   * Elimina todos los toasts
   */
  clearToasts: () => {
    set({ toasts: [] });
  },

  /**
   * Helpers para tipos comunes de toast
   */
  showSuccess: (message, duration) => {
    get().pushToast({ type: 'success', message, duration });
  },

  showError: (message, duration) => {
    get().pushToast({ type: 'error', message, duration });
  },

  showInfo: (message, duration) => {
    get().pushToast({ type: 'info', message, duration });
  },

  showWarning: (message, duration) => {
    get().pushToast({ type: 'warning', message, duration });
  },

  // ===== LOADING STATES =====
  
  /**
   * Activa estado de carga global
   * @param {string} message - Mensaje opcional a mostrar
   */
  startLoading: (message = 'Cargando...') => {
    set({ isLoading: true, loadingMessage: message });
  },

  /**
   * Desactiva estado de carga global
   */
  stopLoading: () => {
    set({ isLoading: false, loadingMessage: '' });
  },

  // ===== MODALES =====
  
  /**
   * Abre un modal
   * @param {object} config - Configuración del modal
   */
  openModal: (config) => {
    set({
      modal: {
        isOpen: true,
        type: config.type || 'info',
        title: config.title || '',
        content: config.content || '',
        onConfirm: config.onConfirm || null,
        onCancel: config.onCancel || null,
        data: config.data || null,
      },
    });
  },

  /**
   * Cierra el modal
   */
  closeModal: () => {
    set({
      modal: {
        ...initialState.modal,
      },
    });
  },

  /**
   * Confirma acción del modal (ejecuta callback y cierra)
   */
  confirmModal: () => {
    const { modal } = get();
    if (modal.onConfirm) {
      modal.onConfirm(modal.data);
    }
    get().closeModal();
  },

  /**
   * Cancela acción del modal (ejecuta callback y cierra)
   */
  cancelModal: () => {
    const { modal } = get();
    if (modal.onCancel) {
      modal.onCancel();
    }
    get().closeModal();
  },

  // ===== SIDEBAR =====
  
  /**
   * Toggle sidebar
   */
  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  /**
   * Cierra sidebar
   */
  closeSidebar: () => {
    set({ isSidebarOpen: false });
  },

  // ===== RESET =====
  
  /**
   * Resetea el store a estado inicial
   */
  reset: () => {
    set(initialState);
  },
}));

export default useUIStore;
