import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ApprovalRequestDto } from './approval-request.dto';

function createDto(overrides: Partial<ApprovalRequestDto> = {}) {
  return plainToInstance(ApprovalRequestDto, {
    documentType: 'purchase_order',
    documentId: '550e8400-e29b-41d4-a716-446655440000',
    documentAmount: 100000,
    approverIds: ['550e8400-e29b-41d4-a716-446655440001'],
    ...overrides,
  });
}

describe('ApprovalRequestDto', () => {
  it('validates a request with at least one approver', async () => {
    const dto = createDto();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('validates a request with an empty approver list for auto-approval', async () => {
    const dto = createDto({ approverIds: [] });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a request with non-string approver ids', async () => {
    const dto = createDto({ approverIds: [123 as any] });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('approverIds');
  });

  it('rejects a request with non-array approverIds', async () => {
    const dto = createDto({ approverIds: 'single-id' as any });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('approverIds');
  });
});
