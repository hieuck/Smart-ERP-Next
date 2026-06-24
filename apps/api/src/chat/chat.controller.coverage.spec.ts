import { ChatController } from './chat.controller';

describe('ChatController coverage', () => {
  const req = { user: { tenantId: 't1', sub: 'u1' } };
  const chatService = {
    getConversation: jest.fn(),
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
    getUnreadCount: jest.fn(),
  };
  const ctrl = new ChatController(chatService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getConversation delegates to service', async () => {
    chatService.getConversation.mockResolvedValue([{ text: 'hello' }]);
    const result = await ctrl.getConversation(req, 'user-2');
    expect(chatService.getConversation).toHaveBeenCalledWith('t1', 'u1', 'user-2');
    expect(result).toEqual({ items: [{ text: 'hello' }] });
  });

  it('sendMessage delegates to service', async () => {
    chatService.sendMessage.mockResolvedValue({ id: 'msg-1' });
    const body = { toUserId: 'user-2', content: 'Hi' };
    const result = await ctrl.sendMessage(req, body);
    expect(chatService.sendMessage).toHaveBeenCalledWith('t1', 'u1', 'user-2', 'Hi');
    expect(result).toEqual({ id: 'msg-1' });
  });

  it('markRead delegates to service', async () => {
    chatService.markAsRead.mockResolvedValue(undefined);
    const result = await ctrl.markRead(req, 'msg-1');
    expect(chatService.markAsRead).toHaveBeenCalledWith('t1', 'msg-1', 'u1');
    expect(result).toEqual({ success: true });
  });

  it('getUnreadCount delegates to service', async () => {
    chatService.getUnreadCount.mockResolvedValue(3);
    const result = await ctrl.getUnreadCount(req);
    expect(chatService.getUnreadCount).toHaveBeenCalledWith('t1', 'u1');
    expect(result).toEqual({ unreadCount: 3 });
  });
});
