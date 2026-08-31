/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  // fixtures.js and helpers/ hold shared data, not tests -- without this Jest
  // picks them up as empty suites and fails the run.
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["routes/**/*.js", "server.js"],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      lines: 70,
      functions: 70,
    },
  },
};
