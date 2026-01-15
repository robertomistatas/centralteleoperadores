import { AuditContext, AuditResult } from '../auditEngine';

const checkId = 'assignmentCountsMatchOperators';
const label = 'Conteos de asignaciones vs operadores';

export const assignmentCountsMatchOperators = (context: AuditContext): AuditResult => {
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
        summary: 'Snapshot sin estadísticas de conteo.',
        remediationHint: 'Usar buildCanonicalAssignmentsSnapshot para obtener stats.',
        durationMs: 0,
      };
    }

    const expectedResolved = stats.resolvedAssignments;
    const actualResolved = snapshot.totalBeneficiaries;
    const operatorsWithAssignments = snapshot.operatorsWithAssignments;
    const operatorLimitOk = operatorsWithAssignments <= snapshot.totalOperators;

    const mismatches: string[] = [];
    if (actualResolved !== expectedResolved) {
      mismatches.push(`totalBeneficiaries=${actualResolved} no coincide con asignaciones resueltas=${expectedResolved}`);
    }
    if (!operatorLimitOk) {
      mismatches.push('operatorsWithAssignments excede totalOperators (verificar snapshot)');
    }

    if (!mismatches.length) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: 'Conteos de asignaciones alineados con operadores válidos.',
        durationMs: 0,
      };
    }

    return {
      id: checkId,
      label,
      status: 'WARN',
      severity: 'WARN',
      summary: 'Conteos de asignaciones no alinean con operadores válidos.',
      details: mismatches.join(' | '),
      affectedEntities: [
        {
          expectedResolvedAssignments: expectedResolved,
          actualResolvedAssignments: actualResolved,
          totalAssignments: stats.totalAssignments,
          orphanAssignments: stats.orphanAssignments,
          operatorsWithAssignments,
          totalOperators: snapshot.totalOperators,
        },
      ],
      remediationHint: 'Reconstruir snapshot con operadores canónicos y revisar conteos.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error validando conteos de asignaciones.',
      details: error?.message || 'Error validando conteos de asignaciones',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default assignmentCountsMatchOperators;
