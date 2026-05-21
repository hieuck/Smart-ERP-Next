const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
};

jest.mock('./api', () => ({ api: mockApi }));

import { forecastApi } from './forecast';

describe('mobile forecast API coverage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates forecast and reorder requests to mobile API client', async () => {
    await forecastApi.getMonthlyDemand('product 1');
    await forecastApi.getReorderSuggestion('product-1', 12);
    await forecastApi.getRecommendation('product 1', 5);

    expect(mockApi.get).toHaveBeenCalledWith('/forecast/product/product 1');
    expect(mockApi.post).toHaveBeenCalledWith('/forecast/reorder', { currentStock: 12, productId: 'product-1' });
    expect(mockApi.get).toHaveBeenCalledWith('/inventory-recommendation/suggest?productId=product%201&stock=5');
  });
});
