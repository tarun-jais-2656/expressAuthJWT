import { query } from '../../config/db.js';
import { pgCode } from '../../db/pgError.js';
import { conflict } from '../../errors/AppError.js';
import type { ClassAssignment } from './actor.js';

interface ClassRow {
  class_name: string;
  section: string;
}

export const translateLinkError = (err: unknown): Error => {
  if (pgCode(err) === '23505') return conflict('That link already exists');
  return err instanceof Error ? err : new Error('Database error');
};

export const listTeacherClasses = async (teacherUserId: number): Promise<ClassAssignment[]> => {
  const result = await query<ClassRow>(
    `SELECT class_name, section
     FROM teacher_classes
     WHERE teacher_user_id = $1
     ORDER BY class_name, section`,
    [teacherUserId],
  );
  return result.rows.map((row) => ({
    teacherUserId,
    className: row.class_name,
    section: row.section.trim(),
  }));
};

export const insertTeacherClass = async (link: ClassAssignment): Promise<void> => {
  try {
    await query(
      `INSERT INTO teacher_classes (teacher_user_id, class_name, section)
       VALUES ($1, $2, $3)`,
      [link.teacherUserId, link.className, link.section],
    );
  } catch (err) {
    throw translateLinkError(err);
  }
};

export const findLinkedStudentId = async (userId: number): Promise<number | null> => {
  const result = await query<{ student_id: number | null }>(
    'SELECT student_id FROM users WHERE id = $1',
    [userId],
  );
  return result.rows[0]?.student_id ?? null;
};

export const findUserIdByStudentId = async (studentId: number): Promise<number | null> => {
  const result = await query<{ id: number }>('SELECT id FROM users WHERE student_id = $1', [studentId]);
  return result.rows[0]?.id ?? null;
};

export const linkStudent = async (userId: number, studentId: number): Promise<void> => {
  try {
    await query('UPDATE users SET student_id = $2, updated_at = NOW() WHERE id = $1', [userId, studentId]);
  } catch (err) {
    throw translateLinkError(err);
  }
};
