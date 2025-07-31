// Agent: QA & Docs - Jest Setup Configuration

import '@testing-library/jest-dom';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Keep warn and error for debugging
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn()
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-jwt-secret';

// Setup test database connection
beforeAll(async () => {
  // Database setup code will go here
});

afterAll(async () => {
  // Database cleanup code will go here
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});