# School records API

Students, guardians, and exam marks. Configuration, validation, and row mapping follow the rules below. New modules copy `src/modules/user` and `src/modules/post`.

## 1. Configuration

`src/config/env.ts` is the only place environment variables are read.

- `validateConfig(source)` parses one Zod schema. It throws an `Error` whose message names the variable and says what is wrong. `src/server.ts` prints that message and exits with code 1. There is no second validator.
- `PASS_PERCENTAGE` and `ACADEMIC_YEAR` are required and have no default. `PASS_PERCENTAGE` is a number from 0 to 100 (`"33.5"` becomes `33.5`). `ACADEMIC_YEAR` is `YYYY-YY` and the second year must be the first year plus one (`2026-27` is valid, `2026-28` and `26-27` are not).
- `getEnv()` caches a successful parse for the running process. Tests set the same variables in `vitest.config.ts`, so they do not need a `.env`.

```bash
cp .env.example .env
npm run db:migrate
npm run dev
```

## 2. Validation

Request schemas live in each module's `*.dto.ts` and reuse `src/utils/validators.ts`.

- `safeText` trims, NFC-normalises, and rejects control characters, null bytes, and `<` `>`. `personName` and `tag` build on it.
- Body objects use `z.strictObject`, including `guardian` and each `marks[]` item. Unknown keys are a 400. Query objects strip unknown keys.
- `idParam` and `pagination` validate ids, `limit` (1–100), and `offset`.
- `escapeLike` escapes `\`, `%`, and `_` before an `ILIKE` pattern is bound as a parameter.
- `rejectDangerousPayload` / JSON `verify` rejects `__proto__`, `constructor`, and `prototype` before a controller runs.
- Controllers call `schema.parse`. A `ZodError` reaches `errorHandler`, which returns `400` and `details` with dotted paths such as `guardian.phone` and `marks.2.score`. Handlers do not send errors themselves.
- Every success response goes through `sendSuccess`.

## 3. Mapping

Repositories are the only files that see database rows.

- `toDomain(row)` builds the camelCase domain object. Student guardian columns become `guardian`. Mark `NUMERIC` strings such as `"78.50"` become numbers. An unknown `guardian_relation` or exam throws.
- `toPersistence(changes)` flattens a domain change into snake_case columns and omits fields that were not supplied.
- Services call `toResponseDto`. Dates become ISO strings. `dateOfBirth` becomes `YYYY-MM-DD`. Subject averages are rounded to two decimals and `passed` is `averagePercentage >= PASS_PERCENTAGE`.
- SQL values are always `$1`, `$2`, … parameters.

## API

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/students` | Create a student and nested guardian. `201` |
| PATCH | `/api/students/:id` | Partial update. `guardian`, when sent, replaces the whole object |
| GET | `/api/students` | Filters: `className`, `section`, `search`, `limit`, `offset` |
| GET | `/api/students/:id` | |
| DELETE | `/api/students/:id` | `204`. Marks are removed by `ON DELETE CASCADE` |
| POST | `/api/students/:id/marks` | `{ exam, marks: [...] }` saved in one transaction. `201` or `409` |
| PATCH | `/api/marks/:id` | `score` and/or `maxScore`. The merged pair must keep `score <= maxScore` |
| DELETE | `/api/marks/:id` | `204` |
| GET | `/api/marks/averages` | Required `className`. Optional `exam`, `section` |

Create student:

```bash
curl -s -X POST http://localhost:3000/api/students \
  -H 'content-type: application/json' \
  -d '{
    "rollNo": "2026-10A-017",
    "firstName": "Asha",
    "lastName": "Sharma",
    "dateOfBirth": "2014-01-15",
    "className": 10,
    "section": "a",
    "guardian": { "name": "Ravi Sharma", "phone": "+91 98765-43210", "relation": "Father" }
  }'
```

`rollNo` is stored as `2026-10A-017`, `section` as `A`, `relation` as `father`, and the phone as `+919876543210`.

Create marks:

```bash
curl -s -X POST http://localhost:3000/api/students/1/marks \
  -H 'content-type: application/json' \
  -d '{ "exam": "final", "marks": [{ "subject": "maths", "score": 88, "maxScore": 100 }] }'
```

Averages:

```bash
curl -s 'http://localhost:3000/api/marks/averages?className=10&exam=final'
```

```json
{
  "data": [
    { "subject": "maths", "averagePercentage": 72.35, "students": 31, "passed": true }
  ]
}
```

`averagePercentage` is `AVG(score / max_score * 100)` for that subject, rounded to two decimals. `passed` compares it with `PASS_PERCENTAGE`. Subjects with no rows are omitted.

