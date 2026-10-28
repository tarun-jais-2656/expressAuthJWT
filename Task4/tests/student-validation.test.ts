import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

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

vi.mock('../src/modules/user/user.repository', () => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
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
import { as } from './asUser.js';
import * as markRepository from '../src/modules/mark/mark.repository.js';
import * as studentRepository from '../src/modules/student/student.repository.js';
import * as userRepository from '../src/modules/user/user.repository.js';

const admin = () => {
  const token = as(1, 'admin');
  return {
    get: (url: string) => request(app).get(url).set('Authorization', token),
    post: (url: string) => request(app).post(url).set('Authorization', token),
    patch: (url: string) => request(app).patch(url).set('Authorization', token),
    delete: (url: string) => request(app).delete(url).set('Authorization', token),
  };
};

const pathsOf = (details: unknown): string => JSON.stringify(details);

const guardian = {
  name: 'Ravi Sharma',
  phone: '+919876543210',
  relation: 'father',
};

const validStudent = (overrides: Record<string, unknown> = {}) => ({
  rollNo: '2026-10A-017',
  firstName: 'Asha',
  lastName: 'Sharma',
  dateOfBirth: '2014-01-15',
  className: '10',
  section: 'A',
  guardian,
  ...overrides,
});

const sampleStudent = {
  id: 1,
  rollNo: '2026-10A-017',
  firstName: 'Asha',
  lastName: 'Sharma',
  dateOfBirth: new Date(Date.UTC(2014, 0, 15)),
  className: '7',
  section: 'A',
  guardian: { name: 'Ravi Sharma', phone: '+919876543210', relation: 'mother' as const },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('student and mark validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(studentRepository.insert).mockResolvedValue(sampleStudent);
    vi.mocked(studentRepository.findById).mockResolvedValue(sampleStudent);
    vi.mocked(markRepository.insertMany).mockResolvedValue([]);
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: 1,
      name: 'Admin',
      email: 'admin@school.test',
      role: 'admin',
      studentId: null,
      passwordHash: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  const expectRejected = async (response: request.Response, field: string) => {
    expect(response.status).toBe(400);
    expect(pathsOf(response.body.error?.details)).toContain(field);
    expect(studentRepository.insert).not.toHaveBeenCalled();
    expect(studentRepository.update).not.toHaveBeenCalled();
    expect(studentRepository.findMany).not.toHaveBeenCalled();
    expect(markRepository.insertMany).not.toHaveBeenCalled();
  };

  test('1. SQL injection in rollNo', async () => {
    // The quote would close the SQL string and turn the rest into a second statement.
    const response = await admin()
      .post('/api/students')
      .send(validStudent({ rollNo: "2026-10A-017' OR '1'='1" }));
    await expectRejected(response, 'rollNo');
  });

  test('2. stored XSS in a top-level name', async () => {
    // The script would run in any page that rendered firstName as HTML.
    const response = await admin()
      .post('/api/students')
      .send(validStudent({ firstName: '<script>alert(1)</script>' }));
    await expectRejected(response, 'firstName');
  });

  test('3. XSS hidden inside the nested guardian', async () => {
    // The image handler would run when a staff page rendered guardian.name.
    const response = await admin()
      .post('/api/students')
      .send(validStudent({ guardian: { ...guardian, name: '<img src=x onerror=alert(1)>' } }));
    await expectRejected(response, 'guardian.name');
  });

  test('4. prototype pollution via __proto__', async () => {
    // Merging this object would put admin on Object.prototype for every object.
    const body = `{"__proto__":{"admin":true},${JSON.stringify(validStudent()).slice(1)}`;
    const response = await admin().post('/api/students').set('content-type', 'application/json').send(body);
    await expectRejected(response, '__proto__');
  });

  test('5. mass assignment of id', async () => {
    // A client-chosen id would overwrite an existing student row.
    const response = await admin().post('/api/students').send(validStudent({ id: 1 }));
    await expectRejected(response, 'id');
  });

  test('6. type confusion: object where a string is required', async () => {
    // An object firstName could bypass string sanitising and crash the mapper.
    const response = await admin()
      .post('/api/students')
      .send(validStudent({ firstName: { text: 'Asha' } }));
    await expectRejected(response, 'firstName');
  });

  test('7. oversized marks array', async () => {
    // A thousand rows in one request would lock the marks table inside the transaction.
    const marks = Array.from({ length: 1000 }, (_, index) => ({
      subject: `sub${index}`,
      score: 1,
      maxScore: 100,
    }));
    const response = await admin().post('/api/students/1/marks').send({ exam: 'final', marks });
    await expectRejected(response, 'marks');
  });

  test('8. score above maxScore inside the marks array', async () => {
    // The stored percentage would exceed 100 and inflate the subject average.
    const response = await admin()
      .post('/api/students/1/marks')
      .send({ exam: 'final', marks: [{ subject: 'maths', score: 120, maxScore: 100 }] });
    await expectRejected(response, 'marks.0.score');
  });

  test('8b. negative score on one item uses that item index', async () => {
    // A negative score would drag the subject average below the real class result.
    const marks = [0, 1, 2, 3].map((index) => ({
      subject: `sub${index}`,
      score: index === 3 ? -5 : 10,
      maxScore: 100,
    }));
    const response = await admin().post('/api/students/1/marks').send({ exam: 'unit-1', marks });
    await expectRejected(response, 'marks.3.score');
  });

  test('9. null byte in lastName', async () => {
    // A null byte can truncate the value in C-based loggers and hide the rest of the name.
    const response = await admin()
      .post('/api/students')
      .send(validStudent({ lastName: 'Sharma\u0000' }));
    await expectRejected(response, 'lastName');
  });

  test('10. impossible calendar date', async () => {
    // 30 February would shift the age check and store a different day than the client sent.
    const response = await admin()
      .post('/api/students')
      .send(validStudent({ dateOfBirth: '2026-02-30' }));
    await expectRejected(response, 'dateOfBirth');
  });

  test('query values outside the allowed range are rejected', async () => {
    const limit = await admin().get('/api/students?limit=100000');
    await expectRejected(limit, 'limit');
    const className = await admin().get('/api/students?className=13');
    await expectRejected(className, 'className');
    const section = await admin().get('/api/students?section=Z');
    await expectRejected(section, 'section');
  });

  test('updating maxScore below the stored score is rejected in the service', async () => {
    vi.mocked(markRepository.findById).mockResolvedValue({
      id: 1,
      studentId: 1,
      exam: 'final',
      subject: 'maths',
      score: 80,
      maxScore: 100,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const response = await admin().patch('/api/marks/1').send({ maxScore: 50 });
    expect(response.status).toBe(400);
    expect(pathsOf(response.body.error?.details)).toContain('score');
    expect(markRepository.update).not.toHaveBeenCalled();
  });

  test('valid input is sanitised before it reaches the repository', async () => {
    const response = await admin()
      .post('/api/students')
      .send(
        validStudent({
          rollNo: '  2026-10a-017 ',
          className: 7,
          guardian: { name: 'Ravi Sharma', phone: '+91 98765-43210', relation: 'Mother' },
        }),
      );
    expect(response.status).toBe(201);
    expect(studentRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        rollNo: '2026-10A-017',
        className: '7',
        guardian: expect.objectContaining({
          phone: '+919876543210',
          relation: 'mother',
        }),
      }),
    );
  });
});
