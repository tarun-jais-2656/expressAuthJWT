import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const blankToUndefined = (value: unknown): unknown => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

const requiredEnv = (name: string) =>
  z.preprocess(
    blankToUndefined,
    z.string({
      required_error: `${name} is required but missing`,
      invalid_type_error: `${name} is required but missing`,
    }),
  );

const optionalWithDefault = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(blankToUndefined, schema);

const CORS_WILDCARD_MESSAGE =
  'CORS_ORIGINS=* is unsafe: a wildcard lets any website call this API with the user\'s browser session. List explicit https origins instead.';

const fullOrigin = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
  } catch {
    return false;
  }
};

export const configSchema = z.object({
  NODE_ENV: optionalWithDefault(z.enum(['development', 'test', 'production']).default('development')),
  PORT: optionalWithDefault(z.coerce.number().int().positive().default(3000)),
  DB_HOST: optionalWithDefault(z.string().min(1).default('localhost')),
  DB_PORT: optionalWithDefault(z.coerce.number().int().positive().default(5432)),
  DB_USER: requiredEnv('DB_USER'),
  DB_PASSWORD: requiredEnv('DB_PASSWORD'),
  DB_NAME: requiredEnv('DB_NAME'),
  PASS_PERCENTAGE: requiredEnv('PASS_PERCENTAGE').superRefine((value, ctx) => {
    if (!/^\d+(\.\d+)?$/.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `PASS_PERCENTAGE must be a number (received "${value}")`,
      });
      return;
    }
    const parsed = Number(value);
    if (parsed < 0 || parsed > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `PASS_PERCENTAGE must be from 0 to 100 (received "${value}")`,
      });
    }
  }).transform((value) => Number(value)),
  JWT_SECRET: requiredEnv('JWT_SECRET').refine(
    (value) => value.length >= 16,
    'JWT_SECRET must be at least 16 characters',
  ),
  CORS_ORIGINS: requiredEnv('CORS_ORIGINS').superRefine((value, ctx) => {
    const origins = value
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
    if (origins.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CORS_ORIGINS is required but missing' });
      return;
    }
    if (origins.some((origin) => origin === '*')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: CORS_WILDCARD_MESSAGE });
      return;
    }
    for (const origin of origins) {
      if (!fullOrigin(origin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `CORS_ORIGINS must be a full URL (received "${origin}")`,
        });
      }
    }
  }),
  MARKS_RATE_LIMIT_MAX: optionalWithDefault(
    z.coerce
      .number({
        invalid_type_error: 'MARKS_RATE_LIMIT_MAX must be a positive integer',
      })
      .int()
      .positive('MARKS_RATE_LIMIT_MAX must be a positive integer')
      .max(10000)
      .default(60),
  ),
  ACADEMIC_YEAR: requiredEnv('ACADEMIC_YEAR').superRefine((value, ctx) => {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `ACADEMIC_YEAR must use YYYY-YY (received "${value}")`,
      });
      return;
    }
    const startYear = Number(match[1]);
    const endYear = Number(match[2]);
    const expectedEnd = (startYear + 1) % 100;
    if (endYear !== expectedEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `ACADEMIC_YEAR: second year must follow the first (received "${value}")`,
      });
    }
  }),
});

export type Env = z.infer<typeof configSchema>;

/**
 * Validates process environment with the single config schema.
 * Throws Error whose message names each bad variable and what is wrong.
 */
export const validateConfig = (source: Record<string, unknown>): Env => {
  const parsed = configSchema.safeParse(source);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => issue.message);
    throw new Error(messages.join('\n'));
  }
  return parsed.data;
};

let cached: Env | undefined;

export const getEnv = (): Env => {
  if (!cached) cached = validateConfig(process.env);
  return cached;
};
