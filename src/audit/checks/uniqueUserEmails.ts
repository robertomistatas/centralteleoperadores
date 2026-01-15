import { AuditContext, AuditResult } from '../auditEngine';
import { collectUsersFromContext, normalizeEmail, summarizeUsers } from '../checkUtils';

const checkId = 'uniqueUserEmails';
const label = 'Emails de usuario son únicos';

export const uniqueUserEmails = (context: AuditContext): AuditResult => {
  try {
    const users = collectUsersFromContext(context);

    if (!users.length) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Sin usuarios para validar emails.',
        remediationHint: 'Cargar usuarios antes de auditar.',
        durationMs: 0,
      };
    }

    const seen = new Map<string, any>();
    const duplicates: any[] = [];

    users.forEach((user) => {
      const email = normalizeEmail(user?.email);
      if (!email) return;
      if (seen.has(email)) {
        duplicates.push(user, seen.get(email));
      } else {
        seen.set(email, user);
      }
    });

    if (duplicates.length === 0) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: 'Emails de usuario son únicos.',
        durationMs: 0,
      };
    }

    return {
      id: checkId,
      label,
      status: 'WARN',
      severity: 'WARN',
      summary: 'Se encontraron emails duplicados.',
      details: 'Los emails deben ser únicos para mantener identidad canónica.',
      affectedEntities: summarizeUsers(duplicates),
      remediationHint: 'Unificar o corregir emails duplicados fuera de la auditoría.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error validando emails únicos.',
      details: error?.message || 'Error validando emails únicos',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default uniqueUserEmails;
