module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: false,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ]
};
