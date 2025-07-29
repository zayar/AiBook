import { beforeAll, afterAll } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/aibook_test';
  process.env.DEFAULT_TENANT_ID = 'test-tenant';
  
  // Mock Firebase in tests
  jest.mock('firebase-admin/app');
  jest.mock('firebase-admin/auth');
});

afterAll(async () => {
  // Cleanup
}); 