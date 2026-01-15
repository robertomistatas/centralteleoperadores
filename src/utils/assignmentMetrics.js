// Canonical assignment metrics helper
// A valid assignment requires: operatorId present, operator exists and is active.

export const getCanonicalAssignmentsMetrics = (operators = [], operatorAssignments = {}) => {
  const validOperators = (operators || []).filter(op => op && op.isActive !== false && op.id);
  const validOperatorIds = new Set(validOperators.map(op => op.id));

  const assignmentsByOperator = {};
  let totalAssignments = 0;

  validOperatorIds.forEach(opId => {
    const list = operatorAssignments?.[opId] || [];
    const seen = new Set();
    const deduped = [];
    list.forEach(a => {
      const key = a?.id;
      if (key) {
        if (seen.has(key)) return;
        seen.add(key);
      }
      deduped.push(a);
    });
    assignmentsByOperator[opId] = deduped;
    totalAssignments += deduped.length;
  });

  const operatorsWithAssignments = Object.values(assignmentsByOperator).filter(list => (list?.length || 0) > 0).length;

  return {
    validOperators,
    assignmentsByOperator,
    totalAssignments,
    operatorsWithAssignments
  };
};
