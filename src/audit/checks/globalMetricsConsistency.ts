import { AuditContext, AuditResult } from '../auditEngine';

const checkId = 'globalMetricsConsistency';
const label = 'Consistencia global de métricas';

const near = (a: number, b: number, epsilon = 0.0001) => Math.abs(a - b) <= epsilon;

export const globalMetricsConsistency = (context: AuditContext): AuditResult => {
  try {
    const snapshot = context?.metricsSnapshot;

    if (!snapshot || !snapshot.calls) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Métricas no cargadas.',
        remediationHint: 'Ejecutar la auditoría con snapshot de métricas canónicas.',
        durationMs: 0,
      };
    }

    const { calls, beneficiaries, temporal } = snapshot;

    const numericOrNull = (v: any) => (typeof v === 'number' ? v : null);
    const totalCalls = numericOrNull(calls.totalCalls);
    const successfulCalls = numericOrNull(calls.successfulCalls);
    const failedCalls = numericOrNull(calls.failedCalls);
    const successRate = numericOrNull(calls.successRate);

    if (totalCalls === null || successfulCalls === null || failedCalls === null) {
      return {
        id: checkId,
        label,
        status: 'SKIPPED',
        severity: 'SKIPPED',
        summary: 'Métricas incompletas en snapshot (faltan totales de llamadas).',
        remediationHint: 'Proveer totalCalls, successfulCalls y failedCalls en el snapshot.',
        durationMs: 0,
      };
    }

    const issues: string[] = [];
    const affected: any[] = [];

    const expectedTotalCalls = successfulCalls + failedCalls;
    if (totalCalls !== expectedTotalCalls) {
      issues.push('totalCalls no coincide con successfulCalls + failedCalls');
      affected.push({
        expectedTotalCalls,
        actualTotalCalls: totalCalls,
        snapshot: 'global.calls',
      });
    }

    if (successRate !== null) {
      const expectedSuccessRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
      if (!near(successRate, expectedSuccessRate, 0.01)) {
        issues.push('successRate no coincide con successfulCalls/totalCalls');
        affected.push({
          expectedSuccessRate: Number(expectedSuccessRate.toFixed(2)),
          actualSuccessRate: Number(successRate.toFixed(2)),
          snapshot: 'global.calls',
        });
      }
    }

    if (beneficiaries) {
      const assigned = numericOrNull(beneficiaries.assignedBeneficiaries) ?? 0;
      const contacted = numericOrNull(beneficiaries.contactedBeneficiaries) ?? 0;
      const uncontacted = numericOrNull(beneficiaries.uncontactedBeneficiaries);
      if (uncontacted !== null) {
        const expectedUncontacted = Math.max(0, assigned - contacted);
        if (!near(uncontacted, expectedUncontacted)) {
          issues.push('uncontactedBeneficiaries no cuadra con assigned-contacted');
          affected.push({
            expectedUncontacted,
            actualUncontacted: uncontacted,
            snapshot: 'global.beneficiaries',
          });
        }
      }
    }

    if (temporal && beneficiaries) {
      const temporalTotal = (numericOrNull(temporal.upToDate) || 0) + (numericOrNull(temporal.pending) || 0) + (numericOrNull(temporal.urgent) || 0);
      const assigned = numericOrNull(beneficiaries?.assignedBeneficiaries);
      if (assigned !== null && assigned > 0 && temporalTotal !== assigned) {
        issues.push('Suma de estados temporales no coincide con asignados');
        affected.push({
          expectedTemporalTotal: assigned,
          actualTemporalTotal: temporalTotal,
          snapshot: 'global.temporal',
        });
      }
    }

    if (issues.length === 0) {
      return {
        id: checkId,
        label,
        status: 'OK',
        severity: 'OK',
        summary: 'Métricas coherentes con el snapshot provisto.',
        affectedEntities: [],
        remediationHint: 'Sin acciones requeridas.',
        durationMs: 0,
      };
    }

    const totalMismatch = totalCalls !== expectedTotalCalls;
    const status: AuditResult['status'] = totalMismatch ? 'FAIL' : 'WARN';

    return {
      id: checkId,
      label,
      status,
      severity: status,
      summary: totalMismatch
        ? 'totalCalls no coincide con successfulCalls + failedCalls'
        : 'Se detectaron inconsistencias menores en métricas',
      details: issues.join(' | '),
      affectedEntities: affected,
      remediationHint: 'Usar el snapshot de métricas provisto; revisar fuentes de los totales.',
      durationMs: 0,
    };
  } catch (error: any) {
    return {
      id: checkId,
      label,
      status: 'FAIL',
      severity: 'FAIL',
      summary: 'Error validando consistencia de métricas.',
      details: error?.message || 'Error validando consistencia de métricas',
      remediationHint: 'Revisar el motor de auditoría y volver a ejecutar.',
      durationMs: 0,
    };
  }
};

export default globalMetricsConsistency;
