describe('API main bootstrap coverage', () => {
  const app = {
    enableCors: jest.fn(),
    enableShutdownHooks: jest.fn(),
    listen: jest.fn().mockResolvedValue(undefined),
    useGlobalPipes: jest.fn(),
  };
  const create = jest.fn().mockResolvedValue(app);
  const createDocument = jest.fn(() => ({ openapi: '3.0.0' }));
  const setup = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.CORS_ORIGINS = 'https://web.test,https://admin.test';
    process.env.PORT = '4100';

    jest.doMock('@nestjs/core', () => ({ NestFactory: { create } }));
    jest.doMock('./app.module', () => ({ AppModule: class AppModule {} }));
    jest.doMock('@nestjs/swagger', () => ({
      DocumentBuilder: class {
        addBearerAuth() {
          return this;
        }
        build() {
          return { title: 'Smart ERP Next API' };
        }
        setDescription() {
          return this;
        }
        setTitle() {
          return this;
        }
        setVersion() {
          return this;
        }
      },
      SwaggerModule: { createDocument, setup },
    }));
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.dontMock('@nestjs/core');
    jest.dontMock('@nestjs/swagger');
    jest.dontMock('./app.module');
    jest.restoreAllMocks();
    delete process.env.CORS_ORIGINS;
    delete process.env.PORT;
  });

  it('configures Nest, Swagger, CORS, validation, and shutdown hooks', async () => {
    await import('./main');
    await Promise.resolve();
    await Promise.resolve();

    expect(create).toHaveBeenCalledWith(expect.any(Function), { logger: ['error', 'warn', 'log'] });
    expect(app.enableCors).toHaveBeenCalledWith({
      credentials: true,
      origin: ['https://web.test', 'https://admin.test'],
    });
    expect(app.useGlobalPipes).toHaveBeenCalledWith(expect.objectContaining({}));
    expect(createDocument).toHaveBeenCalledWith(app, { title: 'Smart ERP Next API' });
    expect(setup).toHaveBeenCalledWith('api', app, { openapi: '3.0.0' });
    expect(app.enableShutdownHooks).toHaveBeenCalled();
    expect(app.listen).toHaveBeenCalledWith('4100');
    expect(console.log).toHaveBeenCalledWith('Application is running on: http://localhost:4100');
  });

  it('uses default CORS origins and port when env vars are absent', async () => {
    jest.resetModules();
    delete process.env.CORS_ORIGINS;
    delete process.env.PORT;

    await import('./main');
    await Promise.resolve();
    await Promise.resolve();

    expect(app.enableCors).toHaveBeenLastCalledWith({
      credentials: true,
      origin: ['http://localhost:3001', 'http://localhost:3000'],
    });
    expect(app.listen).toHaveBeenLastCalledWith(3000);
  });
});
