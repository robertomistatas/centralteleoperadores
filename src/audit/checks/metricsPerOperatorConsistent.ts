import { AuditContext, AuditResult } from '../auditEngine';

const checkId = 'metricsPerOperatorConsistent';
const label = 'Métricas por operador consistentes';

const near = (a: number, b: number, epsilon = 0.0001) => Math.abs(a - b) <= epsilon;

export const metricsPerOperatorConsistent = (context: AuditContext): AuditResult => {
  try {
    const snapshot = context?.metricsSnapshot;
    if (!snapshot) {
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

    const perOperator = snapshot.perOperator || {};
    const operatorKeys = Object.keys(perOperator);
    if (!operatorKeys.length) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Sin métricas por operador para validar.',
        remediationHint: 'Calcular métricas por operador antes de auditar.',
        durationMs: 0,
      };
    }

    const totals = operatorKeys.reduce(
      (acc, key) => {
        const op = perOperator[key];
        acc.calls.total += op?.calls?.totalCalls ?? 0;
        acc.calls.success += op?.calls?.successfulCalls ?? 0;
        acc.calls.failed += op?.calls?.failedCalls ?? 0;
        acc.beneficiaries.assigned += op?.beneficiaries?.assignedBeneficiaries ?? 0;
        acc.beneficiaries.contacted += op?.beneficiaries?.contactedBeneficiaries ?? 0;
        acc.beneficiaries.uncontacted += op?.beneficiaries?.uncontactedBeneficiaries ?? 0;
        return acc;
      },
      {
        calls: { total: 0, success: 0, failed: 0 },
        beneficiaries: { assigned: 0, contacted: 0, uncontacted: 0 },
      }
    );

    const globalCalls = snapshot.calls || { totalCalls: 0, successfulCalls: 0, failedCalls: 0 };
    const globalBeneficiaries = snapshot.beneficiaries || {
      assignedBeneficiaries: 0,
      contactedBeneficiaries: 0,
      uncontactedBeneficiaries: 0,
    };

    const issues: string[] = [];
    if (!near(totals.calls.total, globalCalls.totalCalls)) {
      issues.push(`Suma per-operator totalCalls=${totals.calls.total} difiere de global=${globalCalls.totalCalls}`);
    }
    if (!near(totals.calls.success, globalCalls.successfulCalls)) {
      issues.push('Suma de successfulCalls per-operator difiere del global');
    }
    if (!near(totals.calls.failed, globalCalls.failedCalls)) {
      issues.push('Suma de failedCalls per-operator difiere del global');
    }

    if (!near(totals.beneficiaries.assigned, globalBeneficiaries.assignedBeneficiaries)) {
      issues.push('Suma de asignados per-operator difiere del global');
    }
    if (!near(totals.beneficiaries.contacted, globalBeneficiaries.contactedBeneficiaries)) {
      issues.push('Suma de contactados per-operator difiere del global');
    }
    if (!near(totals.beneficiaries.uncontacted, globalBeneficiaries.uncontactedBeneficiaries)) {
      issues.push('Suma de sin contacto per-operator difiere del global');
    }

    if (!issues.length) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: 'Las métricas por operador cuadran con el global.',
        durationMs: 0,
      };
    }

    return {
      id: checkId,
      label,
      status: 'WARN',
      severity: 'WARN',
      summary: 'Diferencias entre el agregado per-operator y el global.',
      details: issues.join(' | '),
      affectedEntities: [
        {
          perOperatorTotals: totals,
          globalCalls,
          globalBeneficiaries,
        },
      ],
      remediationHint: 'Regenerar métricas asegurando que el global sea la suma de per-operator.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error validando consistencia per-operator.',
      details: error?.message || 'Error validando consistencia per-operator',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default metricsPerOperatorConsistent;
