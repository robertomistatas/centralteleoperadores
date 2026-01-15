import { AuditContext, AuditResult } from '../auditEngine';
import { collectUsersFromContext, getNormalizedStatus, summarizeUsers, isStatusValid } from '../checkUtils';

const checkId = 'userStateIsValid';
const label = 'Estados de usuario válidos';

export const userStateIsValid = (context: AuditContext): AuditResult => {
  try {
    const users = collectUsersFromContext(context);

    if (!users.length) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Sin usuarios para validar estado.',
        remediationHint: 'Cargar usuarios antes de auditar.',
        durationMs: 0,
      };
    }

    const invalid = users.filter((u) => !isStatusValid(u));

    if (!invalid.length) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: 'Todos los usuarios tienen estado válido (active/inactive).',
        durationMs: 0,
      };
    }

    return {
      id: checkId,
      label,
      status: 'WARN',
      severity: 'WARN',
      summary: `${invalid.length} usuarios con estado no canónico`,
      details: 'Solo se permiten estados active o inactive.',
      affectedEntities: summarizeUsers(invalid),
      remediationHint: 'Normalizar estados fuera de la auditoría. No se corrige automáticamente.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error validando estados de usuario.',
      details: error?.message || 'Error validando estados de usuario',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default userStateIsValid;
