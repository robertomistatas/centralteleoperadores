import { AuditContext, AuditResult } from '../auditEngine';
import { collectUsersFromContext, getNormalizedRole, summarizeUsers, isRoleValid } from '../checkUtils';

const checkId = 'userRoleIsValid';
const label = 'Roles de usuario válidos';

export const userRoleIsValid = (context: AuditContext): AuditResult => {
  try {
    const users = collectUsersFromContext(context);

    if (!users.length) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Sin usuarios para validar roles.',
        remediationHint: 'Cargar usuarios antes de auditar.',
        durationMs: 0,
      };
    }

    const invalid = users.filter((u) => !isRoleValid(u));

    if (!invalid.length) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: 'Todos los usuarios tienen roles válidos.',
        durationMs: 0,
      };
    }

    return {
      id: checkId,
      label,
      status: 'WARN',
      severity: 'WARN',
      summary: `${invalid.length} usuarios con rol no canónico`,
      details: 'Los roles válidos son SUPER_ADMIN, ADMIN, AUDITOR, SUPERVISOR, TELEOPERATOR.',
      affectedEntities: summarizeUsers(invalid),
      remediationHint: 'Corregir roles fuera de la auditoría. No se modifica automáticamente.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error validando roles de usuario.',
      details: error?.message || 'Error validando roles de usuario',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default userRoleIsValid;
