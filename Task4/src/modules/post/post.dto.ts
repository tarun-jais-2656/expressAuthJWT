import { z } from 'zod';
import { safeText } from '../../utils/validators.js';
import { POST_STATUSES } from './post.interface.js';

export const createPostDto = z.strictObject({
  userId: z.number().int().positive(),
  title: safeText('title').refine((value) => value.length >= 1 && value.length <= 120, 'title must be 1 to 120 characters'),
  body: safeText('body').refine((value) => value.length >= 1, 'body is required'),
  status: z.enum(POST_STATUSES).default('draft'),
});
export type CreatePostDto = z.infer<typeof createPostDto>;

export interface PostResponseDto {
  id: number;
  userId: number;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
