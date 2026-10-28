import { signAccessToken } from '../../auth/tokens.js';
import { unauthorized } from '../../errors/AppError.js';
import * as userRepository from '../user/user.repository.js';
import type { LoginDto, PublicAccount, RegisterDto } from './auth.dto.js';
import { hashPassword, verifyPassword } from './password.js';

const toPublicAccount = (user: { id: number; name: string; email: string; role: string }): PublicAccount => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

/** Public registration is always a plain user, with no student or class scope. */
export const register = async (input: RegisterDto): Promise<PublicAccount> => {
  const user = await userRepository.insert({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: 'user',
  });
  return toPublicAccount(user);
};

export const login = async (input: LoginDto): Promise<{ accessToken: string; user: PublicAccount }> => {
  const user = await userRepository.findByEmail(input.email);
  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw unauthorized('Invalid email or password');
  }
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    user: toPublicAccount(user),
  };
};
