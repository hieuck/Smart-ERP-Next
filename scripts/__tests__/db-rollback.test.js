const childProcess = require('child_process');
const fs = require('fs');

let execFileSyncMock;
let existsSyncMock;

jest.doMock('child_process', () => ({
  ...childProcess,
  execFileSync: (...args) => execFileSyncMock(...args),
}));

jest.doMock('fs', () => ({
  ...fs,
  existsSync: (...args) => existsSyncMock(...args),
}));

const { runRollback } = require('../db-rollback');

describe('db-rollback', () => {
  beforeEach(() => {
    execFileSyncMock = jest.fn().mockReturnValue(Buffer.from(''));
    existsSyncMock = jest.fn().mockReturnValue(true);
  });

  it('rejects migration names with shell metacharacters', () => {
    expect(() => runRollback('test; rm -rf /', 'postgres://localhost/db')).toThrow(
      'Invalid migration name. Use only alphanumeric characters, hyphens, and underscores.',
    );
  });

  it('rejects migration names with path traversal', () => {
    expect(() => runRollback('../etc/passwd', 'postgres://localhost/db')).toThrow(
      'Invalid migration name. Use only alphanumeric characters, hyphens, and underscores.',
    );
  });

  it('calls psql with a connection string and file path as separate arguments', () => {
    runRollback('0010_init', 'postgres://user:pass@localhost:5432/db');

    expect(execFileSyncMock).toHaveBeenCalledTimes(1);
    const [command, args, options] = execFileSyncMock.mock.calls[0];
    expect(command).toBe('psql');
    expect(args).toEqual([
      'postgres://user:pass@localhost:5432/db',
      '-f',
      expect.stringMatching(/rollback-0010_init\.sql$/),
    ]);
    expect(options.stdio).toBe('inherit');
  });

  it('throws when the rollback SQL file does not exist', () => {
    existsSyncMock.mockReturnValue(false);

    expect(() => runRollback('0010_init', 'postgres://localhost/db')).toThrow('Rollback script not found');
  });
});
