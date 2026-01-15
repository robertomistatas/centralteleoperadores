import { AuditContext, AuditResult } from '../auditEngine';

const checkId = 'assignmentsHaveValidOperator';
const label = 'Asignaciones resueltas a operador válido';

export const assignmentsHaveValidOperator = (context: AuditContext): AuditResult => {
  try {
    const snapshot = context?.assignmentsSnapshot;
    if (!snapshot) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Snapshot de asignaciones no disponible.',
        remediationHint: 'Proveer snapshot canónico de asignaciones antes de auditar.',
        durationMs: 0,
      };
    }

    const stats = snapshot.stats;
    if (!stats) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Snapshot sin estadísticas de resolución.',
        details: 'No se pudieron calcular asignaciones resueltas vs huérfanas.',
        remediationHint: 'Construir snapshot usando buildCanonicalAssignmentsSnapshot.',
        durationMs: 0,
      };
    }

    const unresolved = stats.totalAssignments - stats.resolvedAssignments;

    if (unresolved <= 0) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: 'Todas las asignaciones están vinculadas a operadores válidos.',
        affectedEntities: [],
        durationMs: 0,
      };
    }

    return {
      id: checkId,
      label,
      status: 'WARN',
      severity: 'WARN',
      summary: `${unresolved} asignaciones no se pudieron resolver a un operador válido`,
      details: 'Las asignaciones huérfanas se reportan como WARN (no FAIL).',
      affectedEntities: [{ totalAssignments: stats.totalAssignments, unresolvedAssignments: unresolved }],
      remediationHint: 'Revisar asignaciones huérfanas y asociarlas manualmente a un operador válido.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error validando asignaciones con operador válido.',
      details: error?.message || 'Error validando asignaciones con operador válido',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default assignmentsHaveValidOperator;
