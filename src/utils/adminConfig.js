/**
 * Configuración de administradores del sistema
 * Lista de emails con permisos de administrador
 */

// Lista de emails con permisos de administrador
export const ADMIN_EMAILS = [
  'roberto@mistatas.com',
  // Agregar más emails de administradores aquí
];

// Función para verificar si un usuario es administrador
export const isAdminUser = (user) => {
  if (!user?.email) return false;
  
  return (
    user.email.includes('admin') ||
    user.role === 'admin' ||
    ADMIN_EMAILS.includes(user.email)
  );
};

// Función para verificar permisos específicos
export const hasPermission = (user, permission) => {
  if (!user) return false;
  
  switch (permission) {
    case 'beneficiarios_base':
    case 'excel_upload':
    case 'beneficiary_management':
    case 'data_validation':
      return isAdminUser(user);
    
    case 'view_assignments':
    case 'view_calls':
      return true; // Todos los usuarios autenticados
    
    default:
      return isAdminUser(user);
  }
};

export default {
  ADMIN_EMAILS,
  isAdminUser,
  hasPermission
};
