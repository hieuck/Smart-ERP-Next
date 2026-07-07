import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { tenantId: 't1' };
    return true;
  }
}

describe('SuppliersController pagination validation', () => {
  let app: INestApplication;
  let svc: { findAll: jest.Mock };

  beforeAll(async () => {
    svc = { findAll: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [{ provide: SuppliersService, useValue: svc }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /suppliers?page=abc&limit=xyz returns 400 Bad Request', async () => {
    const res = await request(app.getHttpServer())
      .get('/suppliers?page=abc&limit=xyz');

    expect(res.status).toBe(400);
  });

  it('GET /suppliers?page=1&limit=10 returns 200 OK', async () => {
    svc.findAll.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    const res = await request(app.getHttpServer())
      .get('/suppliers?page=1&limit=10');

    expect(res.status).toBe(200);
    expect(svc.findAll).toHaveBeenCalledWith('t1', {
      page: 1,
      limit: 10,
      search: undefined,
      isActive: undefined,
    });
    expect(res.body).toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
  });
});
