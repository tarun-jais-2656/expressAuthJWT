import type { Role } from '../../config/permissions.js';

export interface Actor {
  id: number;
  role: Role;
  studentId: number | null;
}

export interface ScopedStudent {
  id: number;
  className: string;
  section: string;
}

export interface ClassAssignment {
  teacherUserId: number;
  className: string;
  section: string;
}
