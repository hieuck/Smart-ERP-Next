import { Logger } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';

describe('ChatbotService coverage', () => {
  const config = { get: jest.fn() };
  let service: ChatbotService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    config.get.mockReturnValue(undefined);
    service = new ChatbotService(config as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tracks greeting conversations in session history and clears them', async () => {
    const response = await service.chat('tenant-1', 'user-1', 'xin chào');

    expect(response).toMatchObject({
      intent: 'greeting',
      suggestions: expect.arrayContaining(['chatbot.suggestions.orderLookup']),
    });
    expect(service.getHistory('tenant-1', 'user-1')).toHaveLength(2);

    service.clearHistory('tenant-1', 'user-1');

    expect(service.getHistory('tenant-1', 'user-1')).toEqual([]);
  });

  it('detects core ERP support intents and extracts order codes', async () => {
    await expect(service.chat('tenant-1', 'user-1', 'status order DH-001')).resolves.toMatchObject({
      intent: 'order_status',
      entities: { orderCode: 'DH-001' },
      actions: expect.arrayContaining([
        expect.objectContaining({ type: 'view_order' }),
      ]),
    });

    await expect(service.chat('tenant-1', 'user-1', 'đơn hàng của tôi ở đâu')).resolves.toMatchObject({
      intent: 'order_status',
      suggestions: expect.arrayContaining(['DH-001']),
    });

    await expect(service.chat('tenant-1', 'user-1', 'tồn kho sản phẩm SKU A')).resolves.toMatchObject({
      intent: 'product_inquiry',
      actions: expect.arrayContaining([
        expect.objectContaining({ type: 'search_products' }),
      ]),
    });

    await expect(service.chat('tenant-1', 'user-1', 'hỗ trợ thanh toán hóa đơn')).resolves.toMatchObject({
      intent: 'payment_help',
      actions: expect.arrayContaining([
        expect.objectContaining({ type: 'view_invoices' }),
      ]),
    });

    await expect(service.chat('tenant-1', 'user-1', 'quên mật khẩu đăng nhập')).resolves.toMatchObject({
      intent: 'account_help',
      actions: expect.arrayContaining([
        expect.objectContaining({ type: 'change_password' }),
      ]),
    });
  });

  it('uses configured AI endpoint for general questions and falls back when unavailable', async () => {
    config.get.mockReturnValue('https://ai.internal');
    const fetchMock = jest.spyOn(global as any, 'fetch');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ response: 'Câu trả lời từ AI' }),
    } as any);

    await expect(service.chat('tenant-1', 'user-1', 'phân tích doanh thu hôm nay')).resolves.toEqual({
      message: 'Câu trả lời từ AI',
      intent: 'general',
    });
    expect(fetchMock).toHaveBeenCalledWith('https://ai.internal/chat', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));

    fetchMock.mockRejectedValueOnce(new Error('offline'));

    await expect(service.chat('tenant-1', 'user-1', 'câu hỏi khác')).resolves.toMatchObject({
      intent: 'general',
      suggestions: expect.arrayContaining(['chatbot.suggestions.contactHotline']),
    });
  });
});
