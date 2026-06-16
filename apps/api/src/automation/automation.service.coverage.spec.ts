import { Test, TestingModule } from '@nestjs/testing';
import { AutomationService } from './automation.service';
import { DrizzleService } from '../drizzle/drizzle.service';

const mockDrizzle = { db: {} } as any;

describe('AutomationService', () => {
  let service: AutomationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutomationService, { provide: DrizzleService, useValue: mockDrizzle }],
    }).compile();
    service = module.get<AutomationService>(AutomationService);
  });

  it('listWorkflows returns empty array initially', async () => {
    const result = await service.listWorkflows('t1');
    expect(result).toEqual([]);
  });

  it('createWorkflow returns workflow with id', async () => {
    const wf = await service.createWorkflow('t1', {
      name: 'Test WF',
      triggerType: 'webhook',
      steps: [{ type: 'send_notification', config: {} }],
    });
    expect(wf.id).toBeTruthy();
    expect(wf.name).toBe('Test WF');
    expect(wf.isActive).toBe(true);
  });

  it('createWorkflow generates different IDs', async () => {
    const wf1 = await service.createWorkflow('t1', { name: 'A', triggerType: 'schedule', steps: [] });
    const wf2 = await service.createWorkflow('t1', { name: 'B', triggerType: 'schedule', steps: [] });
    expect(wf1.id).not.toBe(wf2.id);
  });

  it('toggleWorkflow changes active state', async () => {
    const result = await service.toggleWorkflow('t1', 'wf-1', false);
    expect(result.isActive).toBe(false);
  });

  it('getAvailableTriggers returns predefined list', async () => {
    const triggers = await service.getAvailableTriggers();
    expect(triggers.length).toBeGreaterThan(0);
    expect(triggers.some(t => t.key === 'order.created')).toBe(true);
  });

  it('getAvailableActions returns predefined list', async () => {
    const actions = await service.getAvailableActions();
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some(a => a.key === 'send_notification')).toBe(true);
  });
});
