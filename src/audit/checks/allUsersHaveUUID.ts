import { AuditContext, AuditResult } from '../auditEngine';
import { collectUsersFromContext, hasCanonicalUUID, normalizeEmail, summarizeUsers } from '../checkUtils';

const checkId = 'allUsersHaveUUID';
const label = 'Usuarios con UUID canónico';

export const allUsersHaveUUID = (context: AuditContext): AuditResult => {
  try {
    const users = collectUsersFromContext(context);

    if (!users.length) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Sin usuarios para validar.',
        details: 'No se encontraron usuarios en el contexto de auditoría.',
        affectedEntities: [],
        remediationHint: 'Cargar usuarios antes de ejecutar la auditoría.',
        durationMs: 0,
      };
    }

    const legacy = users.filter((u) => !hasCanonicalUUID(u));

    if (legacy.length === 0) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: 'Todos los usuarios tienen UUID canónico.',
        affectedEntities: [],
        remediationHint: 'Sin acciones requeridas.',
        durationMs: 0,
      };
    }

    return {
      id: checkId,
      label,
      status: 'WARN',
      severity: 'WARN',
      summary: `${legacy.length} usuarios legacy sin UUID canónico`,
      details: `Usuarios legacy: ${legacy.map((u) => normalizeEmail(u?.email) || u?.id || u?.uid).join(', ')}`,
      affectedEntities: summarizeUsers(legacy),
      remediationHint: 'Generar UUID de forma controlada fuera de la auditoría. No se corrige automáticamente.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error validando UUID de usuarios.',
      details: error?.message || 'Error validando UUID de usuarios',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default allUsersHaveUUID;
