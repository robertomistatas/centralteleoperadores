/*
 * Canonical user contract and role catalog (pure, UI-agnostic).
 */

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  AUDITOR = 'AUDITOR',
  SUPERVISOR = 'SUPERVISOR',
  TELEOPERATOR = 'TELEOPERATOR'
}

export type UserStatus = 'active' | 'inactive';

export interface UserRecord {
  id: string; // UUID canonical identifier
  role: Role; // Mandatory single role
  status: UserStatus;
  createdAt: Date;
  displayName?: string; // Presentation only
  email?: string; // Presentation only
}

export interface CreateUserInput {
  id?: string; // Optional override (must still be a UUID)
  role: Role;
  status?: UserStatus;
  createdAt?: Date;
  displayName?: string;
  email?: string;
}

export interface OperatorIdentity {
  id: string;
  displayName?: string;
  email?: string;
}

export const ROLE_PRECEDENCE: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.AUDITOR,
  Role.SUPERVISOR,
  Role.TELEOPERATOR
];

