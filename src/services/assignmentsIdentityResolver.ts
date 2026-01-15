export interface CanonicalOperator {
  id: string;
  uid?: string;
  email?: string;
  displayName?: string;
  name?: string;
  [key: string]: unknown;
}

const normalize = (value?: string) => value?.trim().toLowerCase() || '';
const normalizeDisplayName = (value?: string) => normalize(value).replace(/\s+/g, ' ');

export const resolveAssignmentOperatorId = (
  assignmentOperatorId: string,
  operators: CanonicalOperator[]
): string | null => {
  if (!assignmentOperatorId || !operators?.length) return null;

  const rawId = assignmentOperatorId.trim();
  const normalizedId = normalize(rawId);
  const normalizedDisplay = normalizeDisplayName(rawId);

  // 1) Exact UUID match (doc id)
  const exact = operators.find((op) => op?.id === rawId);
  if (exact) return exact.id;

  // 2) Match by UID
  const byUid = operators.find((op) => op?.uid && String(op.uid).trim() === rawId);
  if (byUid) return byUid.id;

  // 3) Match by email normalized/lower
  const byEmail = operators.find((op) => normalize(op.email as string) === normalizedId);
  if (byEmail) return byEmail.id;

  // 4) Match by displayName/name normalized
  const byName = operators.find(
    (op) => normalizeDisplayName((op.displayName as string) || (op.name as string)) === normalizedDisplay
  );
  if (byName) return byName.id;

  return null;
};
