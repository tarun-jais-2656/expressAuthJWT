import { z } from 'zod';

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/** Trim, NFC-normalise, and reject control characters, null bytes, and < >. */
export const safeText = (label = 'value') =>
  z
    .string({
      required_error: `${label} is required`,
      invalid_type_error: `${label} must be a string`,
    })
    .trim()
    .transform((value) => value.normalize('NFC'))
    .refine((value) => !CONTROL_CHARS.test(value), `${label} contains control characters or a null byte`)
    .refine((value) => !/[<>]/.test(value), `${label} must not contain < or >`);

export const personName = safeText('name')
  .refine((value) => value.length >= 1 && value.length <= 80, 'name must be 1 to 80 characters')
  .refine((value) => /^[\p{L}][\p{L}\s'.-]*$/u.test(value), 'name contains invalid characters');

/** Lowercase slug such as "maths" or "social-science". */
export const tag = safeText('tag')
  .transform((value) => value.toLowerCase())
  .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), 'must be a lowercase slug');

export const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Escape `%`, `_`, and `\` so user search text is a literal ILIKE pattern. */
export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (char) => `\\${char}`);
