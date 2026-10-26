/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // `@/assets` must be mapped before the broader `@/` alias, or asset requires resolve under
  // `src/`. Jest's asset transformer then turns the image into a module id.
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.expo/'],
};
