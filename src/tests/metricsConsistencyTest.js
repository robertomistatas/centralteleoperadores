/**
 * metricsConsistencyTest
 * Valida que los totales globales coincidan con la suma por operador y assignments.
 */

import { getAuditSnapshot } from '../services/metricsService';
import logger from '../utils/logger';

const asNumber = (value) => Number(value || 0);

export const runMetricsConsistencyTest = ({
  calls = [],
  seguimientos = [],
  operators = [],
  operatorAssignments = {},
  range = null,
} = {}) => {
  const snapshot = getAuditSnapshot({ calls, seguimientos, operators, operatorAssignments, range });
  const perOperator = Object.values(snapshot.perOperator || {});
  const summary = snapshot.summary || {};

  const totalsByOperator = perOperator.reduce(
    (acc, op) => {
      acc.calls += asNumber(op.calls.totalCalls);
      acc.successful += asNumber(op.calls.successfulCalls);
      acc.assignments += asNumber(op.assignments.totalAssigned);
      if (asNumber(op.assignments.totalAssigned) > 0) acc.operatorsWithAssignments += 1;
      return acc;
    },
    { calls: 0, successful: 0, assignments: 0, operatorsWithAssignments: 0 }
  );

  const checks = {
    calls: summary.totalCalls === totalsByOperator.calls,
    successfulCalls: summary.successfulCalls === totalsByOperator.successful,
    assignments: summary.totalAssignedBeneficiaries === totalsByOperator.assignments,
    operatorsWithAssignments: summary.operatorsWithAssignments === totalsByOperator.operatorsWithAssignments,
  };

  const allOk = Object.values(checks).every(Boolean);

  const report = {
    status: allOk ? 'OK' : 'FAIL',
    summary,
    totalsByOperator,
    checks,
  };

  logger.audit('[metricsConsistencyTest] Resultado', report);
  console.log('🧪 metricsConsistencyTest →', report.status);
  console.log('  totalCalls', summary.totalCalls, '==', totalsByOperator.calls, checks.calls ? '✅' : '⚠️');
  console.log('  successfulCalls', summary.successfulCalls, '==', totalsByOperator.successful, checks.successfulCalls ? '✅' : '⚠️');
  console.log('  totalAssignedBeneficiaries', summary.totalAssignedBeneficiaries, '==', totalsByOperator.assignments, checks.assignments ? '✅' : '⚠️');
  console.log('  operatorsWithAssignments', summary.operatorsWithAssignments, '==', totalsByOperator.operatorsWithAssignments, checks.operatorsWithAssignments ? '✅' : '⚠️');

  return report;
};

export const exampleConsistencyOk = {
  status: 'OK',
  summary: {
    totalCalls: 120,
    successfulCalls: 90,
    failedCalls: 30,
    totalAssignedBeneficiaries: 200,
    operatorsWithAssignments: 5,
  },
  totalsByOperator: {
    calls: 120,
    successful: 90,
    assignments: 200,
    operatorsWithAssignments: 5,
  },
  checks: {
    calls: true,
    successfulCalls: true,
    assignments: true,
    operatorsWithAssignments: true,
  },
};

export default { runMetricsConsistencyTest };
