import { hasPermission, permissionNamed } from '../../config/permissions.js';
import { forbidden } from '../../errors/AppError.js';
import type { Actor, ClassAssignment, ScopedStudent } from './actor.js';
import * as accessRepository from './access.repository.js';

/**
 * Own means the linked student record. Class means a row in teacher_classes.
 * :any wins. There is no role-name branch here.
 */
export const canAccessStudent = async (
  actor: Actor,
  student: ScopedStudent,
  action: 'read' | 'write',
  resource: 'students' | 'marks' = 'students',
): Promise<boolean> => {
  const anyPermission = permissionNamed(resource, action, 'any');
  if (anyPermission && hasPermission(actor.role, anyPermission)) return true;

  const classPermission = permissionNamed(resource, action, 'class');
  if (classPermission && hasPermission(actor.role, classPermission)) {
    const classes = await accessRepository.listTeacherClasses(actor.id);
    return classes.some((row) => row.className === student.className && row.section === student.section);
  }

  const ownPermission = permissionNamed(resource, action, 'own');
  if (ownPermission && hasPermission(actor.role, ownPermission)) {
    const linkedId = await accessRepository.findLinkedStudentId(actor.id);
    return linkedId === student.id;
  }

  return false;
};

export type StudentListScope =
  | { kind: 'all' }
  | { kind: 'classes'; classes: ClassAssignment[] }
  | { kind: 'ids'; ids: number[] }
  | { kind: 'none' };

/** List endpoints filter. A caller with no read permission is refused. */
export const studentListScope = async (actor: Actor): Promise<StudentListScope> => {
  if (hasPermission(actor.role, 'students:read:any')) return { kind: 'all' };
  if (hasPermission(actor.role, 'students:read:class')) {
    return { kind: 'classes', classes: await accessRepository.listTeacherClasses(actor.id) };
  }
  if (hasPermission(actor.role, 'students:read:own')) {
    const linkedId = await accessRepository.findLinkedStudentId(actor.id);
    return { kind: 'ids', ids: linkedId === null ? [] : [linkedId] };
  }
  return { kind: 'none' };
};

/**
 * Averages are about a class, not one student. `undefined` means no extra section filter.
 * A class the caller does not teach is forbidden.
 */
export const sectionsForAverages = async (
  actor: Actor,
  className: string,
  section?: string,
): Promise<string[] | undefined> => {
  if (hasPermission(actor.role, 'marks:averages:any')) return undefined;
  if (!hasPermission(actor.role, 'marks:averages:class')) throw forbidden();

  const classes = await accessRepository.listTeacherClasses(actor.id);
  const matches = classes.filter(
    (row) => row.className === className && (section === undefined || row.section === section),
  );
  if (matches.length === 0) throw forbidden();
  return matches.map((row) => row.section);
};
