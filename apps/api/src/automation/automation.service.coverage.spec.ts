import { AutomationService } from './automation.service';

describe('AutomationService coverage', () => {
  const service = new AutomationService({} as any);

  beforeEach(() => {
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('workflow-1');
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('creates, toggles, lists, and executes workflow placeholders', async () => {
    await expect(service.listWorkflows('tenant-1')).resolves.toEqual([]);
    await expect(
      service.createWorkflow('tenant-1', {
        name: 'Order alert',
        steps: [{ config: {}, type: 'send_notification' }],
        triggerEvent: 'order.created',
        triggerType: 'webhook',
      }),
    ).resolves.toMatchObject({
      createdAt: '2026-05-21T00:00:00.000Z',
      id: 'workflow-1',
      isActive: true,
      tenantId: 'tenant-1',
      updatedAt: '2026-05-21T00:00:00.000Z',
    });
    await expect(service.toggleWorkflow('tenant-1', 'workflow-1', false)).resolves.toMatchObject({
      id: 'workflow-1',
      isActive: false,
    });
    await expect(service.getAvailableTriggers()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'order.created' })]),
    );
    await expect(service.getAvailableActions()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'send_email' })]),
    );
    await expect(service.executeWorkflow('workflow-1', { orderId: 'order-1' })).resolves.toMatchObject({
      executed: true,
      workflowId: 'workflow-1',
    });
  });
});
