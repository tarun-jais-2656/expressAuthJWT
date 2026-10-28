import type { CreatePostDto, PostResponseDto } from './post.dto.js';
import type { Post } from './post.interface.js';
import * as postRepository from './post.repository.js';

export const toResponseDto = (post: Post): PostResponseDto => ({
  id: post.id,
  userId: post.userId,
  title: post.title,
  body: post.body,
  status: post.status,
  createdAt: post.createdAt.toISOString(),
  updatedAt: post.updatedAt.toISOString(),
});

export const createPost = async (input: CreatePostDto): Promise<PostResponseDto> =>
  toResponseDto(await postRepository.insert(input));
