import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Role } from '../src/config/permissions.js';
import { account } from './accounts.js';

vi.mock('../src/modules/user/user.repository', () => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  toDomain: vi.fn(),
  toPersistence: vi.fn(),
}));

vi.mock('../src/modules/student/student.repository', () => ({
  findMany: vi.fn(),
  findById: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  toDomain: vi.fn(),
  toPersistence: vi.fn(),
}));

vi.mock('../src/modules/mark/mark.repository', () => ({
  insertMany: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  findById: vi.fn(),
  subjectAverages: vi.fn(),
  toDomain: vi.fn(),
  toPersistence: vi.fn(),
}));

vi.mock('../src/modules/access/access.repository', () => ({
  listTeacherClasses: vi.fn(),
  findLinkedStudentId: vi.fn(),
  findUserIdByStudentId: vi.fn(),
  insertTeacherClass: vi.fn(),
  linkStudent: vi.fn(),
  translateLinkError: (err: unknown) => err,
}));

import app from '../src/app.js';
import * as accessRepository from '../src/modules/access/access.repository.js';
import * as markRepository from '../src/modules/mark/mark.repository.js';
import * as studentRepository from '../src/modules/student/student.repository.js';
import * as userRepository from '../src/modules/user/user.repository.js';
import { as } from './asUser.js';

const stamp = new Date('2026-01-01T00:00:00.000Z');

const makeStudent = (id: number, className: string, section: string, firstName: string) => ({
  id,
  rollNo: `2026-${className}${section}-${String(id).padStart(3, '0')}`,
  firstName,
  lastName: 'Nair',
  dateOfBirth: new Date(Date.UTC(2011, 5, 1)),
  className,
  section,
  guardian: { name: 'Ravi Sharma', phone: '+919876543210', relation: 'father' as const },
  createdAt: stamp,
  updatedAt: stamp,
});

const priya = makeStudent(17, '10', 'A', 'Priya');
const arjun = makeStudent(23, '9', 'C', 'Arjun');
const students: Record<number, typeof priya> = { 17: priya, 23: arjun };

const makeMark = (id: number, studentId: number) => ({
  id,
  studentId,
  exam: 'final' as const,
  subject: 'maths',
  score: 40,
  maxScore: 100,
  createdAt: stamp,
  updatedAt: stamp,
});
const marks: Record<number, ReturnType<typeof makeMark>> = {
  1: makeMark(1, 17),
  2: makeMark(2, 23),
};

const users: Record<number, ReturnType<typeof account>> = {
  1: account(1, 'admin', { name: 'Admin' }),
  2: account(2, 'teacher', { name: 'Ms Rao' }),
  3: account(3, 'teacher', { name: 'Mr Iyer' }),
  4: account(4, 'student', { name: 'Priya', studentId: 17 }),
  5: account(5, 'student', { name: 'Arjun', studentId: 23 }),
};

const classes: Record<number, { teacherUserId: number; className: string; section: string }[]> = {
  2: [
    { teacherUserId: 2, className: '10', section: 'A' },
    { teacherUserId: 2, className: '10', section: 'B' },
  ],
  3: [{ teacherUserId: 3, className: '9', section: 'C' }],
};

const studentBody = {
  rollNo: '2026-10A-017',
  firstName: 'Asha',
  lastName: 'Sharma',
  dateOfBirth: '2014-01-15',
  className: '10',
  section: 'A',
  guardian: { name: 'Ravi Sharma', phone: '+919876543210', relation: 'father' },
};

const markBody = { exam: 'final', marks: [{ subject: 'maths', score: 40, maxScore: 100 }] };

interface Case {
  name: string;
  userId: number;
  role: Role;
  method: 'get' | 'post' | 'patch' | 'delete';
  url: string;
  body?: object;
  status: number;
}

