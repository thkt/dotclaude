/**
 * Jest Configuration Template
 *
 * TDD-optimized configuration with:
 * - 100% coverage targets (aim high!)
 * - Fast feedback loop
 * - Clear test organization
 *
 * Usage:
 *   1. Copy to project root as jest.config.js
 *   2. Adjust paths and thresholds as needed
 *   3. Run: npm test or jest
 *
 * For TypeScript projects, also install:
 *   npm install -D ts-jest @types/jest
 */

/** @type {import('jest').Config} */
const config = {
  // ===========================================
  // Test Environment
  // ===========================================
  testEnvironment: 'node', // 'jsdom' for browser/React tests

  // ===========================================
  // File Patterns
  // ===========================================
  testMatch: [
    '<rootDir>/src/**/*.{test,spec}.{js,ts,jsx,tsx}',
    '<rootDir>/tests/**/*.{test,spec}.{js,ts,jsx,tsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
  ],

  // ===========================================
  // TypeScript Configuration
  // ===========================================
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      // Enable ES modules support
      useESM: true,
    }],
  },

  // ===========================================
  // Module Resolution
  // ===========================================
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    // Path aliases (match tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    // CSS modules mock
    '\\.module\\.(css|scss|sass)$': 'identity-obj-proxy',
    // Static assets mock
    '\\.(css|scss|sass|less)$': '<rootDir>/tests/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/tests/__mocks__/fileMock.js',
  },

  // ===========================================
  // Coverage Configuration (TDD: Aim for 100%)
  // ===========================================
  collectCoverage: true,
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.{js,ts,jsx,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,ts,jsx,tsx}',
    '!src/**/*.spec.{js,ts,jsx,tsx}',
    '!src/**/index.{js,ts}', // Re-export files
    '!src/**/*.stories.{js,ts,jsx,tsx}', // Storybook
    '!src/types/**', // Type definitions
  ],

  // Coverage thresholds - TDD goal: 100%
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },

  // ===========================================
  // Test Execution
  // ===========================================
  testTimeout: 10000, // 10s timeout per test
  verbose: true,
  bail: false, // Set to 1 to stop on first failure

  // ===========================================
  // Setup Files (uncomment as needed)
  // ===========================================
  // setupFiles: ['<rootDir>/tests/setup.ts'],
  // setupFilesAfterEnv: ['<rootDir>/tests/setup-after-env.ts'],

  // ===========================================
  // Mock Configuration
  // ===========================================
  clearMocks: true,    // Clear mocks between tests
  resetMocks: true,    // Reset mock state
  restoreMocks: true,  // Restore original implementations

  // ===========================================
  // Watch Mode
  // ===========================================
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],

  // ===========================================
  // Reporters
  // ===========================================
  reporters: [
    'default',
    // Uncomment for CI/CD integration
    // ['jest-junit', {
    //   outputDirectory: './test-results',
    //   outputName: 'junit.xml',
    // }],
  ],

  // ===========================================
  // Performance
  // ===========================================
  maxWorkers: '50%', // Use half of available CPU cores
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
}

module.exports = config
