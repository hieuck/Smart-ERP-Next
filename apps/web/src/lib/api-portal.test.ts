import { portalApi } from './api-portal';
import { apiClient } from './api-client';

jest.mock('./api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('portalApi', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrders', () => {
    it('should resolve to the unwrapped data array, not the axios response', async () => {
      const orders = [
        { id: '1', code: 'ORD-001', status: 'pending', total: '100', createdAt: '2024-01-01' },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: orders });

      const result = await portalApi.getOrders();

      expect(result).toEqual(orders);
      expect(result).not.toHaveProperty('data');
      expect(apiClient.get).toHaveBeenCalledWith('/portal/orders');
    });
  });

  describe('getOrderTracking', () => {
    it('should reject with an error when the id is not a valid UUID', async () => {
      await expect(portalApi.getOrderTracking('invalid-id')).rejects.toThrow(
        'Invalid UUID: invalid-id',
      );
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should resolve to the unwrapped tracking data for a valid UUID', async () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000';
      const tracking = {
        orderCode: 'ORD-001',
        status: 'shipped',
        steps: [{ step: 'confirmed', completed: true }],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: tracking });

      const result = await portalApi.getOrderTracking(validId);

      expect(result).toEqual(tracking);
      expect(apiClient.get).toHaveBeenCalledWith(`/portal/orders/${validId}/track`);
    });
  });
});
