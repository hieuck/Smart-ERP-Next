module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.service.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
  coverageDirectory: '../coverage',
  moduleNameMapper: {
    '^@smart-erp/database/schema$': '<rootDir>/../../packages/database/src/schema/index.ts',
    '^@smart-erp/database/drizzle$': '<rootDir>/../../packages/database/src/drizzle.ts',
    '^@smart-erp/database$': '<rootDir>/../../packages/database/src/index.ts',
    '^@smart-erp/(.*)$': '<rootDir>/../../packages/$1/src/index.ts',
  },
};