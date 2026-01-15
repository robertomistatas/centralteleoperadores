import { AuditContext, AuditResult } from '../auditEngine';

const checkId = 'metricsUseCanonicalSnapshot';
const label = 'Métricas basadas en snapshot canónico';

export const metricsUseCanonicalSnapshot = (context: AuditContext): AuditResult => {
  try {
    const metricsSnapshot = context?.metricsSnapshot;
    const assignmentsSnapshot = context?.assignmentsSnapshot;

    if (!metricsSnapshot) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Métricas no cargadas.',
        remediationHint: 'Generar snapshot de métricas antes de auditar.',
        durationMs: 0,
      };
    }

    if (!assignmentsSnapshot) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Snapshot de asignaciones no disponible para contrastar.',
        remediationHint: 'Proveer snapshot canónico de asignaciones para validar métricas.',
        durationMs: 0,
      };
    }

    const expectedAssigned = assignmentsSnapshot.totalBeneficiaries || 0;
    const actualAssigned = metricsSnapshot?.beneficiaries?.assignedBeneficiaries ?? 0;
    const operatorsWithAssignments = assignmentsSnapshot.operatorsWithAssignments || 0;
    const perOperatorCount = Object.keys(metricsSnapshot?.perOperator || {}).length;

    const mismatches: string[] = [];
    if (actualAssigned !== expectedAssigned) {
      mismatches.push(`assignedBeneficiaries=${actualAssigned} no coincide con snapshot=${expectedAssigned}`);
    }
    if (perOperatorCount < operatorsWithAssignments) {
      mismatches.push('perOperator no cubre todas las operadoras con asignaciones');
    }

    if (!mismatches.length) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: 'Métricas parecen usar el snapshot canónico de asignaciones.',
        durationMs: 0,
      };
    }

    return {
      id: checkId,
      label,
      status: 'WARN',
      severity: 'WARN',
      summary: 'Métricas no reflejan completamente el snapshot canónico.',
      details: mismatches.join(' | '),
      affectedEntities: [
        {
          expectedAssigned,
          actualAssigned,
          operatorsWithAssignments,
          perOperatorCount,
        },
      ],
      remediationHint: 'Regenerar métricas a partir del snapshot canónico antes de validar.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error validando uso de snapshot canónico en métricas.',
      details: error?.message || 'Error validando uso de snapshot canónico en métricas',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default metricsUseCanonicalSnapshot;
