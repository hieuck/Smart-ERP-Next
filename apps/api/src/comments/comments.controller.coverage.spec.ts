import { CommentsController } from './comments.controller';

describe('CommentsController coverage', () => {
  let svc: any;
  let ctrl: CommentsController;

  beforeEach(() => {
    svc = {
      getByOrder: jest.fn(),
      add: jest.fn(),
      delete: jest.fn(),
    };
    ctrl = new CommentsController(svc);
  });

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  it('getComments delegates to service and wraps in items', async () => {
    svc.getByOrder.mockResolvedValue([{ id: 'c1', content: 'Hello' }]);
    const r = await ctrl.getComments(req, 'order-1');
    expect(svc.getByOrder).toHaveBeenCalledWith('t1', 'order-1');
    expect(r).toEqual({ items: [{ id: 'c1', content: 'Hello' }] });
  });

  it('addComment delegates to service', async () => {
    svc.add.mockResolvedValue({ id: 'c1', content: 'New comment' });
    const body = { content: 'New comment', mentions: ['u2'] };
    const r = await ctrl.addComment(req, 'order-1', body);
    expect(svc.add).toHaveBeenCalledWith('t1', 'order-1', 'u1', 'New comment', ['u2']);
    expect(r).toEqual({ id: 'c1', content: 'New comment' });
  });

  it('addComment passes empty mentions when not provided', async () => {
    svc.add.mockResolvedValue({ id: 'c2' });
    const body = { content: 'No mentions' };
    await ctrl.addComment(req, 'order-1', body);
    expect(svc.add).toHaveBeenCalledWith('t1', 'order-1', 'u1', 'No mentions', []);
  });

  it('deleteComment delegates to service', async () => {
    svc.delete.mockResolvedValue(undefined);
    const r = await ctrl.deleteComment(req, 'order-1', 'comment-1');
    expect(svc.delete).toHaveBeenCalledWith('t1', 'comment-1', 'u1');
    expect(r).toEqual({ success: true });
  });
});
