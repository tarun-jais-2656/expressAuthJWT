import { canAccessStudent, studentListScope } from '../access/access.service.js';
import type { Actor } from '../access/actor.js';
import { forbidden, notFound } from '../../errors/AppError.js';
import { calendarDate, formatDateOnly } from '../../utils/dates.js';
import type { CreateStudentDto, ListStudentsQueryDto, StudentResponseDto, UpdateStudentDto } from './student.dto.js';
import type { Student, StudentChanges } from './student.interface.js';
import * as studentRepository from './student.repository.js';

export const toResponseDto = (student: Student): StudentResponseDto => ({
  id: student.id,
  rollNo: student.rollNo,
  firstName: student.firstName,
  lastName: student.lastName,
  dateOfBirth: formatDateOnly(student.dateOfBirth),
  className: student.className,
  section: student.section,
  guardian: student.guardian,
  createdAt: student.createdAt.toISOString(),
  updatedAt: student.updatedAt.toISOString(),
});

const toChanges = (input: CreateStudentDto | UpdateStudentDto): StudentChanges => ({
  ...(input.rollNo !== undefined ? { rollNo: input.rollNo } : {}),
  ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
  ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
  ...(input.dateOfBirth !== undefined ? { dateOfBirth: calendarDate(input.dateOfBirth) } : {}),
  ...(input.className !== undefined ? { className: input.className } : {}),
  ...(input.section !== undefined ? { section: input.section } : {}),
  ...(input.guardian !== undefined ? { guardian: input.guardian } : {}),
});

const assertStudentAccess = async (actor: Actor, student: Student, action: 'read' | 'write'): Promise<void> => {
  const allowed = await canAccessStudent(actor, student, action, 'students');
  if (!allowed) throw forbidden();
};

export const createStudent = async (actor: Actor, input: CreateStudentDto): Promise<StudentResponseDto> => {
  const allowed = await canAccessStudent(
    actor,
    { id: 0, className: input.className, section: input.section },
    'write',
    'students',
  );
  if (!allowed) throw forbidden();
  return toResponseDto(await studentRepository.insert(toChanges(input)));
};

export const updateStudent = async (actor: Actor, id: number, input: UpdateStudentDto): Promise<StudentResponseDto> => {
  const existing = await studentRepository.findById(id);
  if (!existing) throw notFound(`Student ${id} not found`);
  await assertStudentAccess(actor, existing, 'write');
  const updated = await studentRepository.update(id, toChanges(input));
  if (!updated) throw notFound(`Student ${id} not found`);
  return toResponseDto(updated);
};

export const getStudent = async (actor: Actor, id: number): Promise<StudentResponseDto> => {
  const student = await studentRepository.findById(id);
  if (!student) throw notFound(`Student ${id} not found`);
  await assertStudentAccess(actor, student, 'read');
  return toResponseDto(student);
};

export const listStudents = async (actor: Actor, query: ListStudentsQueryDto): Promise<StudentResponseDto[]> => {
  const scope = await studentListScope(actor);
  if (scope.kind === 'none') throw forbidden();
  const students = await studentRepository.findMany({
    ...query,
    ...(scope.kind === 'classes' ? { classes: scope.classes } : {}),
    ...(scope.kind === 'ids' ? { ids: scope.ids } : {}),
  });
  return students.map(toResponseDto);
};

export const deleteStudent = async (actor: Actor, id: number): Promise<void> => {
  const existing = await studentRepository.findById(id);
  if (!existing) throw notFound(`Student ${id} not found`);
  await assertStudentAccess(actor, existing, 'write');
  const deleted = await studentRepository.remove(id);
  if (!deleted) throw notFound(`Student ${id} not found`);
};
