import type { Role } from '../config/permissions.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: Role;
        studentId: number | null;
      };
    }
  }
}

export {};
