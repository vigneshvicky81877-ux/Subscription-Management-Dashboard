// Imported first by every test file so config/env.js sees valid values.
import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgresql://invalid:invalid@localhost:5432/invalid';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-that-is-long-enough-123456';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-that-is-long-enough-654321';
process.env.BCRYPT_ROUNDS = '4';
