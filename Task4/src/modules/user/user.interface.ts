import type { Role } from '../../config/permissions.js';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  studentId: number | null;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  role?: string | null;
  student_id?: number | null;
  password_hash?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserChanges {
  name?: string;
  email?: string;
  role?: Role;
  studentId?: number | null;
  passwordHash?: string | null;
}
