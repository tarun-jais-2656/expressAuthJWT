import type { PoolClient } from 'pg';
import { getPool, query } from '../../config/db.js';
import { pgCode } from '../../db/pgError.js';
import { buildUpdate } from '../../db/sql.js';
import { conflict, notFound } from '../../errors/AppError.js';
import {
  EXAMS,
  type AverageFilter,
  type Exam,
  type Mark,
  type MarkChanges,
  type MarkRow,
  type MarkWritableColumns,
  type NewMark,
  type SubjectAverage,
} from './mark.interface.js';

const COLUMNS = ['student_id', 'exam', 'subject', 'score', 'max_score'] as const;

const isExam = (value: string): value is Exam => (EXAMS as readonly string[]).includes(value);

export const numericToNumber = (value: number | string, field: string): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid NUMERIC for ${field}: ${String(value)}`);
  }
  return parsed;
};

export const toDomain = (row: MarkRow): Mark => {
  if (!isExam(row.exam)) throw new Error(`Unknown exam "${row.exam}"`);
  return {
    id: row.id,
    studentId: row.student_id,
    exam: row.exam,
    subject: row.subject,
    score: numericToNumber(row.score, 'score'),
    maxScore: numericToNumber(row.max_score, 'max_score'),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

export const toPersistence = (changes: MarkChanges): MarkWritableColumns => {
  const columns: MarkWritableColumns = {};
  if (changes.studentId !== undefined) columns.student_id = changes.studentId;
  if (changes.exam !== undefined) columns.exam = changes.exam;
  if (changes.subject !== undefined) columns.subject = changes.subject;
  if (changes.score !== undefined) columns.score = changes.score;
  if (changes.maxScore !== undefined) columns.max_score = changes.maxScore;
  return columns;
};

const translate = (err: unknown, studentId?: number): Error => {
  if (pgCode(err) === '23503') return notFound(`Student ${studentId ?? ''} not found`);
  if (pgCode(err) === '23505') return conflict('Marks for this student, exam, and subject already exist');
  return err instanceof Error ? err : new Error('Database error');
};

export const findById = async (id: number): Promise<Mark | null> => {
  const result = await query<MarkRow>('SELECT * FROM marks WHERE id = $1', [id]);
  const row = result.rows[0];
  return row ? toDomain(row) : null;
};

export const insertMany = async (studentId: number, exam: Exam, marks: NewMark[]): Promise<Mark[]> => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const created: Mark[] = [];
    for (const mark of marks) {
      const result = await client.query<MarkRow>(
        `INSERT INTO marks (student_id, exam, subject, score, max_score)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [studentId, exam, mark.subject, mark.score, mark.maxScore],
      );
      const row = result.rows[0];
      if (!row) throw new Error('Insert did not return a mark');
      created.push(toDomain(row));
    }
    await client.query('COMMIT');
    return created;
  } catch (err) {
    await rollback(client);
    throw translate(err, studentId);
  } finally {
    client.release();
  }
};

const rollback = async (client: PoolClient): Promise<void> => {
  try {
    await client.query('ROLLBACK');
  } catch {
    // The connection is discarded in finally via release.
  }
};

export const update = async (id: number, changes: MarkChanges): Promise<Mark | null> => {
  const statement = buildUpdate('marks', COLUMNS, id, toPersistence(changes));
  try {
    const result = await query<MarkRow>(statement.text, statement.values);
    const row = result.rows[0];
    return row ? toDomain(row) : null;
  } catch (err) {
    throw translate(err);
  }
};

export const remove = async (id: number): Promise<boolean> => {
  const result = await query('DELETE FROM marks WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

export const subjectAverages = async (filter: AverageFilter): Promise<SubjectAverage[]> => {
  const result = await query<{ subject: string; average_percentage: string | number; students: number | string }>(
    `SELECT m.subject,
            AVG(m.score / m.max_score * 100) AS average_percentage,
            COUNT(DISTINCT m.student_id)::int AS students
     FROM marks m
     JOIN students s ON s.id = m.student_id
     WHERE s.class_name = $1
       AND ($2::text IS NULL OR m.exam = $2)
       AND ($3::text IS NULL OR s.section = $3)
       AND ($4::text[] IS NULL OR s.section = ANY($4::text[]))
     GROUP BY m.subject
     ORDER BY m.subject`,
    [filter.className, filter.exam ?? null, filter.section ?? null, filter.sections ?? null],
  );
  return result.rows.map((row) => ({
    subject: row.subject,
    averagePercentage: numericToNumber(row.average_percentage, 'average_percentage'),
    students: numericToNumber(row.students, 'students'),
  }));
};
