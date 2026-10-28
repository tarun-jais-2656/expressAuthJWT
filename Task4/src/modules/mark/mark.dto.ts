import { z } from 'zod';
import { tag } from '../../utils/validators.js';
import { EXAMS } from './mark.interface.js';

const decimalPlaces = (value: number): number => {
  if (!Number.isFinite(value)) return 99;
  const text = value.toString();
  if (/e/i.test(text)) return 99;
  const fraction = text.split('.')[1];
  return fraction ? fraction.length : 0;
};

const score = z
  .number({ invalid_type_error: 'score must be a number' })
  .finite()
  .min(0)
  .refine((value) => decimalPlaces(value) <= 2, 'score must have at most 2 decimal places');

const maxScore = z
  .number({ invalid_type_error: 'maxScore must be a number' })
  .finite()
  .min(1)
  .max(200)
  .refine((value) => decimalPlaces(value) <= 2, 'maxScore must have at most 2 decimal places');

const markItem = z.strictObject({
  subject: tag,
  score,
  maxScore: maxScore.default(100),
});

export const createMarksDto = z
  .strictObject({
    exam: z.enum(EXAMS),
    marks: z.array(markItem).min(1).max(15),
  })
  .superRefine((body, ctx) => {
    body.marks.forEach((mark, index) => {
      if (mark.score > mark.maxScore) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['marks', index, 'score'],
          message: 'score must be less than or equal to maxScore',
        });
      }
    });
    const subjects = body.marks.map((mark) => mark.subject);
    if (new Set(subjects).size !== subjects.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['marks'],
        message: 'subjects must be unique',
      });
    }
  });
export type CreateMarksDto = z.infer<typeof createMarksDto>;

export const updateMarkDto = z
  .strictObject({
    score: score.optional(),
    maxScore: maxScore.optional(),
  })
  .refine((body) => body.score !== undefined || body.maxScore !== undefined, {
    message: 'Provide at least one of score or maxScore',
    path: ['score'],
  });
export type UpdateMarkDto = z.infer<typeof updateMarkDto>;

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const averagesQueryDto = z.object({
  className: z.string({ required_error: 'className is required' }).trim().regex(/^(?:[1-9]|1[0-2])$/, 'className must be from 1 to 12'),
  exam: z.preprocess(emptyToUndefined, z.enum(EXAMS).optional()),
  section: z.preprocess(
    emptyToUndefined,
    z.string().trim().toUpperCase().regex(/^[A-F]$/, 'section must be a letter from A to F').optional(),
  ),
});
export type AveragesQueryDto = z.infer<typeof averagesQueryDto>;

export interface MarkResponseDto {
  id: number;
  studentId: number;
  exam: string;
  subject: string;
  score: number;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectAverageResponseDto {
  subject: string;
  averagePercentage: number;
  students: number;
  passed: boolean;
}
