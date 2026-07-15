const baseConfig = require('./jest.config.js');
module.exports = {
  ...baseConfig,
  testPathIgnorePatterns: baseConfig.testPathIgnorePatterns.filter(
    p => !p.includes('worktree')
  ),
  modulePathIgnorePatterns: baseConfig.modulePathIgnorePatterns.filter(
    p => !p.includes('worktree')
  ),
};
