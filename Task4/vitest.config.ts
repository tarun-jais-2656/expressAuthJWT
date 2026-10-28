import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USER: 'user',
      DB_PASSWORD: 'secret',
      DB_NAME: 'school_test',
      PASS_PERCENTAGE: '40',
      ACADEMIC_YEAR: '2026-27',
      JWT_SECRET: 'test-jwt-secret-value',
      CORS_ORIGINS: 'http://localhost:3000',
      MARKS_RATE_LIMIT_MAX: '60',
    },
  },
});
