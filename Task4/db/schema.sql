CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  roll_no VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  date_of_birth DATE NOT NULL,
  class_name VARCHAR(2) NOT NULL,
  section CHAR(1) NOT NULL,
  guardian_name VARCHAR(80) NOT NULL,
  guardian_phone VARCHAR(20) NOT NULL,
  guardian_relation VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marks (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  exam VARCHAR(20) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  score NUMERIC(5, 2) NOT NULL,
  max_score NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marks_student_exam_subject_key UNIQUE (student_id, exam, subject),
  CONSTRAINT marks_score_range CHECK (score >= 0 AND score <= max_score),
  CONSTRAINT marks_max_score_range CHECK (max_score >= 1 AND max_score <= 200)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'moderator', 'admin', 'teacher', 'student'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id INTEGER NULL REFERENCES students (id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_student_id_key ON users (student_id) WHERE student_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS teacher_classes (
  teacher_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  class_name VARCHAR(2) NOT NULL,
  section CHAR(1) NOT NULL,
  PRIMARY KEY (teacher_user_id, class_name, section)
);
