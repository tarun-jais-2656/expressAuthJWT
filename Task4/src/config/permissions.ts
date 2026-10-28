export const ROLES = ['user', 'moderator', 'admin', 'teacher', 'student'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'students:read:own',
  'students:read:class',
  'students:read:any',
  'students:write:any',
  'marks:read:own',
  'marks:read:class',
  'marks:read:any',
  'marks:write:class',
  'marks:write:any',
  'marks:averages:class',
  'marks:averages:any',
  'accounts:link',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  user: [],
  moderator: [],
  admin: PERMISSIONS,
  teacher: ['students:read:class', 'marks:read:class', 'marks:write:class', 'marks:averages:class'],
  student: ['students:read:own', 'marks:read:own'],
};

export const isRole = (value: string): value is Role => (ROLES as readonly string[]).includes(value);

/** The only role-name comparison in the project. Callers check permissions, or this helper for account-link rules. */
export const roleIs = (role: Role, expected: Role): boolean => role === expected;

export const hasPermission = (role: Role, permission: Permission): boolean =>
  (ROLE_PERMISSIONS[role] ?? []).includes(permission);

export const can = hasPermission;

export const permissionNamed = (
  resource: 'students' | 'marks',
  action: 'read' | 'write',
  scope: 'any' | 'class' | 'own',
): Permission | undefined => {
  const candidate = `${resource}:${action}:${scope}`;
  return (PERMISSIONS as readonly string[]).includes(candidate) ? (candidate as Permission) : undefined;
};
