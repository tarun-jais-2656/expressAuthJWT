import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { conflict } from '../src/errors/AppError.js';
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
import { signAccessToken } from '../src/auth/tokens.js';
import * as accessRepository from '../src/modules/access/access.repository.js';
import * as markRepository from '../src/modules/mark/mark.repository.js';
import * as studentRepository from '../src/modules/student/student.repository.js';
import * as userRepository from '../src/modules/user/user.repository.js';
import { as } from './asUser.js';

const stamp = new Date('2026-01-01T00:00:00.000Z');

const priya = {
  id: 17,
  rollNo: '2026-10A-017',
  firstName: 'Priya',
  lastName: 'Nair',
  dateOfBirth: new Date(Date.UTC(2011, 5, 1)),
  className: '10',
  section: 'A',
  guardian: { name: 'Ravi Sharma', phone: '+919876543210', relation: 'father' as const },
  createdAt: stamp,
  updatedAt: stamp,
};

const users = {
  1: account(1, 'admin', { name: 'Admin' }),
  2: account(2, 'teacher', { name: 'Ms Rao' }),
  3: account(3, 'teacher', { name: 'Mr Iyer' }),
  4: account(4, 'student', { name: 'Priya', studentId: 17 }),
  5: account(5, 'student', { name: 'Arjun', studentId: 23 }),
  6: account(6, 'student', { name: 'New Student' }),
  8: account(8, 'moderator', { name: 'Mod' }),
};

const markBody = { exam: 'final', marks: [{ subject: 'maths', score: 40, maxScore: 100 }] };

