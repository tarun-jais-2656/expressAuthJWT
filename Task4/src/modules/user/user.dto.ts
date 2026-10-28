import { z } from 'zod';
import { personName } from '../../utils/validators.js';

export const createUserDto = z.strictObject({
  name: personName,
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});
export type CreateUserDto = z.infer<typeof createUserDto>;

export const updateUserDto = z
  .strictObject({
    name: personName.optional(),
    email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' });
export type UpdateUserDto = z.infer<typeof updateUserDto>;

export interface UserResponseDto {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}
