import type { Role } from '../src/config/permissions.js';
import type { User } from '../src/modules/user/user.interface.js';

const stamp = new Date('2026-01-01T00:00:00.000Z');

export const account = (id: number, role: Role, extras: Partial<User> = {}): User => ({
  id,
  name: extras.name ?? `User ${id}`,
  email: extras.email ?? `user${id}@school.test`,
  role,
  studentId: extras.studentId ?? null,
  passwordHash: extras.passwordHash ?? null,
  createdAt: extras.createdAt ?? stamp,
  updatedAt: extras.updatedAt ?? stamp,
});