const cases: Case[] = [
  { name: 'admin lists every student', userId: 1, role: 'admin', method: 'get', url: '/api/students', status: 200 },
  { name: 'teacher lists own classes', userId: 2, role: 'teacher', method: 'get', url: '/api/students', status: 200 },
  { name: 'student lists self', userId: 4, role: 'student', method: 'get', url: '/api/students', status: 200 },

  { name: 'admin reads any student', userId: 1, role: 'admin', method: 'get', url: '/api/students/23', status: 200 },
  { name: 'teacher reads a student in their class', userId: 2, role: 'teacher', method: 'get', url: '/api/students/17', status: 200 },
  { name: 'teacher reads a student outside their class', userId: 2, role: 'teacher', method: 'get', url: '/api/students/23', status: 403 },
  { name: 'Mr Iyer reads his own class', userId: 3, role: 'teacher', method: 'get', url: '/api/students/23', status: 200 },
  { name: 'student reads self', userId: 4, role: 'student', method: 'get', url: '/api/students/17', status: 200 },
  { name: 'student reads someone else', userId: 4, role: 'student', method: 'get', url: '/api/students/23', status: 403 },

  { name: 'admin creates a student', userId: 1, role: 'admin', method: 'post', url: '/api/students', body: studentBody, status: 201 },
  { name: 'teacher cannot create a student', userId: 2, role: 'teacher', method: 'post', url: '/api/students', body: studentBody, status: 403 },
  { name: 'student cannot create a student', userId: 4, role: 'student', method: 'post', url: '/api/students', body: studentBody, status: 403 },

  { name: 'admin updates a student', userId: 1, role: 'admin', method: 'patch', url: '/api/students/17', body: { firstName: 'Meera' }, status: 200 },
  { name: 'teacher cannot update a student', userId: 2, role: 'teacher', method: 'patch', url: '/api/students/17', body: { firstName: 'Meera' }, status: 403 },
  { name: 'student cannot update a student', userId: 4, role: 'student', method: 'patch', url: '/api/students/17', body: { firstName: 'Meera' }, status: 403 },

  { name: 'admin deletes a student', userId: 1, role: 'admin', method: 'delete', url: '/api/students/17', status: 204 },
  { name: 'teacher cannot delete a student', userId: 2, role: 'teacher', method: 'delete', url: '/api/students/17', status: 403 },
  { name: 'student cannot delete a student', userId: 4, role: 'student', method: 'delete', url: '/api/students/17', status: 403 },

  { name: 'admin enters marks', userId: 1, role: 'admin', method: 'post', url: '/api/students/23/marks', body: markBody, status: 201 },
  { name: 'teacher enters marks for their class', userId: 2, role: 'teacher', method: 'post', url: '/api/students/17/marks', body: markBody, status: 201 },
  { name: 'teacher cannot enter marks outside their class', userId: 2, role: 'teacher', method: 'post', url: '/api/students/23/marks', body: markBody, status: 403 },
  { name: 'student cannot enter marks', userId: 4, role: 'student', method: 'post', url: '/api/students/17/marks', body: markBody, status: 403 },

  { name: 'admin edits a mark', userId: 1, role: 'admin', method: 'patch', url: '/api/marks/2', body: { score: 41 }, status: 200 },
  { name: 'teacher edits a mark in their class', userId: 2, role: 'teacher', method: 'patch', url: '/api/marks/1', body: { score: 41 }, status: 200 },
  { name: 'teacher cannot edit a mark outside their class', userId: 2, role: 'teacher', method: 'patch', url: '/api/marks/2', body: { score: 41 }, status: 403 },
  { name: 'student cannot edit a mark', userId: 4, role: 'student', method: 'patch', url: '/api/marks/1', body: { score: 41 }, status: 403 },

  { name: 'admin reads any class average', userId: 1, role: 'admin', method: 'get', url: '/api/marks/averages?className=9', status: 200 },
  { name: 'teacher reads averages for their class', userId: 2, role: 'teacher', method: 'get', url: '/api/marks/averages?className=10', status: 200 },
  { name: 'teacher reads averages for a section they teach', userId: 2, role: 'teacher', method: 'get', url: '/api/marks/averages?className=10&section=B', status: 200 },
  { name: 'teacher cannot read averages for class 9', userId: 2, role: 'teacher', method: 'get', url: '/api/marks/averages?className=9', status: 403 },
  { name: 'teacher cannot read another section of their year', userId: 2, role: 'teacher', method: 'get', url: '/api/marks/averages?className=10&section=C', status: 403 },
  { name: 'student cannot read averages', userId: 4, role: 'student', method: 'get', url: '/api/marks/averages?className=10', status: 403 },
];

