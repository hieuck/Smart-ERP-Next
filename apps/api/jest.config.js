module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.service.ts',
  ],
  coveragePathIgnorePatterns: [
    'node_modules/',
    '.*\\.(spec|test)\\.ts$',
    '.*src/.*\\.(controller|module)\\.ts$',
    '.*src/.*/dto/.*\\.ts$',
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
  coverageDirectory: '../coverage',
  moduleNameMapper: {
    '^@smart-erp/database/schema$': '<rootDir>/../../packages/database/src/schema/index.ts',
    '^@smart-erp/database/drizzle$': '<rootDir>/../../packages/database/src/drizzle.ts',
    '^@smart-erp/database$': '<rootDir>/../../packages/database/src/index.ts',
    '^@smart-erp/shared/data-contracts$': '<rootDir>/../../packages/shared/src/data-contracts.ts',
    '^@smart-erp/shared/data-contract-registry$': '<rootDir>/../../packages/shared/src/data-contract-registry.ts',
    '^@smart-erp/(.*)$': '<rootDir>/../../packages/$1/src/index.ts',
  },
  testPathIgnorePatterns: ['/node_modules/', '/test/'],
};
