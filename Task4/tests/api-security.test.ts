import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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
  listTeacherClasses: vi.fn(async () => []),
  findLinkedStudentId: vi.fn(async () => null),
  findUserIdByStudentId: vi.fn(async () => null),
  insertTeacherClass: vi.fn(),
  linkStudent: vi.fn(),
  translateLinkError: (err: unknown) => err,
}));

import app from '../src/app.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { authenticate, currentActor } from '../src/middlewares/authenticate.js';
import { requireAnyPermission } from '../src/middlewares/authorize.js';
import { createRateLimiter, perUserKey, resetRateLimits } from '../src/middlewares/rateLimit.js';
import { createMarksDto } from '../src/modules/mark/mark.dto.js';
import * as markRepository from '../src/modules/mark/mark.repository.js';
import * as markService from '../src/modules/mark/mark.service.js';
import * as studentRepository from '../src/modules/student/student.repository.js';
import * as userRepository from '../src/modules/user/user.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { idParam } from '../src/utils/validators.js';
import { sendSuccess } from '../src/utils/response.js';
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

const markBody = { exam: 'final', marks: [{ subject: 'maths', score: 40, maxScore: 100 }] };
const sharedIp = '203.0.113.10';
const savedMax = process.env.MARKS_RATE_LIMIT_MAX;

describe('API security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    vi.mocked(userRepository.findById).mockImplementation(async (id: number) => account(id, 'admin'));
    vi.mocked(studentRepository.findById).mockImplementation(async (id: number) => (id === 17 ? priya : null));
    vi.mocked(studentRepository.findMany).mockResolvedValue([priya]);
    vi.mocked(markRepository.insertMany).mockResolvedValue([]);
    vi.mocked(markRepository.subjectAverages).mockResolvedValue([]);
  });

  afterEach(() => {
    process.env.MARKS_RATE_LIMIT_MAX = savedMax;
    resetRateLimits();
  });

  test('createRateLimiter blocks user A and still allows user B on the same IP', async () => {
    const limiter = createRateLimiter({
      windowMs: 10 * 60 * 1000,
      max: 2,
      keyGenerator: perUserKey,
    });
    const local = express();
    local.use(express.json());
    local.post(
      '/api/students/:id/marks',
      authenticate,
      limiter,
      requireAnyPermission('marks:write:class', 'marks:write:any'),
      async (req, res) => {
        const { id } = idParam.parse(req.params);
        const body = createMarksDto.parse(req.body);
        sendSuccess(res, await markService.createMarks(currentActor(req), id, body), 201);
      },
    );
    local.use(errorHandler);

    const post = (userId: number) =>
      request(local)
        .post('/api/students/17/marks')
        .set('Authorization', as(userId, 'admin'))
        .set('X-Forwarded-For', sharedIp)
        .send(markBody);

    expect((await post(90)).status).toBe(201);
    expect((await post(90)).status).toBe(201);
    const blocked = await post(90);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.message).toBe('Too many requests');
    expect(blocked.body.curl).toContain('curl -X POST');

    const other = await post(91);
    expect(other.status).toBe(201);
    expect(markRepository.insertMany).toHaveBeenCalledTimes(3);
  });

  test('the marks route limits each user and ignores a shared school IP', async () => {
    process.env.MARKS_RATE_LIMIT_MAX = '2';
    resetRateLimits();

    const post = (userId: number) =>
      request(app)
        .post('/api/students/17/marks')
        .set('Authorization', as(userId, 'admin'))
        .set('X-Forwarded-For', sharedIp)
        .send(markBody);

    expect((await post(90)).status).toBe(201);
    expect((await post(90)).status).toBe(201);
    const blocked = await post(90);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ error: { message: 'Too many requests' } });

    expect((await post(91)).status).toBe(201);
  });

  test('auth, students, and marks responses are not cached', async () => {
    const success = await request(app).get('/api/students').set('Authorization', as(1, 'admin'));
    expect(success.status).toBe(200);
    expect(success.headers['cache-control']).toBe('no-store');

    const failure = await request(app).post('/api/students').set('Authorization', as(1, 'admin')).send({});
    expect(failure.status).toBe(400);
    expect(failure.headers['cache-control']).toBe('no-store');

    const login = await request(app).post('/api/auth/login').send({});
    expect(login.status).toBe(400);
    expect(login.headers['cache-control']).toBe('no-store');
  });

  test('student and marks responses do not echo the password, its hash, or the access token', async () => {
    const password = 'S3cret-password';
    const passwordHash = await hashPassword(password);
    const admin = account(1, 'admin', { email: 'admin@school.test', passwordHash });
    vi.mocked(userRepository.findByEmail).mockResolvedValue(admin);
    vi.mocked(userRepository.findById).mockResolvedValue(admin);

    const login = await request(app).post('/api/auth/login').send({ email: 'admin@school.test', password });
    expect(login.status).toBe(200);
    const token = login.body.data.accessToken as string;
    expect(token.length).toBeGreaterThan(20);

    const responses = await Promise.all([
      request(app).get('/api/students').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/students/17').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/marks/averages?className=10').set('Authorization', `Bearer ${token}`),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
    for (const response of responses) {
      const text = JSON.stringify(response.body);
      expect(text).not.toContain(password);
      expect(text).not.toContain(passwordHash);
      expect(text).not.toContain(token);
      expect(response.body.curl).toEqual(expect.any(String));
      expect(response.body.curl).not.toContain(password);
      expect(response.body.curl).not.toContain(token);
    }
  });
});
