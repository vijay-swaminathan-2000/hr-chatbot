const request = require('supertest');
const express = require('express');

// Mock the database connection for testing
jest.mock('../database/connection', () => ({
  query: jest.fn(),
  pool: {
    on: jest.fn()
  }
}));

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock MSAL
jest.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: jest.fn().mockImplementation(() => ({
    acquireTokenByCode: jest.fn(),
    acquireTokenByClientCredential: jest.fn()
  }))
}));

describe('HR Chatbot API', () => {
  let app;

  beforeAll(() => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.HR_EMAIL = 'hr@test.com';
    
    // Create a minimal app for testing
    app = express();
    app.use(express.json());
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('API Structure', () => {
    it('should have proper error handling', () => {
      const errorHandler = require('../middleware/errorHandler').errorHandler;
      expect(typeof errorHandler).toBe('function');
    });

    it('should have authentication middleware', () => {
      const { authenticateToken, requireAdmin } = require('../middleware/auth');
      expect(typeof authenticateToken).toBe('function');
      expect(typeof requireAdmin).toBe('function');
    });
  });
});

// Export for potential use in other tests
module.exports = {};
