const { cleanupSmokeArtifacts } = require('./release-runtime-smoke');

describe('cleanupSmokeArtifacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
  });

  it('deletes the smoke product and user when IDs are provided', async () => {
    await cleanupSmokeArtifacts('http://api.example', 'Bearer token', 'user-1', 'product-1', '/uploads/products/img.png');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://api.example/products/product-1',
      expect.objectContaining({ method: 'DELETE', headers: { authorization: 'Bearer token' } }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api.example/users/user-1',
      expect.objectContaining({ method: 'DELETE', headers: { authorization: 'Bearer token' } }),
    );
  });

  it('warns about the uploaded image because no delete API exists', async () => {
    await cleanupSmokeArtifacts('http://api.example', 'Bearer token', 'user-1', 'product-1', '/uploads/products/img.png');

    expect(console.warn).toHaveBeenCalledWith(
      'Smoke uploaded image was not removed (no delete API):',
      '/uploads/products/img.png',
    );
  });

  it('does not call DELETE when IDs are missing', async () => {
    await cleanupSmokeArtifacts('http://api.example', 'Bearer token', undefined, undefined, undefined);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
