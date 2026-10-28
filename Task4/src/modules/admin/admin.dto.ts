import { z } from 'zod';
import { className, section } from '../student/student.dto.js';

export const teacherClassDto = z.strictObject({
  teacherUserId: z.number().int().positive(),
  className,
  section,
});
export type TeacherClassDto = z.infer<typeof teacherClassDto>;

export const studentLinkDto = z.strictObject({
  userId: z.number().int().positive(),
  studentId: z.number().int().positive(),
});
export type StudentLinkDto = z.infer<typeof studentLinkDto>;
