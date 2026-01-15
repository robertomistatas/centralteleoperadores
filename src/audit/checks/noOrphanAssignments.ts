import { AuditContext, AuditResult } from '../auditEngine';

const checkId = 'noOrphanAssignments';
const label = 'Asignaciones huérfanas';

export const noOrphanAssignments = (context: AuditContext): AuditResult => {
  try {
    const snapshot = context?.assignmentsSnapshot;
    if (!snapshot) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Snapshot de asignaciones no disponible.',
        remediationHint: 'Proveer snapshot canónico antes de auditar.',
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
        summary: 'Snapshot sin estadísticas de orfandad.',
        remediationHint: 'Construir snapshot con buildCanonicalAssignmentsSnapshot para obtener stats.',
        durationMs: 0,
      };
    }

    if (stats.orphanAssignments <= 0) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: 'Sin asignaciones huérfanas.',
        affectedEntities: [],
        durationMs: 0,
      };
    }

    return {
      id: checkId,
      label,
      status: 'WARN',
      severity: 'WARN',
      summary: `${stats.orphanAssignments} asignaciones huérfanas detectadas`,
      details: 'Las asignaciones huérfanas no generan FAIL según el contrato técnico.',
      affectedEntities: [{ orphanAssignments: stats.orphanAssignments, totalAssignments: stats.totalAssignments }],
      remediationHint: 'Revisar y asociar manualmente las asignaciones huérfanas.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error validando asignaciones huérfanas.',
      details: error?.message || 'Error validando asignaciones huérfanas',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default noOrphanAssignments;
