describe('database migration script', () => {
  const originalExit = process.exit;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.doMock('dotenv/config', () => ({}), { virtual: true });
  });

  afterEach(() => {
    process.exit = originalExit;
    jest.restoreAllMocks();
    jest.dontMock('drizzle-orm/node-postgres/migrator');
    jest.dontMock('./db');
  });

  it('runs migrations from the drizzle folder and exits successfully', async () => {
    const db = { connection: 'db' };
    const migrate = jest.fn().mockResolvedValue(undefined);
    jest.doMock('drizzle-orm/node-postgres/migrator', () => ({ migrate }));
    jest.doMock('./db', () => ({ db }));
    const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await import('./migrate');
    await new Promise(process.nextTick);

    expect(log).toHaveBeenCalledWith('Running migrations...');
    expect(migrate).toHaveBeenCalledWith(db, { migrationsFolder: './drizzle' });
    expect(log).toHaveBeenCalledWith('Migrations completed!');
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('logs migration failures and exits with a failing status', async () => {
    const error = new Error('boom');
    const migrate = jest.fn().mockRejectedValue(error);
    jest.doMock('drizzle-orm/node-postgres/migrator', () => ({ migrate }));
    jest.doMock('./db', () => ({ db: {} }));
    const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await import('./migrate');
    await new Promise(process.nextTick);

    expect(errorLog).toHaveBeenCalledWith('Migration failed!', error);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
