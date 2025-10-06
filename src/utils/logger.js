/**
 * logger.js
 * Sistema de logging centralizado que respeta el entorno de ejecución
 * 
 * Refactorización: Elimina console.log dispersos en producción y centraliza logging
 */

const isDevelopment = import.meta.env.MODE !== 'production';

/**
 * Configuración de niveles de log
 */
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

/**
 * Logger principal
 */
class Logger {
  constructor() {
    this.enabled = isDevelopment;
    this.level = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;
  }

  /**
   * Habilita/deshabilita logging manualmente
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Establece el nivel de logging
   */
  setLevel(level) {
    if (Object.values(LOG_LEVELS).includes(level)) {
      this.level = level;
    }
  }

  /**
   * Log nivel error (siempre se muestra)
   */
  error(...args) {
    console.error('❌ [ERROR]', ...args);
  }

  /**
   * Log nivel warning
   */
  warn(...args) {
    if (!this.enabled && this.level !== LOG_LEVELS.ERROR) return;
    console.warn('⚠️ [WARN]', ...args);
  }

  /**
   * Log nivel info
   */
  info(...args) {
    if (!this.enabled) return;
    if ([LOG_LEVELS.ERROR, LOG_LEVELS.WARN].includes(this.level)) return;
    console.info('ℹ️ [INFO]', ...args);
  }

  /**
   * Log nivel debug
   */
  debug(...args) {
    if (!this.enabled) return;
    if (this.level !== LOG_LEVELS.DEBUG) return;
    console.log('🔍 [DEBUG]', ...args);
  }

  /**
   * Log para operaciones de Firebase
   */
  firebase(...args) {
    if (!this.enabled) return;
    console.log('🔥 [FIREBASE]', ...args);
  }

  /**
   * Log para operaciones de Zustand stores
   */
  store(...args) {
    if (!this.enabled) return;
    console.log('📦 [STORE]', ...args);
  }

  /**
   * Log para métricas y analytics
   */
  metrics(...args) {
    if (!this.enabled) return;
    console.log('📊 [METRICS]', ...args);
  }

  /**
   * Log para operaciones de red/API
   */
  api(...args) {
    if (!this.enabled) return;
    console.log('🌐 [API]', ...args);
  }

  /**
   * Log para navegación y routing
   */
  navigation(...args) {
    if (!this.enabled) return;
    console.log('🧭 [NAV]', ...args);
  }

  /**
   * Log para autenticación
   */
  auth(...args) {
    if (!this.enabled) return;
    console.log('🔐 [AUTH]', ...args);
  }

  /**
   * Log con timestamp
   */
  time(label) {
    if (!this.enabled) return;
    console.time(`⏱️ ${label}`);
  }

  timeEnd(label) {
    if (!this.enabled) return;
    console.timeEnd(`⏱️ ${label}`);
  }

  /**
   * Log para tabla (útil en desarrollo)
   */
  table(data) {
    if (!this.enabled) return;
    console.table(data);
  }

  /**
   * Log agrupado
   */
  group(label, collapsed = false) {
    if (!this.enabled) return;
    if (collapsed) {
      console.groupCollapsed(label);
    } else {
      console.group(label);
    }
  }

  groupEnd() {
    if (!this.enabled) return;
    console.groupEnd();
  }
}

// Instancia singleton
const logger = new Logger();

export default logger;

// Exportar también los niveles para configuración
export { LOG_LEVELS };
