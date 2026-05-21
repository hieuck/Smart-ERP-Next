const mockRegisterRootComponent = jest.fn();
const MockApp = () => null;

jest.mock('expo', () => ({ registerRootComponent: mockRegisterRootComponent }), { virtual: true });
jest.mock('./App', () => MockApp);

describe('mobile app bootstrap coverage', () => {
  it('registers the root Expo component', async () => {
    await import('./index');
    expect(mockRegisterRootComponent).toHaveBeenCalledWith(MockApp);
  });
});
