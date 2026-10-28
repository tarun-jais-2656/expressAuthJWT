import { roleIs } from '../../config/permissions.js';
import { badRequest, conflict, notFound } from '../../errors/AppError.js';
import * as accessRepository from '../access/access.repository.js';
import type { StudentLinkDto, TeacherClassDto } from './admin.dto.js';
import * as studentRepository from '../student/student.repository.js';
import * as userRepository from '../user/user.repository.js';

export const linkTeacherClass = async (input: TeacherClassDto): Promise<TeacherClassDto> => {
  const user = await userRepository.findById(input.teacherUserId);
  if (!user) throw notFound(`User ${input.teacherUserId} not found`);
  if (!roleIs(user.role, 'teacher')) throw badRequest('Class links are only for teacher accounts');

  await accessRepository.insertTeacherClass({
    teacherUserId: user.id,
    className: input.className,
    section: input.section,
  });
  return { teacherUserId: user.id, className: input.className, section: input.section };
};

export const linkStudentAccount = async (input: StudentLinkDto): Promise<StudentLinkDto> => {
  const user = await userRepository.findById(input.userId);
  if (!user) throw notFound(`User ${input.userId} not found`);
  if (!roleIs(user.role, 'student')) throw badRequest('Student links are only for student accounts');

  const student = await studentRepository.findById(input.studentId);
  if (!student) throw notFound(`Student ${input.studentId} not found`);

  const alreadyLinked = user.studentId !== null || (await accessRepository.findUserIdByStudentId(student.id)) !== null;
  if (alreadyLinked) throw conflict('That link already exists');

  await accessRepository.linkStudent(user.id, student.id);
  return { userId: user.id, studentId: student.id };
};