describe('authentication and account links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepository.findById).mockImplementation(async (id: number) => users[id as keyof typeof users] ?? null);
    vi.mocked(studentRepository.findById).mockImplementation(async (id: number) => (id === 17 || id === 99 ? { ...priya, id } : null));
    vi.mocked(studentRepository.findMany).mockResolvedValue([priya]);
    vi.mocked(markRepository.insertMany).mockResolvedValue([]);
    vi.mocked(accessRepository.listTeacherClasses).mockImplementation(async (teacherUserId: number) =>
      teacherUserId === 2
        ? [
            { teacherUserId: 2, className: '10', section: 'A' },
            { teacherUserId: 2, className: '10', section: 'B' },
          ]
        : [],
    );
    vi.mocked(accessRepository.findLinkedStudentId).mockImplementation(async (userId: number) => users[userId as keyof typeof users]?.studentId ?? null);
    vi.mocked(accessRepository.findUserIdByStudentId).mockImplementation(async (studentId: number) => {
      const owner = Object.values(users).find((user) => user.studentId === studentId);
      return owner?.id ?? null;
    });
    vi.mocked(accessRepository.insertTeacherClass).mockResolvedValue(undefined);
    vi.mocked(accessRepository.linkStudent).mockResolvedValue(undefined);
  });

  test('public registration creates a user who cannot see students or marks', async () => {
    const password = 'correct-horse';
    let saved = account(9, 'user', { name: 'Pat Lee', email: 'pat@school.test' });
    vi.mocked(userRepository.insert).mockImplementation(async (changes) => {
      expect(changes.role).toBe('user');
      saved = {
        ...saved,
        name: changes.name ?? saved.name,
        email: changes.email ?? saved.email,
        passwordHash: changes.passwordHash ?? null,
        role: changes.role ?? 'user',
      };
      return saved;
    });
    vi.mocked(userRepository.findByEmail).mockImplementation(async () => saved);
    vi.mocked(userRepository.findById).mockImplementation(async () => saved);

    const registered = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Pat Lee', email: 'pat@school.test', password });
    expect(registered.status).toBe(201);
    expect(registered.body.data.role).toBe('user');
    expect(JSON.stringify(registered.body)).not.toContain(password);

    const login = await request(app).post('/api/auth/login').send({ email: 'pat@school.test', password });
    expect(login.status).toBe(200);
    const token = login.body.data.accessToken as string;

    const students = await request(app).get('/api/students').set('Authorization', `Bearer ${token}`);
    const averages = await request(app).get('/api/marks/averages?className=10').set('Authorization', `Bearer ${token}`);
    expect(students.status).toBe(403);
    expect(averages.status).toBe(403);
    expect(studentRepository.findMany).not.toHaveBeenCalled();
    expect(markRepository.subjectAverages).not.toHaveBeenCalled();
  });

  test('registration cannot choose a role', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Pat Lee',
      email: 'pat@school.test',
      password: 'correct-horse',
      role: 'admin',
    });
    expect(response.status).toBe(400);
    expect(userRepository.insert).not.toHaveBeenCalled();
  });

  test('a moderator token is still authenticated and then forbidden', async () => {
    const response = await request(app).get('/api/students').set('Authorization', as(8, 'moderator'));
    expect(response.status).toBe(403);
  });

  test('a teacher token stops working after the account role changes to user', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(account(2, 'user', { name: 'Ms Rao' }));
    const token = signAccessToken({ sub: 2, role: 'teacher' });
    const response = await request(app)
      .post('/api/students/17/marks')
      .set('Authorization', `Bearer ${token}`)
      .send(markBody);
    expect(response.status).toBe(403);
    expect(markRepository.insertMany).not.toHaveBeenCalled();
  });

  test('admin links a teacher to a class', async () => {
    const response = await request(app)
      .post('/api/admin/teacher-classes')
      .set('Authorization', as(1, 'admin'))
      .send({ teacherUserId: 2, className: '10', section: 'a' });
    expect(response.status).toBe(201);
    expect(accessRepository.insertTeacherClass).toHaveBeenCalledWith({
      teacherUserId: 2,
      className: '10',
      section: 'A',
    });
  });

  test('linking a non-teacher to a class is 400', async () => {
    const response = await request(app)
      .post('/api/admin/teacher-classes')
      .set('Authorization', as(1, 'admin'))
      .send({ teacherUserId: 4, className: '10', section: 'A' });
    expect(response.status).toBe(400);
    expect(accessRepository.insertTeacherClass).not.toHaveBeenCalled();
  });

  test('an unknown teacher account is 404', async () => {
    const response = await request(app)
      .post('/api/admin/teacher-classes')
      .set('Authorization', as(1, 'admin'))
      .send({ teacherUserId: 999, className: '10', section: 'A' });
    expect(response.status).toBe(404);
    expect(accessRepository.insertTeacherClass).not.toHaveBeenCalled();
  });

  test('a duplicate teacher class is 409', async () => {
    vi.mocked(accessRepository.insertTeacherClass).mockRejectedValue(conflict('That link already exists'));
    const response = await request(app)
      .post('/api/admin/teacher-classes')
      .set('Authorization', as(1, 'admin'))
      .send({ teacherUserId: 2, className: '10', section: 'A' });
    expect(response.status).toBe(409);
  });

  test('admin links a student account to a student record', async () => {
    const response = await request(app)
      .post('/api/admin/student-links')
      .set('Authorization', as(1, 'admin'))
      .send({ userId: 6, studentId: 99 });
    expect(response.status).toBe(201);
    expect(accessRepository.linkStudent).toHaveBeenCalledWith(6, 99);
  });

  test('linking a non-student account to a student is 400', async () => {
    const response = await request(app)
      .post('/api/admin/student-links')
      .set('Authorization', as(1, 'admin'))
      .send({ userId: 2, studentId: 17 });
    expect(response.status).toBe(400);
    expect(accessRepository.linkStudent).not.toHaveBeenCalled();
  });

  test('an unknown student record is 404', async () => {
    const response = await request(app)
      .post('/api/admin/student-links')
      .set('Authorization', as(1, 'admin'))
      .send({ userId: 6, studentId: 404 });
    expect(response.status).toBe(404);
    expect(accessRepository.linkStudent).not.toHaveBeenCalled();
  });

  test('a duplicate student link is 409', async () => {
    const response = await request(app)
      .post('/api/admin/student-links')
      .set('Authorization', as(1, 'admin'))
      .send({ userId: 6, studentId: 17 });
    expect(response.status).toBe(409);
    expect(accessRepository.linkStudent).not.toHaveBeenCalled();
  });

  test('a teacher cannot call the admin link endpoints', async () => {
    const response = await request(app)
      .post('/api/admin/teacher-classes')
      .set('Authorization', as(2, 'teacher'))
      .send({ teacherUserId: 2, className: '10', section: 'A' });
    expect(response.status).toBe(403);
    expect(accessRepository.insertTeacherClass).not.toHaveBeenCalled();
  });
});
