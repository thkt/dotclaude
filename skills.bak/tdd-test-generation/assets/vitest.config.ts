/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

/**
 * Vitest Configuration Template
 *
 * TDD-optimized configuration with:
 * - 100% coverage targets (aim high!)
 * - Fast feedback loop
 * - Clear test organization
 *
 * Usage:
 *   1. Copy to project root as vitest.config.ts
 *   2. Adjust paths and thresholds as needed
 *   3. Run: npm test or vitest
 */
export default defineConfig({
  test: {
    // ===========================================
    // Test Environment
    // ===========================================
    environment: 'node', // 'jsdom' for browser/React tests
    globals: true,       // Enable global test APIs (describe, it, expect)

    // ===========================================
    // File Patterns
    // ===========================================
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.git',
      '**/*.d.ts',
    ],

    // ===========================================
    // Coverage Configuration (TDD: Aim for 100%)
    // ===========================================
    coverage: {
      enabled: true,
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // Coverage thresholds - TDD goal: 100%
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },

      // Files to include in coverage
      include: ['src/**/*.{js,ts,jsx,tsx}'],

      // Files to exclude from coverage
      exclude: [
        'node_modules',
        'src/**/*.d.ts',
        'src/**/*.test.{js,ts,jsx,tsx}',
        'src/**/*.spec.{js,ts,jsx,tsx}',
        'src/**/index.{js,ts}', // Re-export files
        'src/**/*.stories.{js,ts,jsx,tsx}', // Storybook
        'src/types/**', // Type definitions
      ],
    },

    // ===========================================
    // Test Execution
    // ===========================================
    testTimeout: 10000,       // 10s timeout per test
    hookTimeout: 10000,       // 10s timeout for hooks
    teardownTimeout: 10000,   // 10s timeout for teardown

    // Watch mode configuration
    watch: true,
    watchExclude: ['node_modules', 'dist'],

    // ===========================================
    // Reporter Configuration
    // ===========================================
    reporters: ['default'],
    outputFile: {
      junit: './test-results/junit.xml',
    },

    // ===========================================
    // Setup Files (uncomment as needed)
    // ===========================================
    // setupFiles: ['./tests/setup.ts'],
    // setupFilesAfterEnv: ['./tests/setup-after-env.ts'],

    // ===========================================
    // Mock Configuration
    // ===========================================
    mockReset: true,      // Reset mocks before each test
    restoreMocks: true,   // Restore mocks after each test
    clearMocks: true,     // Clear mock history

    // ===========================================
    // Snapshot Configuration
    // ===========================================
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: true,
    },
  },

  // ===========================================
  // Path Aliases (match tsconfig.json)
  // ===========================================
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@utils': '/src/utils',
      '@hooks': '/src/hooks',
      '@types': '/src/types',
    },
  },
})
