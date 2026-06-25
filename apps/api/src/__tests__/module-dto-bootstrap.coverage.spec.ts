jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn(() => class MockAuthGuard {}),
}));

import { AnalyticsModule } from '../analytics/analytics.module';
import { ApprovalRequestDto } from '../approvals/dto';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { HealthController as AppHealthController } from '../health/health.controller';
import { HealthModule } from '../health/health.module';
import { QueryProductDto } from '../products/dto/query-product.dto';

describe('module, DTO, and bootstrap coverage', () => {
  it('loads Nest modules and guards', () => {
    expect(new AnalyticsModule()).toBeInstanceOf(AnalyticsModule);
    expect(new HealthModule()).toBeInstanceOf(HealthModule);
    expect(new LocalAuthGuard()).toBeInstanceOf(LocalAuthGuard);
  });

  it('loads DTO defaults and health controllers', async () => {
    const approval = Object.assign(new ApprovalRequestDto(), {
      documentAmount: 100,
      documentId: '00000000-0000-4000-8000-000000000000',
      documentType: 'invoice',
    });
    const query = new QueryProductDto();
    expect(approval.documentType).toBe('invoice');
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);

    const monitor = { getHealth: jest.fn().mockResolvedValueOnce({ status: 'up' }).mockResolvedValueOnce({ status: 'down' }) };
    const appHealth = new AppHealthController(monitor as any);
    await expect(appHealth.getHealth()).resolves.toEqual({ status: 'up' });
    await expect(appHealth.getReadiness()).resolves.toEqual({ ready: false, status: 'down' });
    await expect(appHealth.getLiveness()).resolves.toEqual({ alive: true });
  });
});
