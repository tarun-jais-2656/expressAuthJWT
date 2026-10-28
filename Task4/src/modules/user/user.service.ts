import { notFound } from '../../errors/AppError.js';
import type { CreateUserDto, UpdateUserDto, UserResponseDto } from './user.dto.js';
import type { User } from './user.interface.js';
import * as userRepository from './user.repository.js';

export const toResponseDto = (user: User): UserResponseDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

export const createUser = async (input: CreateUserDto): Promise<UserResponseDto> =>
  toResponseDto(await userRepository.insert(input));

export const updateUser = async (id: number, input: UpdateUserDto): Promise<UserResponseDto> => {
  const existing = await userRepository.findById(id);
  if (!existing) throw notFound(`User ${id} not found`);
  const updated = await userRepository.update(id, input);
  if (!updated) throw notFound(`User ${id} not found`);
  return toResponseDto(updated);
};