describe('authorisation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepository.findById).mockImplementation(async (id: number) => users[id] ?? null);
    vi.mocked(studentRepository.findById).mockImplementation(async (id: number) => students[id] ?? null);
    vi.mocked(studentRepository.findMany).mockResolvedValue([priya]);
    vi.mocked(studentRepository.insert).mockResolvedValue(priya);
    vi.mocked(studentRepository.update).mockImplementation(async (id: number) => students[id] ?? priya);
    vi.mocked(studentRepository.remove).mockResolvedValue(true);
    vi.mocked(markRepository.findById).mockImplementation(async (id: number) => marks[id] ?? null);
    vi.mocked(markRepository.update).mockImplementation(async (id: number) => marks[id] ?? null);
    vi.mocked(markRepository.insertMany).mockResolvedValue([marks[1]!]);
    vi.mocked(markRepository.subjectAverages).mockResolvedValue([]);
    vi.mocked(accessRepository.listTeacherClasses).mockImplementation(async (id: number) => classes[id] ?? []);
    vi.mocked(accessRepository.findLinkedStudentId).mockImplementation(async (id: number) => users[id]?.studentId ?? null);
  });

  test.each(cases)('$name', async ({ userId, role, method, url, body, status }) => {
    let pending = request(app)[method](url).set('Authorization', as(userId, role));
    if (body !== undefined) pending = pending.send(body);
    const response = await pending;
    expect(response.status).toBe(status);

    if (status === 403 && method === 'post' && url.includes('/marks')) {
      expect(markRepository.insertMany).not.toHaveBeenCalled();
    }
    if (status === 403 && method === 'patch' && url.startsWith('/api/marks/')) {
      expect(markRepository.update).not.toHaveBeenCalled();
    }
    if (status === 403 && url.includes('/averages')) {
      expect(markRepository.subjectAverages).not.toHaveBeenCalled();
    }
    if (status === 403 && (method === 'patch' || method === 'delete') && url.startsWith('/api/students/')) {
      expect(studentRepository.update).not.toHaveBeenCalled();
      expect(studentRepository.remove).not.toHaveBeenCalled();
    }
  });

  test('IDOR: Ms Rao cannot read Arjun or write his marks, and no write runs', async () => {
    const read = await request(app).get('/api/students/23').set('Authorization', as(2, 'teacher'));
    expect(read.status).toBe(403);
    expect(studentRepository.update).not.toHaveBeenCalled();
    expect(studentRepository.remove).not.toHaveBeenCalled();

    const write = await request(app)
      .post('/api/students/23/marks')
      .set('Authorization', as(2, 'teacher'))
      .send(markBody);
    expect(write.status).toBe(403);
    expect(markRepository.insertMany).not.toHaveBeenCalled();
    expect(markRepository.update).not.toHaveBeenCalled();
  });

  test('Priya listing students gets exactly herself', async () => {
    vi.mocked(studentRepository.findMany).mockImplementation(async (filter) => {
      return [priya, arjun].filter((student) => {
        if (filter.ids && !filter.ids.includes(student.id)) return false;
        if (
          filter.classes &&
          !filter.classes.some((row) => row.className === student.className && row.section === student.section)
        ) {
          return false;
        }
        return true;
      });
    });

    const response = await request(app).get('/api/students').set('Authorization', as(4, 'student'));
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ id: 17, firstName: 'Priya', className: '10', section: 'A' });
    expect(studentRepository.findMany).toHaveBeenCalledWith(expect.objectContaining({ ids: [17] }));
  });

  test('Ms Rao listing students is limited to her classes', async () => {
    vi.mocked(studentRepository.findMany).mockImplementation(async (filter) => {
      return [priya, arjun].filter((student) => {
        if (!filter.classes) return true;
        return filter.classes.some((row) => row.className === student.className && row.section === student.section);
      });
    });

    const response = await request(app).get('/api/students').set('Authorization', as(2, 'teacher'));
    expect(response.status).toBe(200);
    expect(response.body.data.map((row: { id: number }) => row.id)).toEqual([17]);
    expect(studentRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        classes: expect.arrayContaining([
          expect.objectContaining({ className: '10', section: 'A' }),
          expect.objectContaining({ className: '10', section: 'B' }),
        ]),
      }),
    );
  });
});
