module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  collectCoverage: true,
  collectCoverageFrom: [
    // Release gate: keep coverage strict on deterministic core packages that have
    // unit-level coverage. End-user app flows remain covered by Playwright.
    'packages/utils/src/**/*.ts',
    'packages/validation/src/**/*.ts',
    '!**/*.d.ts',
    '!**/types.ts',
    '!**/*.config.ts',
    '!**/__tests__/**',
    '!**/?(*.)+(spec|test).[jt]s?(x)',
    '!**/dist/**',
    '!**/build/**',
    '!**/.next/**',
    '!**/node_modules/**',
    '!apps/**/test-results/**',
    '!apps/**/e2e/**',
    '!apps/api/src/scratch_debug.ts',
    '!apps/api/src/test-bcrypt.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/', '/dist/', '/build/', '/e2e/', '\\.spec\\.js$', '/apps/desktop/tests/'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
      tsconfig: {
        rootDir: '.',
        baseUrl: '.',
        ignoreDeprecations: '6.0',
        resolveJsonModule: true,
        paths: {
          '@smart-erp/database/schema': ['packages/database/src/schema/index.ts'],
          '@smart-erp/database/drizzle': ['packages/database/src/drizzle.ts'],
          '@smart-erp/database': ['packages/database/src/index.ts'],
          '@smart-erp/*': ['packages/*/src/index.ts'],
        },
      },
    }],
  },
  moduleNameMapper: {
    '^@smart-erp/database/schema$': '<rootDir>/packages/database/src/schema/index.ts',
    '^@smart-erp/database/drizzle$': '<rootDir>/packages/database/src/drizzle.ts',
    '^@smart-erp/database$': '<rootDir>/packages/database/src/index.ts',
    '^@smart-erp/(.*)$': '<rootDir>/packages/$1/src/index.ts',
  },
};
