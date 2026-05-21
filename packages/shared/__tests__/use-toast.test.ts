function loadUseToast() {
  const states: unknown[] = [];
  let index = 0;
  const setState = jest.fn((next: unknown) => {
    states[0] = typeof next === 'function' ? (next as (previous: unknown) => unknown)(states[0]) : next;
  });

  jest.isolateModules(() => {
    jest.doMock('react', () => ({
      useState: jest.fn((initial: unknown) => {
        const current = index++;
        if (!(current in states)) {
          states[current] = initial;
        }
        return [states[current], setState];
      }),
    }));
  });

  const module = require('../src/ui/useToast') as typeof import('../src/ui/useToast');
  return { useToast: module.useToast, states, setState };
}

describe('useToast', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('adds a success toast by default and removes it after the timeout', () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    const { useToast, states } = loadUseToast();

    const toast = useToast();
    toast.showToast('Saved');

    expect(states[0]).toEqual([{ id: '4fzzzxjyl', message: 'Saved', type: 'success' }]);

    jest.advanceTimersByTime(3000);
    expect(states[0]).toEqual([]);
  });

  it('preserves explicit toast variants', () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.987654321);
    const { useToast, states } = loadUseToast();

    useToast().showToast('Inventory warning', 'warning');

    expect(states[0]).toEqual([{ id: 'zk00000yt', message: 'Inventory warning', type: 'warning' }]);
  });
});
