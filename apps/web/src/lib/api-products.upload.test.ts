import { productsApi } from './api-products';

const postMock = jest.fn();

jest.mock('./api-client', () => ({
  apiClient: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

describe('productsApi.uploadImage', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({ data: { imageUrl: '/uploads/test.png', filename: 'test.png', size: 123, mimeType: 'image/png' } });
  });

  test('does not set explicit multipart Content-Type so axios/browser can add the boundary', async () => {
    const file = new File(['dummy'], 'product.png', { type: 'image/png' });
    await productsApi.uploadImage(file);

    expect(postMock).toHaveBeenCalledTimes(1);
    const [, , config] = postMock.mock.calls[0];

    // Setting Content-Type to 'multipart/form-data' without a boundary breaks uploads (#557).
    // The fix either omits the header or undefines it so axios sets the correct boundary.
    expect(config?.headers?.['Content-Type']).not.toBe('multipart/form-data');
  });
});
