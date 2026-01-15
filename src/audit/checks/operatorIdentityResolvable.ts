import { AuditContext, AuditResult } from '../auditEngine';
import { getCanonicalTeleoperators, normalizeEmail, summarizeUsers } from '../checkUtils';

const checkId = 'operatorIdentityResolvable';
const label = 'Identidad de operadores resoluble';

export const operatorIdentityResolvable = (context: AuditContext): AuditResult => {
  try {
    const operators = Array.isArray(context?.assignmentsSnapshot?.operators)
      ? context?.assignmentsSnapshot?.operators
      : Array.isArray(context?.operators)
      ? context?.operators
      : [];
    const users = Array.isArray(context?.users) ? context.users : [];

    if (!operators.length) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Sin operadores en snapshot para validar identidad.',
        remediationHint: 'Cargar snapshot de asignaciones antes de auditar.',
        durationMs: 0,
      };
    }

    const canonicalTeleops = getCanonicalTeleoperators(users);
    if (!canonicalTeleops.length) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'No hay teleoperadores canónicos contra los que resolver.',
        remediationHint: 'Regularizar teleoperadores canónicos y re-ejecutar.',
        durationMs: 0,
      };
    }

    const canonicalIds = new Set(canonicalTeleops.map((u) => (u?.id || u?.uid || '').toString().trim()).filter(Boolean));
    const canonicalEmails = new Set(canonicalTeleops.map((u) => normalizeEmail(u?.email)).filter(Boolean));

    const unresolved = operators.filter((op: any) => {
      const id = (op?.id || '').toString().trim();
      const email = normalizeEmail(op?.email as string);
      return !canonicalIds.has(id) && !(email && canonicalEmails.has(email));
    });

    if (!unresolved.length) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: 'Todas las operadoras se resuelven a perfiles canónicos.',
        durationMs: 0,
      };
    }

    return {
      id: checkId,
      label,
      status: 'WARN',
      severity: 'WARN',
      summary: `${unresolved.length} operadoras no se pudieron resolver contra perfiles canónicos`,
      details: 'Las operadoras legacy o sin UUID se reportan como WARN (no FAIL).',
      affectedEntities: summarizeUsers(unresolved),
      remediationHint: 'Actualizar identidad (UUID/email) de las operadoras fuera de la auditoría.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error validando resolución de identidad de operadores.',
      details: error?.message || 'Error validando identidad de operadores',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default operatorIdentityResolvable;
