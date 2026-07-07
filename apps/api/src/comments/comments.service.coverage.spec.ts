jest.mock('@smart-erp/database', () => ({ db: {} as any }));
jest.mock('@smart-erp/database/schema', () => ({ comments: {}, users: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  desc: jest.fn(),
}));

import { CommentsService } from './comments.service';
import { db } from '@smart-erp/database';

describe('CommentsService getByOrder query order', () => {
  let service: CommentsService;
  let capturedChain: any;
  const callOrder: string[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
    const chain: any = {
      from: jest.fn(() => { callOrder.push('from'); return chain; }),
      leftJoin: jest.fn(() => { callOrder.push('leftJoin'); return chain; }),
      where: jest.fn(() => { callOrder.push('where'); return chain; }),
      orderBy: jest.fn(() => { callOrder.push('orderBy'); return chain; }),
      limit: jest.fn(() => {
        callOrder.push('limit');
        return Promise.resolve([{ comments: { id: 'c1' }, users: { id: 'u1', name: 'User' } }]);
      }),
    };
    (db as any).select = jest.fn(() => { callOrder.push('select'); capturedChain = chain; return chain; });
    service = new CommentsService({} as any);
  });

  it('calls leftJoin before where, orderBy and limit', async () => {
    const result = await service.getByOrder('tenant-1', 'order-1');

    expect(result).toHaveLength(1);
    expect(capturedChain.leftJoin).toHaveBeenCalled();
    expect(capturedChain.where).toHaveBeenCalled();
    expect(capturedChain.orderBy).toHaveBeenCalled();
    expect(capturedChain.limit).toHaveBeenCalled();

    const leftJoinIndex = callOrder.indexOf('leftJoin');
    expect(leftJoinIndex).toBeLessThan(callOrder.indexOf('where'));
    expect(leftJoinIndex).toBeLessThan(callOrder.indexOf('orderBy'));
    expect(leftJoinIndex).toBeLessThan(callOrder.indexOf('limit'));
  });
});
