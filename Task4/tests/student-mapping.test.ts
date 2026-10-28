import { describe, expect, test } from 'vitest';
import { getEnv } from '../src/config/env.js';
import { formatDateOnly } from '../src/utils/dates.js';
import { decorateAverage } from '../src/modules/mark/mark.service.js';
import { toDomain as markToDomain, toPersistence as markToPersistence } from '../src/modules/mark/mark.repository.js';
import type { MarkRow } from '../src/modules/mark/mark.interface.js';
import { toDomain as studentToDomain, toPersistence as studentToPersistence } from '../src/modules/student/student.repository.js';
import type { StudentChanges, StudentRow } from '../src/modules/student/student.interface.js';

const timestamp = new Date('2026-01-02T03:04:05.000Z');
const dob = new Date(Date.UTC(2010, 4, 1));

const studentChanges = (): StudentChanges => ({
  rollNo: '2026-10A-017',
  firstName: 'Asha',
  lastName: 'Sharma',
  dateOfBirth: dob,
  className: '10',
  section: 'A',
  guardian: { name: 'Ravi Sharma', phone: '+919876543210', relation: 'father' },
});

const studentRow = (overrides: Partial<StudentRow> = {}): StudentRow => ({
  id: 9,
  roll_no: '2026-10A-017',
  first_name: 'Asha',
  last_name: 'Sharma',
  date_of_birth: dob,
  class_name: '10',
  section: 'A',
  guardian_name: 'Ravi Sharma',
  guardian_phone: '+919876543210',
  guardian_relation: 'father',
  created_at: timestamp,
  updated_at: timestamp,
  ...overrides,
});

const markRow = (overrides: Partial<MarkRow> = {}): MarkRow => ({
  id: 3,
  student_id: 9,
  exam: 'final',
  subject: 'maths',
  score: '78.50',
  max_score: '100.00',
  created_at: timestamp,
  updated_at: timestamp,
  ...overrides,
});

describe('student and mark mapping', () => {
  test('student toDomain nests the flat guardian columns', () => {
    expect(studentToDomain(studentRow())).toMatchObject({
      id: 9,
      rollNo: '2026-10A-017',
      guardian: { name: 'Ravi Sharma', phone: '+919876543210', relation: 'father' },
    });
    expect(studentToDomain(studentRow()).dateOfBirth).toBeInstanceOf(Date);
  });

  test('student toPersistence flattens guardian and keeps a partial update partial', () => {
    expect(studentToPersistence({ firstName: 'Meera' })).toEqual({ first_name: 'Meera' });
    expect(studentToPersistence({ guardian: { name: 'Lata', phone: '+911234567890', relation: 'mother' } })).toEqual({
      guardian_name: 'Lata',
      guardian_phone: '+911234567890',
      guardian_relation: 'mother',
    });
  });

  test('student round trip is lossless', () => {
    const changes = studentChanges();
    const columns = studentToPersistence(changes);
    const row = studentRow({
      roll_no: columns.roll_no,
      first_name: columns.first_name,
      last_name: columns.last_name,
      date_of_birth: columns.date_of_birth,
      class_name: columns.class_name,
      section: columns.section,
      guardian_name: columns.guardian_name,
      guardian_phone: columns.guardian_phone,
      guardian_relation: columns.guardian_relation,
    });
    const domain = studentToDomain(row);
    expect(domain.rollNo).toBe(changes.rollNo);
    expect(domain.firstName).toBe(changes.firstName);
    expect(domain.lastName).toBe(changes.lastName);
    expect(formatDateOnly(domain.dateOfBirth)).toBe(formatDateOnly(changes.dateOfBirth ?? dob));
    expect(domain.className).toBe(changes.className);
    expect(domain.section).toBe(changes.section);
    expect(domain.guardian).toEqual(changes.guardian);
  });

  test('unknown guardian_relation throws', () => {
    expect(() => studentToDomain(studentRow({ guardian_relation: 'uncle' }))).toThrow(/Unknown guardian_relation "uncle"/);
  });

  test('mark NUMERIC strings become numbers and an invalid NUMERIC string throws', () => {
    const domain = markToDomain(markRow());
    expect(domain.score).toBe(78.5);
    expect(domain.maxScore).toBe(100);
    expect(() => markToDomain(markRow({ score: 'nope' }))).toThrow(/Invalid NUMERIC for score/);
  });

  test('mark toPersistence and round trip keep score and subject', () => {
    const columns = markToPersistence({
      studentId: 9,
      exam: 'final',
      subject: 'maths',
      score: 78.5,
      maxScore: 100,
    });
    expect(columns).toEqual({
      student_id: 9,
      exam: 'final',
      subject: 'maths',
      score: 78.5,
      max_score: 100,
    });
    const domain = markToDomain(
      markRow({
        student_id: columns.student_id,
        exam: columns.exam,
        subject: columns.subject,
        score: String(columns.score),
        max_score: String(columns.max_score),
      }),
    );
    expect(domain.studentId).toBe(9);
    expect(domain.exam).toBe('final');
    expect(domain.subject).toBe('maths');
    expect(domain.score).toBe(78.5);
    expect(domain.maxScore).toBe(100);
  });

  test('mark partial update maps only the fields present', () => {
    expect(markToPersistence({ score: 10 })).toEqual({ score: 10 });
  });

  test('passed and failed come from PASS_PERCENTAGE after rounding', () => {
    expect(getEnv().PASS_PERCENTAGE).toBe(40);
    const passed = decorateAverage({ subject: 'maths', averagePercentage: 39.996, students: 31 }, getEnv().PASS_PERCENTAGE);
    const failed = decorateAverage({ subject: 'english', averagePercentage: 39.994, students: 31 }, getEnv().PASS_PERCENTAGE);
    expect(passed).toEqual({ subject: 'maths', averagePercentage: 40, students: 31, passed: true });
    expect(failed).toEqual({ subject: 'english', averagePercentage: 39.99, students: 31, passed: false });
  });
});
