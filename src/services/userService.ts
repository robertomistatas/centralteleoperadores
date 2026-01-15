/*
 * Pure identity/role service (no UI, no Firestore, no side effects).
 * Maintains a canonical, single-source user registry in memory.
 */

import { CreateUserInput, OperatorIdentity, Role, UserRecord, UserStatus } from './userContract';

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const isValidRole = (value: any): value is Role => Object.values(Role).includes(value as Role);

const generateUuid = (): string => {
  const cryptoRef: any = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : null;
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  // Fallback RFC4122-ish generator (not cryptographically strong)
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${s4()}${s4()}-${s4()}-4${s4().slice(0, 3)}-${((8 + Math.random() * 4) | 0).toString(16)}${s4().slice(0, 3)}-${s4()}${s4()}${s4()}`;
};

const cloneUser = (user: UserRecord): UserRecord => ({ ...user, createdAt: new Date(user.createdAt) });
const normalizeId = (value: string) => (value || '').trim();

const sanitizeDisplayName = (name?: string) => {
  if (!name) return undefined;
  const trimmed = name.trim();
  if (!trimmed || trimmed.toLowerCase() === 'object') return undefined;
  return trimmed;
};

class UserService {
  private users: Map<string, UserRecord>;

  constructor(initialUsers: UserRecord[] = []) {
    this.users = new Map();
    initialUsers.forEach((user) => this.addInitialUser(user));
    this.ensureSingleSuperAdmin();
  }

  private addInitialUser(user: UserRecord) {
    this.validateUserRecord(user);
    if (this.users.has(user.id)) {
      throw new Error(`Duplicate user id detected during bootstrap: ${user.id}`);
    }
    this.users.set(user.id, cloneUser(user));
  }

  private ensureSingleSuperAdmin() {
    const superAdmins = Array.from(this.users.values()).filter((u) => u.role === Role.SUPER_ADMIN);
    if (superAdmins.length > 1) {
      throw new Error('SUPER_ADMIN must be unique across all users');
    }
  }

  private validateUserRecord(user: UserRecord) {
    if (!user || !user.id) throw new Error('User id is required');
    if (!isUuid(user.id)) throw new Error('User id must be a UUID');
    if (!user.role) throw new Error('User role is required');
    if (!isValidRole(user.role)) throw new Error(`Invalid role: ${user.role}`);
    if (!user.status) throw new Error('User status is required');
    if (user.role === Role.SUPER_ADMIN) this.ensureNoExistingSuperAdmin(user.id);
  }

  private ensureNoExistingSuperAdmin(incomingId?: string) {
    const existing = Array.from(this.users.values()).find((u) => u.role === Role.SUPER_ADMIN && u.id !== incomingId);
    if (existing) {
      throw new Error('Only one SUPER_ADMIN is allowed');
    }
  }

  createUser(data: CreateUserInput): UserRecord {
    if (!data || !data.role) {
      throw new Error('Role is required to create a user');
    }

    if (!isValidRole(data.role)) {
      throw new Error(`Invalid role: ${data.role}`);
    }

    if (data.role === Role.SUPER_ADMIN) {
      this.ensureNoExistingSuperAdmin();
    }

    const id = normalizeId(data.id || '') || generateUuid();
    if (!isUuid(id)) {
      throw new Error('Generated/Provided id must be a UUID');
    }

    const status: UserStatus = data.status || 'active';
    const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();

    const user: UserRecord = {
      id,
      role: data.role,
      status,
      createdAt,
      displayName: sanitizeDisplayName(data.displayName),
      email: data.email?.trim() || undefined,
    };

    this.users.set(id, user);
    return cloneUser(user);
  }

  getUserById(id: string): UserRecord | null {
    const normalizedId = normalizeId(id);
    if (!normalizedId) return null;
    const user = this.users.get(normalizedId);
    return user ? cloneUser(user) : null;
  }

  hasUser(id: string): boolean {
    const normalizedId = normalizeId(id);
    if (!normalizedId) return false;
    return this.users.has(normalizedId);
  }

  getAllUsers(): UserRecord[] {
    return Array.from(this.users.values()).map(cloneUser);
  }

  getUsersByRole(role: Role): UserRecord[] {
    if (!isValidRole(role)) return [];
    return Array.from(this.users.values())
      .filter((u) => u.role === role)
      .map(cloneUser);
  }

  getActiveOperators(): OperatorIdentity[] {
    return Array.from(this.users.values())
      .filter((u) => u.role === Role.TELEOPERATOR && u.status === 'active')
      .map((u) => ({ id: u.id, displayName: u.displayName, email: u.email }));
  }

  isSuperAdmin(userId: string): boolean {
    const user = this.getUserById(userId);
    return Boolean(user && user.role === Role.SUPER_ADMIN);
  }

  getOperatorLabel(userId: string): string | null {
    const user = this.getUserById(userId);
    if (!user) return null;
    return sanitizeDisplayName(user.displayName) || user.email || user.id;
  }
}

export const userService = new UserService();
export default userService;
