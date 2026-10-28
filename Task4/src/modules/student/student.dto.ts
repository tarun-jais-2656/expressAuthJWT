import { z } from 'zod';
import { ageInYears } from '../../utils/dates.js';
import { pagination, personName, safeText } from '../../utils/validators.js';
import { GUARDIAN_RELATIONS } from './student.interface.js';

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const rollNo = z
  .string({ invalid_type_error: 'rollNo must be a string' })
  .trim()
  .toUpperCase()
  .transform((value) => value.normalize('NFC'))
  .refine((value) => !/[\u0000-\u001F\u007F<>]/.test(value), 'rollNo contains forbidden characters')
  .refine((value) => /^\d{4}-\d{1,2}[A-F]-\d{3}$/.test(value), 'rollNo must look like 2026-10A-017');

export const className = z
  .union([z.string(), z.number().int()], { errorMap: () => ({ message: 'className must be a string or number' }) })
  .transform((value) => (typeof value === 'string' ? value.trim() : String(value)))
  .refine((value) => /^(?:[1-9]|1[0-2])$/.test(value), 'className must be from 1 to 12');

export const section = z
  .string({ invalid_type_error: 'section must be a string' })
  .trim()
  .toUpperCase()
  .regex(/^[A-F]$/, 'section must be a letter from A to F');

export const dateOfBirth = z
  .string({ invalid_type_error: 'dateOfBirth must be a string' })
  .trim()
  .superRefine((value, ctx) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'dateOfBirth must be YYYY-MM-DD' });
      return;
    }
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
    const real =
      date.getUTCFullYear() === year && date.getUTCMonth() === (month ?? 1) - 1 && date.getUTCDate() === day;
    if (!real) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'dateOfBirth must be a real date' });
      return;
    }
    const age = ageInYears(date);
    if (age < 3 || age > 25) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'student must be between 3 and 25 years old' });
    }
  });

export const guardianPhone = z
  .string({ invalid_type_error: 'phone must be a string' })
  .trim()
  .transform((value) => value.normalize('NFC').replace(/[\s-]/g, ''))
  .refine((value) => !/[\u0000-\u001F\u007F<>]/.test(value), 'phone contains forbidden characters')
  .refine((value) => /^\+[1-9]\d{7,14}$/.test(value), 'phone must be E.164');

export const guardianRelation = z
  .string({ invalid_type_error: 'relation must be a string' })
  .trim()
  .toLowerCase()
  .pipe(
    z.enum(GUARDIAN_RELATIONS, {
      errorMap: () => ({ message: 'relation must be father, mother, or guardian' }),
    }),
  );

export const guardian = z.strictObject({
  name: personName,
  phone: guardianPhone,
  relation: guardianRelation,
});

export const createStudentDto = z.strictObject({
  rollNo,
  firstName: personName,
  lastName: personName,
  dateOfBirth,
  className,
  section,
  guardian,
});
export type CreateStudentDto = z.infer<typeof createStudentDto>;

export const updateStudentDto = z
  .strictObject({
    rollNo: rollNo.optional(),
    firstName: personName.optional(),
    lastName: personName.optional(),
    dateOfBirth: dateOfBirth.optional(),
    className: className.optional(),
    section: section.optional(),
    guardian: guardian.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' });
export type UpdateStudentDto = z.infer<typeof updateStudentDto>;

const classNameQuery = z.string().trim().regex(/^(?:[1-9]|1[0-2])$/, 'className must be from 1 to 12');
const sectionQuery = z.string().trim().toUpperCase().regex(/^[A-F]$/, 'section must be a letter from A to F');

export const listStudentsQueryDto = pagination.extend({
  className: z.preprocess(emptyToUndefined, classNameQuery.optional()),
  section: z.preprocess(emptyToUndefined, sectionQuery.optional()),
  search: z.preprocess(
    emptyToUndefined,
    safeText('search').refine((value) => value.length <= 100, 'search must be at most 100 characters').optional(),
  ),
});
export type ListStudentsQueryDto = z.infer<typeof listStudentsQueryDto>;

export interface StudentResponseDto {
  id: number;
  rollNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  className: string;
  section: string;
  guardian: {
    name: string;
    phone: string;
    relation: string;
  };
  createdAt: string;
  updatedAt: string;
}
