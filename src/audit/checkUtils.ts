import { AuditContext } from './auditEngine';
import { Role } from '../services/userContract';

// Catálogo alineado a snapshots reales (se aceptan variantes en minúsculas)
const VALID_ROLES = new Set<string>([
  Role.SUPER_ADMIN.toLowerCase(),
  Role.ADMIN.toLowerCase(),
  Role.AUDITOR.toLowerCase(),
  Role.SUPERVISOR.toLowerCase(),
  Role.TELEOPERATOR.toLowerCase(),
  'super_admin',
  'admin',
  'teleoperadora',
]);
const VALID_STATUS = new Set<string>(['active', 'inactive']);

export const normalizeEmail = (value?: string | null) => (value || '').trim().toLowerCase();

export const normalizeText = (value?: string | null) => (value || '').toString().trim();

export const getNormalizedRole = (user: any) => (user?.role || user?.userRole || '').toString().trim().toLowerCase();

export const getNormalizedStatus = (user: any): 'active' | 'inactive' | 'unknown' => {
  const raw = (user?.status || '').toString().toLowerCase();
  if (raw === 'active' || raw === 'inactive') return raw;
  if (user?.isActive === false) return 'inactive';
  if (user?.isActive === true) return 'active';
  return 'unknown';
};

export const hasCanonicalUUID = (user: any) => Boolean(normalizeText(user?.id || user?.uid));

export const isRoleValid = (user: any) => VALID_ROLES.has(getNormalizedRole(user));

export const isStatusValid = (user: any) => VALID_STATUS.has(getNormalizedStatus(user));

export const isCanonicalUser = (user: any) => hasCanonicalUUID(user) && isRoleValid(user) && isStatusValid(user);

export const dedupeUsers = (users: any[]): any[] => {
  const seen = new Set<string>();
  return users.filter((user) => {
    if (!user) return false;
    const email = normalizeEmail(user.email);
    const id = normalizeText(user.id || user.uid);
    const key = email || id;
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const collectUsersFromContext = (context: AuditContext): any[] => {
  const pool: any[] = [];
  if (Array.isArray(context?.users)) pool.push(...context.users);
  if (context?.userProfile) pool.push(context.userProfile);
  if (context?.currentUser) {
    const email = normalizeEmail((context.currentUser as any)?.email);
    const alreadyAdded = pool.some((u) => normalizeEmail(u?.email) === email);
    if (!alreadyAdded) {
      pool.push({
        ...context.currentUser,
        id: (context.currentUser as any)?.uid || (context.currentUser as any)?.id,
      });
    }
  }
  return dedupeUsers(pool);
};

export const getTeleoperatorProfiles = (users: any[]) =>
  users.filter((u) => getNormalizedRole(u) === Role.TELEOPERATOR);

export const getCanonicalTeleoperators = (users: any[]) =>
  users.filter(
    (u) => getNormalizedRole(u) === Role.TELEOPERATOR && getNormalizedStatus(u) === 'active' && hasCanonicalUUID(u)
  );

export const summarizeUsers = (users: any[]) =>
  users.map((u) => normalizeEmail(u?.email) || normalizeText(u?.displayName) || normalizeText(u?.name) || normalizeText(u?.id || u?.uid));
