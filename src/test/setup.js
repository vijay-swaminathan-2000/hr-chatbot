// Jest setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.HR_EMAIL = 'hr@test.com';
process.env.LOG_LEVEL = 'error';
process.env.JUMPCLOUD_CLIENT_ID = 'test-client-id';
process.env.JUMPCLOUD_CLIENT_SECRET = 'test-client-secret';
process.env.JUMPCLOUD_TENANT_ID = 'test-tenant-id';
process.env.SHAREPOINT_CLIENT_ID = 'test-sp-client-id';
process.env.SHAREPOINT_CLIENT_SECRET = 'test-sp-client-secret';
process.env.SHAREPOINT_TENANT_ID = 'test-sp-tenant-id';

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