Errors:

```json
{ "error": { "message": "Validation failed", "details": [{ "path": "guardian.phone", "message": "phone must be E.164" }] } }
```

Duplicate roll numbers and duplicate `(student, exam, subject)` marks return `409`. A missing student or mark returns `404`. A record that exists but is outside the caller's scope returns `403`.

Student, mark, and auth routes require `Authorization: Bearer <access token>`.

## 4. Authentication

`POST /api/auth/register` creates a plain `user`. That account can see no students and no marks. `POST /api/auth/login` returns a 15-minute access token. `authenticate` verifies the signature and then loads the account from the database, so a token issued to a teacher stops authorising teacher actions as soon as an admin changes that account's role.

Roles are `user`, `moderator`, `admin`, `teacher`, and `student`. A student login is tied to one `students` row (`users.student_id`). A teacher is tied to classes through `teacher_classes`. Admins create those links:

```bash
curl -s -X POST http://localhost:3000/api/admin/teacher-classes \
  -H 'authorization: Bearer ADMIN_TOKEN' \
  -H 'content-type: application/json' \
  -d '{ "teacherUserId": 2, "className": "10", "section": "A" }'

curl -s -X POST http://localhost:3000/api/admin/student-links \
  -H 'authorization: Bearer ADMIN_TOKEN' \
  -H 'content-type: application/json' \
  -d '{ "userId": 4, "studentId": 17 }'
```

Linking the wrong kind of account is `400`. An unknown user or student is `404`. A duplicate link is `409`.

## 5. Permissions

Routes call `requirePermission` / `requireAnyPermission`. Services call `canAccessStudent` for one record, or the list filter. Neither place compares role names.

| Permission | admin | teacher | student |
| --- | --- | --- | --- |
| students:read:own | yes |  | yes |
| students:read:class | yes | yes |  |
| students:read:any | yes |  |  |
| students:write:any | yes |  |  |
| marks:read:own | yes |  | yes |
| marks:read:class | yes | yes |  |
| marks:read:any | yes |  |  |
| marks:write:class | yes | yes |  |
| marks:write:any | yes |  |  |
| marks:averages:class | yes | yes |  |
| marks:averages:any | yes |  |  |

`accounts:link` is admin-only and guards the two link endpoints. `user` and `moderator` keep working and have none of these permissions.

`canAccessStudent(actor, student, action)` is the only ownership check:

- a matching `:any` permission allows the action
- a matching `:class` permission allows it when the student's class and section are in `teacher_classes` for that account
- a matching `:own` permission allows it when `users.student_id` is that student

Lists filter instead of returning 403. A teacher or student is allowed to ask "who can I see?", and the answer is the rows inside their scope. A 403 would block that normal screen, and it would not say which rows were the problem. A caller with no read permission, such as a freshly registered `user`, gets 403 because they have no scope to filter to.

A single student or mark outside the caller's scope is 403 on every endpoint. 404 is only for an id that does not exist. The service has already loaded the row and then refused it, so the status is forbidden rather than a second, contradictory "missing". Averages for a class the teacher does not teach are the same 403.

Teacher, own classes:

```bash
curl -s http://localhost:3000/api/students \
  -H 'authorization: Bearer TEACHER_TOKEN'
```

Student, own profile:

```bash
curl -s http://localhost:3000/api/students/17 \
  -H 'authorization: Bearer STUDENT_TOKEN'
```

Forbidden, a teacher entering marks for a student in another class:

```bash
curl -s -X POST http://localhost:3000/api/students/23/marks \
  -H 'authorization: Bearer TEACHER_TOKEN' \
  -H 'content-type: application/json' \
  -d '{ "exam": "final", "marks": [{ "subject": "maths", "score": 40, "maxScore": 100 }] }'
```

```json
{ "error": { "message": "Forbidden" } }
```

## 6. API security

`POST /api/students/:id/marks` allows `MARKS_RATE_LIMIT_MAX` requests (default 60) per 10 minutes per authenticated user. The limiter is mounted after `authenticate` and keys on `req.user.id`, because a school shares one public IP. The next request is `429` with the usual error body. Another user on that same IP is unaffected.

`/api/auth`, `/api/students`, and `/api/marks` send `Cache-Control: no-store` on success and on errors.

`CORS_ORIGINS=*` fails at startup with its own message: a wildcard would let any website call this API with the user's browser session. Other bad values still have to be full `http` or `https` URLs.

Response bodies include a `curl` field that is only the method and URL. Passwords, password hashes, and raw access tokens are not copied into it or into `data`.
