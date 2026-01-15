import { AuditContext, AuditResult } from '../auditEngine';
import { getTeleoperatorProfiles, getNormalizedStatus, normalizeEmail, summarizeUsers } from '../checkUtils';

const checkId = 'noInactiveOperatorInActiveList';
const label = 'Operadores activos sin inconsistencias';

export const noInactiveOperatorInActiveList = (context: AuditContext): AuditResult => {
  try {
    const users = Array.isArray(context?.users) ? context.users : [];
    const operators = Array.isArray(context?.operators) ? context.operators : [];

    if (!users.length && !operators.length) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Sin operadores cargados.',
        details: 'No se encontraron usuarios ni operadores para comparar.',
        remediationHint: 'Cargar operadores antes de auditar.',
        durationMs: 0,
      };
    }

    const teleoperators = getTeleoperatorProfiles(users);
    const inactiveProfiles = teleoperators.filter((u) => getNormalizedStatus(u) === 'inactive');
    const inactiveEmails = new Set(inactiveProfiles.map((u) => normalizeEmail(u.email)));

    const activeListMismatches = operators.filter((op) => {
      const email = normalizeEmail((op as any)?.email);
      return email && inactiveEmails.has(email);
    });

    if (activeListMismatches.length === 0) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: 'No hay operadores inactivos listados como activos.',
        durationMs: 0,
      };
    }

    return {
      id: checkId,
      label,
      status: 'WARN',
      severity: 'WARN',
      summary: `${activeListMismatches.length} operadores inactivos aparecen como activos`,
      details: 'Los operadores con estado inactive no deben figurar en la lista activa.',
      affectedEntities: summarizeUsers(activeListMismatches),
      remediationHint: 'Remover o desactivar los operadores inactivos de la lista activa.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error validando lista de operadores activos.',
      details: error?.message || 'Error validando operadores activos',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default noInactiveOperatorInActiveList;
