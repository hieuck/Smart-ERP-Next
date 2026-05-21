jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn(() => class MockAuthGuard {}),
}));

import { MODULE_METADATA } from '@nestjs/common/constants';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ApprovalRequestDto } from '../approvals/dto';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { HealthController as AppHealthController } from '../health/health.controller';
import { HealthModule } from '../modules/health/health.module';
import { HealthController } from '../modules/health/health.controller';
import { HealthService } from '../modules/health/health.service';
import { UpdateReorderPointDto } from '../modules/products/dto/update-reorder-point.dto';
import { SocketModule } from '../socket/socket.module';
import { ChatModule } from '../chat/chat.module';
import { WebhooksModule } from '../modules/webhooks/webhooks.module';
import { QueryProductDto } from '../products/dto/query-product.dto';

describe('module, DTO, and bootstrap coverage', () => {
  it('loads Nest modules and guards', () => {
    expect(new AnalyticsModule()).toBeInstanceOf(AnalyticsModule);
    expect(new HealthModule()).toBeInstanceOf(HealthModule);
    expect(new SocketModule()).toBeInstanceOf(SocketModule);
    expect(new ChatModule()).toBeInstanceOf(ChatModule);
    expect(new WebhooksModule()).toBeInstanceOf(WebhooksModule);
    expect(new LocalAuthGuard()).toBeInstanceOf(LocalAuthGuard);
  });

  it('builds socket JWT module options from configuration', async () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, SocketModule);
    const jwtModule = imports.find((module: any) => Array.isArray(module.providers));
    const optionsProvider = jwtModule.providers.find((provider: any) => typeof provider.useFactory === 'function');

    await expect(optionsProvider.useFactory({ get: jest.fn().mockReturnValue('jwt-secret') })).resolves.toEqual({
      secret: 'jwt-secret',
      signOptions: { expiresIn: '7d' },
    });
  });

  it('loads DTO defaults and health controllers/services', async () => {
    jest.spyOn(process, 'uptime').mockReturnValue(123);
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));

    const approval = Object.assign(new ApprovalRequestDto(), {
      documentAmount: 100,
      documentId: '00000000-0000-4000-8000-000000000000',
      documentType: 'invoice',
    });
    const reorder = Object.assign(new UpdateReorderPointDto(), { minStock: 5, reorderQuantity: 10 });
    const query = new QueryProductDto();
    expect(approval.documentType).toBe('invoice');
    expect(reorder.reorderQuantity).toBe(10);
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);

    const service = new HealthService();
    await expect(service.getHealth()).resolves.toMatchObject({
      environment: 'test',
      services: { database: 'connected', sync: 'operational' },
      status: 'ok',
      timestamp: '2026-05-21T00:00:00.000Z',
      uptime: 123,
      version: '0.3.0',
    });
    await expect(new HealthController(service).getHealth()).resolves.toMatchObject({ status: 'ok' });

    const monitor = { getHealth: jest.fn().mockResolvedValueOnce({ status: 'up' }).mockResolvedValueOnce({ status: 'down' }) };
    const appHealth = new AppHealthController(monitor as any);
    await expect(appHealth.getHealth()).resolves.toEqual({ status: 'up' });
    await expect(appHealth.getReadiness()).resolves.toEqual({ ready: false, status: 'down' });
    await expect(appHealth.getLiveness()).resolves.toEqual({ alive: true });

    jest.useRealTimers();
    jest.restoreAllMocks();
  });
});
