import { resolveAssignmentOperatorId } from './assignmentsIdentityResolver';

export interface OperatorLike {
  id: string;
  [key: string]: unknown;
}

export interface AssignmentLike {
  operatorId?: string;
  [key: string]: unknown;
}

export interface CanonicalAssignmentsSnapshot {
  operators: OperatorLike[];
  assignmentsByOperatorId: Record<string, AssignmentLike[]>;
  totalOperators: number;
  totalBeneficiaries: number;
  operatorsWithAssignments: number;
  stats?: {
    totalAssignments: number;
    resolvedAssignments: number;
    orphanAssignments: number;
  };
}

interface BuildParams {
  operators?: OperatorLike[];
  assignments?: Record<string, AssignmentLike[]> | AssignmentLike[] | null;
}

export const buildCanonicalAssignmentsSnapshot = (
  { operators: inputOperators, assignments }: BuildParams
): CanonicalAssignmentsSnapshot => {
  const operators = (inputOperators && Array.isArray(inputOperators)
    ? inputOperators
    : [])
    .filter((op) => op && typeof op.id === 'string' && op.id.length > 0);

  const countAssignments = (source?: Record<string, AssignmentLike[]> | AssignmentLike[] | null) => {
    if (Array.isArray(source)) return source.filter(Boolean).length;
    if (source && typeof source === 'object') {
      return Object.values(source).reduce((acc, list) => acc + (Array.isArray(list) ? list.filter(Boolean).length : 0), 0);
    }
    return 0;
  };

  const inputCounts = {
    operators: operators.length,
    assignments: countAssignments(assignments)
  };

  if (!inputCounts.operators || !inputCounts.assignments) {
    console.log('[assignmentsSnapshot] Entrada vacía', inputCounts);
    return {
      operators,
      assignmentsByOperatorId: {},
      totalOperators: operators.length,
      totalBeneficiaries: 0,
      operatorsWithAssignments: 0,
      stats: {
        totalAssignments: 0,
        resolvedAssignments: 0,
        orphanAssignments: 0
      }
    };
  }

  const validOperatorIds = new Set(operators.map((op) => op.id));
  const assignmentsByOperatorId: Record<string, AssignmentLike[]> = {};
  const stats = {
    totalAssignments: 0,
    resolvedAssignments: 0,
    orphanAssignments: 0
  };

  const pushAssignment = (operatorId: string, assignment: AssignmentLike) => {
    if (!validOperatorIds.has(operatorId)) return;
    if (!assignmentsByOperatorId[operatorId]) assignmentsByOperatorId[operatorId] = [];
    assignmentsByOperatorId[operatorId].push(assignment);
  };

  const processAssignment = (assignment: AssignmentLike, fallbackOperatorId?: string) => {
    stats.totalAssignments += 1;
    const rawOperatorId = assignment?.operatorId || fallbackOperatorId;
    const resolvedId = rawOperatorId
      ? resolveAssignmentOperatorId(String(rawOperatorId), operators as any)
      : null;

    if (!resolvedId) {
      stats.orphanAssignments += 1;
      return;
    }

    const normalizedAssignment = { ...assignment, operatorId: resolvedId };
    pushAssignment(resolvedId, normalizedAssignment);
    stats.resolvedAssignments += 1;
  };

  if (Array.isArray(assignments)) {
    assignments.forEach((assignment) => {
      if (!assignment) return;
      processAssignment(assignment);
    });
  } else if (assignments && typeof assignments === 'object') {
    Object.entries(assignments).forEach(([maybeOperatorId, assignmentList]) => {
      if (!Array.isArray(assignmentList)) return;
      assignmentList.forEach((assignment) => {
        if (!assignment) return;
        processAssignment(assignment, maybeOperatorId);
      });
    });
  }

  const totalBeneficiaries = Object.values(assignmentsByOperatorId)
    .reduce((acc, list) => acc + (Array.isArray(list) ? list.length : 0), 0);
  const operatorsWithAssignments = Object.keys(assignmentsByOperatorId).length;

  console.log('[assignmentsSnapshot] Entrada normalizada', inputCounts);
  console.log('[assignmentsSnapshot] Resolución de asignaciones', stats);

  return {
    operators,
    assignmentsByOperatorId,
    totalOperators: operators.length,
    totalBeneficiaries,
    operatorsWithAssignments,
    stats
  };
};
