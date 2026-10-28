import { z } from 'zod';
import { personName } from '../../utils/validators.js';

export const registerDto = z.strictObject({
  name: personName,
  email: z
    .string({ required_error: 'email is required', invalid_type_error: 'email must be a string' })
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z
    .string({ required_error: 'password is required', invalid_type_error: 'password must be a string' })
    .min(8, 'password must be at least 8 characters')
    .max(200, 'password must be at most 200 characters'),
});
export type RegisterDto = z.infer<typeof registerDto>;

export const loginDto = z.strictObject({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginDto>;

export interface PublicAccount {
  id: number;
  name: string;
  email: string;
  role: string;
}
