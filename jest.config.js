/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: [
    "**/src/**/__tests__/**/*.ts",
    "!**/build/**",
    "!**/node_modules/**"
  ],
  transformIgnorePatterns: [
    "node_modules/(?!@modelcontextprotocol)"
  ]
};