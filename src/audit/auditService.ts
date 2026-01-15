import { AuditCheck, AuditContext, AuditReport, AuditResult, buildSummary, safeExecuteCheck } from './auditEngine';
import onlyOneSuperAdmin from './checks/onlyOneSuperAdmin';
import allUsersHaveUUID from './checks/allUsersHaveUUID';
import uniqueUserEmails from './checks/uniqueUserEmails';
import userRoleIsValid from './checks/userRoleIsValid';
import userStateIsValid from './checks/userStateIsValid';
import activeOperatorsAreValid from './checks/activeOperatorsAreValid';
import noInactiveOperatorInActiveList from './checks/noInactiveOperatorInActiveList';
import operatorIdentityResolvable from './checks/operatorIdentityResolvable';
import assignmentsHaveValidOperator from './checks/assignmentsHaveValidOperator';
import noOrphanAssignments from './checks/noOrphanAssignments';
import assignmentCountsMatchOperators from './checks/assignmentCountsMatchOperators';
import globalMetricsConsistency from './checks/globalMetricsConsistency';
import metricsUseCanonicalSnapshot from './checks/metricsUseCanonicalSnapshot';
import metricsPerOperatorConsistent from './checks/metricsPerOperatorConsistent';

const registeredChecks: Array<{ id: string; label: string; fn: AuditCheck }> = [
  // Identidad
  { id: 'onlyOneSuperAdmin', label: 'Solo un SUPER_ADMIN', fn: onlyOneSuperAdmin },
  { id: 'allUsersHaveUUID', label: 'Usuarios con UUID canónico', fn: allUsersHaveUUID },
  { id: 'uniqueUserEmails', label: 'Emails únicos por usuario', fn: uniqueUserEmails },
  { id: 'userRoleIsValid', label: 'Roles de usuario válidos', fn: userRoleIsValid },
  { id: 'userStateIsValid', label: 'Estado de usuario válido', fn: userStateIsValid },
  // Operadores
  { id: 'activeOperatorsAreValid', label: 'Operadores activos son canónicos', fn: activeOperatorsAreValid },
  { id: 'noInactiveOperatorInActiveList', label: 'Operadores activos sin inconsistencias', fn: noInactiveOperatorInActiveList },
  { id: 'operatorIdentityResolvable', label: 'Identidad de operadores resoluble', fn: operatorIdentityResolvable },
  // Asignaciones
  { id: 'assignmentsHaveValidOperator', label: 'Asignaciones con operador válido', fn: assignmentsHaveValidOperator },
  { id: 'noOrphanAssignments', label: 'Asignaciones huérfanas', fn: noOrphanAssignments },
  { id: 'assignmentCountsMatchOperators', label: 'Conteos de asignaciones vs operadores', fn: assignmentCountsMatchOperators },
  // Métricas
  { id: 'globalMetricsConsistency', label: 'Consistencia global de métricas', fn: globalMetricsConsistency },
  { id: 'metricsUseCanonicalSnapshot', label: 'Métricas usan snapshot canónico', fn: metricsUseCanonicalSnapshot },
  { id: 'metricsPerOperatorConsistent', label: 'Métricas por operador consistentes', fn: metricsPerOperatorConsistent },
];

export interface RunAuditOptions extends AuditContext {
  environment?: string;
}

export const auditService = {
  listChecks: () => registeredChecks.map((c) => ({ id: c.id, label: c.label })),

  async runAudit(options: RunAuditOptions = {}): Promise<AuditReport> {
    const started = performance.now ? performance.now() : Date.now();
    const context: AuditContext = {
      environment: options.environment || (typeof import.meta !== 'undefined' ? import.meta.env?.MODE : 'unknown') || 'unknown',
      currentUser: options.currentUser,
      userProfile: options.userProfile,
      users: options.users,
      operators: options.operators,
      assignmentsSnapshot: options.assignmentsSnapshot,
      metricsSnapshot: options.metricsSnapshot,
      metricsData: options.metricsData,
    };

    const results: AuditResult[] = [];

    for (const check of registeredChecks) {
      const result = await safeExecuteCheck(check.id, check.label, check.fn, context);
      results.push(result);
    }

    const ended = performance.now ? performance.now() : Date.now();
    const totalDuration = ended - started;

    return {
      timestamp: new Date().toISOString(),
      environment: context.environment || 'unknown',
      results,
      summary: buildSummary(results, totalDuration),
    };
  },
};

export default auditService;
