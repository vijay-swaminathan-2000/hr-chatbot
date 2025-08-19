module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/test/**',
    '!src/database/migrate.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js']
};
