import { HealthService } from './health.service';

describe('HealthService coverage', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('uses the configured runtime environment when present', async () => {
    process.env.NODE_ENV = 'test';
    const service = new HealthService();

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'ok',
      environment: 'test',
      services: {
        database: 'connected',
        sync: 'operational',
      },
    });
  });

  it('defaults the runtime environment to development', async () => {
    delete process.env.NODE_ENV;
    const service = new HealthService();

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'ok',
      environment: 'development',
    });
  });
});
