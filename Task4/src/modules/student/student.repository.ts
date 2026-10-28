import { query } from '../../config/db.js';
import { pgCode } from '../../db/pgError.js';
import { buildInsert, buildUpdate } from '../../db/sql.js';
import { conflict } from '../../errors/AppError.js';
import { calendarDate, formatDateOnly } from '../../utils/dates.js';
import { escapeLike } from '../../utils/validators.js';
import {
  GUARDIAN_RELATIONS,
  type GuardianRelation,
  type Student,
  type StudentChanges,
  type StudentListFilter,
  type StudentRow,
  type StudentWritableColumns,
} from './student.interface.js';

const COLUMNS = [
  'roll_no',
  'first_name',
  'last_name',
  'date_of_birth',
  'class_name',
  'section',
  'guardian_name',
  'guardian_phone',
  'guardian_relation',
] as const;

const isRelation = (value: string): value is GuardianRelation =>
  (GUARDIAN_RELATIONS as readonly string[]).includes(value);

export const toDomain = (row: StudentRow): Student => {
  if (!isRelation(row.guardian_relation)) {
    throw new Error(`Unknown guardian_relation "${row.guardian_relation}"`);
  }
  return {
    id: row.id,
    rollNo: row.roll_no,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: calendarDate(row.date_of_birth),
    className: row.class_name,
    section: row.section.trim(),
    guardian: {
      name: row.guardian_name,
      phone: row.guardian_phone,
      relation: row.guardian_relation,
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

export const toPersistence = (changes: StudentChanges): StudentWritableColumns => {
  const columns: StudentWritableColumns = {};
  if (changes.rollNo !== undefined) columns.roll_no = changes.rollNo;
  if (changes.firstName !== undefined) columns.first_name = changes.firstName;
  if (changes.lastName !== undefined) columns.last_name = changes.lastName;
  if (changes.dateOfBirth !== undefined) columns.date_of_birth = formatDateOnly(changes.dateOfBirth);
  if (changes.className !== undefined) columns.class_name = changes.className;
  if (changes.section !== undefined) columns.section = changes.section;
  if (changes.guardian !== undefined) {
    columns.guardian_name = changes.guardian.name;
    columns.guardian_phone = changes.guardian.phone;
    columns.guardian_relation = changes.guardian.relation;
  }
  return columns;
};

const translate = (err: unknown): Error => {
  if (pgCode(err) === '23505') return conflict('A student with that roll number already exists');
  return err instanceof Error ? err : new Error('Database error');
};

export const findMany = async (filter: StudentListFilter): Promise<Student[]> => {
  if (filter.classes && filter.classes.length === 0) return [];
  if (filter.ids && filter.ids.length === 0) return [];

  const pattern = filter.search ? `%${escapeLike(filter.search)}%` : null;
  const classNames = filter.classes?.map((row) => row.className) ?? null;
  const sections = filter.classes?.map((row) => row.section) ?? null;
  const result = await query<StudentRow>(
    `SELECT * FROM students
     WHERE ($1::text IS NULL OR class_name = $1)
       AND ($2::text IS NULL OR section = $2)
       AND (
         $3::text IS NULL
         OR first_name ILIKE $3 ESCAPE '\\'
         OR last_name ILIKE $3 ESCAPE '\\'
         OR roll_no ILIKE $3 ESCAPE '\\'
       )
       AND (
         $6::text[] IS NULL
         OR (class_name, section) IN (SELECT * FROM unnest($6::text[], $7::text[]))
       )
       AND ($8::int[] IS NULL OR id = ANY($8::int[]))
     ORDER BY id
     LIMIT $4 OFFSET $5`,
    [
      filter.className ?? null,
      filter.section ?? null,
      pattern,
      filter.limit,
      filter.offset,
      classNames,
      sections,
      filter.ids ?? null,
    ],
  );
  return result.rows.map(toDomain);
};

export const findById = async (id: number): Promise<Student | null> => {
  const result = await query<StudentRow>('SELECT * FROM students WHERE id = $1', [id]);
  const row = result.rows[0];
  return row ? toDomain(row) : null;
};

export const insert = async (changes: StudentChanges): Promise<Student> => {
  const statement = buildInsert('students', COLUMNS, toPersistence(changes));
  try {
    const result = await query<StudentRow>(statement.text, statement.values);
    const row = result.rows[0];
    if (!row) throw new Error('Insert did not return a student');
    return toDomain(row);
  } catch (err) {
    throw translate(err);
  }
};

export const update = async (id: number, changes: StudentChanges): Promise<Student | null> => {
  const statement = buildUpdate('students', COLUMNS, id, toPersistence(changes));
  try {
    const result = await query<StudentRow>(statement.text, statement.values);
    const row = result.rows[0];
    return row ? toDomain(row) : null;
  } catch (err) {
    throw translate(err);
  }
};

export const remove = async (id: number): Promise<boolean> => {
  const result = await query('DELETE FROM students WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
