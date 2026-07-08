type EffectCleanup = void | (() => void);

interface ReactMock {
  reset: () => void;
  states: unknown[];
  setters: jest.Mock[];
  effects: EffectCleanup[];
  refs: { current: unknown }[];
  useState: jest.Mock;
  useEffect: jest.Mock;
  useCallback: jest.Mock;
  useRef: jest.Mock;
}

function createReactMock(): ReactMock {
  const mock: ReactMock = {
    reset: () => {
      index = 0;
    },
    states: [],
    setters: [],
    effects: [],
    refs: [],
    useState: jest.fn(),
    useEffect: jest.fn(),
    useCallback: jest.fn((callback: unknown) => callback),
    useRef: jest.fn(),
  };
  let index = 0;

  mock.useState.mockImplementation((initial: unknown) => {
    const current = index++;
    if (!(current in mock.states)) {
      mock.states[current] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
    }
    const setter = jest.fn((next: unknown) => {
      mock.states[current] =
        typeof next === 'function' ? (next as (previous: unknown) => unknown)(mock.states[current]) : next;
    });
    mock.setters[current] = setter;
    return [mock.states[current], setter];
  });
  mock.useEffect.mockImplementation((effect: () => EffectCleanup) => {
    mock.effects.push(effect());
  });

  mock.useRef.mockImplementation((initial: unknown) => {
    const current = index++;
    if (!(current in mock.refs)) {
      mock.refs[current] = { current: typeof initial === 'function' ? (initial as () => unknown)() : initial };
    }
    return mock.refs[current];
  });

  return mock;
}

function loadWithReactMock<T>(factory: () => T) {
  const react = createReactMock();
  let loaded: T;
  jest.isolateModules(() => {
    jest.doMock('react', () => react);
    loaded = factory();
  });
  return { react, loaded: loaded! };
}

describe('browser hooks', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.useRealTimers();
    delete (global as any).window;
    delete (global as any).navigator;
  });

  it('debounces value updates and clears pending timers', () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { react, loaded } = loadWithReactMock(() => require('../src/useDebounce') as typeof import('../src/useDebounce'));

    expect(loaded.useDebounce('draft')).toBe('draft');
    expect(react.useEffect).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(300);
    expect(react.states[0]).toBe('draft');

    const cleanup = react.effects[0];
    expect(typeof cleanup).toBe('function');
    (cleanup as () => void)();
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });

  it('persists, updates, and removes local storage values', () => {
    const storage = new Map<string, string>([['cart', JSON.stringify({ count: 2 })]]);
    (global as any).window = {
      localStorage: {
        getItem: jest.fn((key: string) => storage.get(key) ?? null),
        setItem: jest.fn((key: string, value: string) => storage.set(key, value)),
        removeItem: jest.fn((key: string) => storage.delete(key)),
      },
    };
    const { react, loaded } = loadWithReactMock(
      () => require('../src/useLocalStorage') as typeof import('../src/useLocalStorage'),
    );

    const [value, setValue, removeValue] = loaded.useLocalStorage('cart', { count: 0 });
    expect(value).toEqual({ count: 2 });

    setValue((previous) => ({ count: previous.count + 1 }));
    expect(JSON.parse(storage.get('cart') ?? '{}')).toEqual({ count: 3 });
    expect(react.states[0]).toEqual({ count: 3 });

    setValue({ count: 5 });
    expect(JSON.parse(storage.get('cart') ?? '{}')).toEqual({ count: 5 });

    removeValue();
    expect(storage.has('cart')).toBe(false);
    expect(react.states[0]).toEqual({ count: 0 });
  });

  it('uses the initial local storage value when the key is empty', () => {
    (global as any).window = {
      localStorage: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
    };
    const { loaded } = loadWithReactMock(
      () => require('../src/useLocalStorage') as typeof import('../src/useLocalStorage'),
    );

    expect(loaded.useLocalStorage('empty', { enabled: true })[0]).toEqual({ enabled: true });
  });

  it('falls back to initial local storage value on server and storage failures', () => {
    const { loaded } = loadWithReactMock(
      () => require('../src/useLocalStorage') as typeof import('../src/useLocalStorage'),
    );
    expect(loaded.useLocalStorage('server', 'fallback')[0]).toBe('fallback');

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (global as any).window = {
      localStorage: {
        getItem: jest.fn(() => {
          throw new Error('read failed');
        }),
        setItem: jest.fn(() => {
          throw new Error('write failed');
        }),
        removeItem: jest.fn(() => {
          throw new Error('remove failed');
        }),
      },
    };
    const failing = loadWithReactMock(
      () => require('../src/useLocalStorage') as typeof import('../src/useLocalStorage'),
    ).loaded;

    const [, setValue, removeValue] = failing.useLocalStorage('broken', 'fallback');
    setValue('next');
    removeValue();
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });

  it('tracks online status and unregisters event listeners', () => {
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    (global as any).navigator = { onLine: false };
    (global as any).window = { addEventListener, removeEventListener };
    const { react, loaded } = loadWithReactMock(
      () => require('../src/useOnlineStatus') as typeof import('../src/useOnlineStatus'),
    );

    expect(loaded.useOnlineStatus()).toBe(false);
    expect(addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));

    const onlineHandler = addEventListener.mock.calls.find(([event]) => event === 'online')?.[1] as () => void;
    const offlineHandler = addEventListener.mock.calls.find(([event]) => event === 'offline')?.[1] as () => void;
    onlineHandler();
    expect(react.states[0]).toBe(true);
    offlineHandler();
    expect(react.states[0]).toBe(false);

    (react.effects[0] as () => void)();
    expect(removeEventListener).toHaveBeenCalledWith('online', onlineHandler);
    expect(removeEventListener).toHaveBeenCalledWith('offline', offlineHandler);
  });

  it('defaults online status to true outside the browser', () => {
    const { loaded } = loadWithReactMock(
      () => require('../src/useOnlineStatus') as typeof import('../src/useOnlineStatus'),
    );

    expect(loaded.useOnlineStatus()).toBe(true);
  });

  it('manages pagination bounds and navigation helpers', () => {
    const { react, loaded } = loadWithReactMock(
      () => require('../src/usePagination') as typeof import('../src/usePagination'),
    );

    expect(loaded.usePagination().limit).toBe(20);
    react.reset();
    const pagination = loaded.usePagination(10);
    pagination.setTotal(35);
    react.reset();
    const updated = loaded.usePagination(10);

    expect(updated.totalPages).toBe(4);
    updated.setPage(9);
    expect(react.states[0]).toBe(4);
    updated.setPage(0);
    expect(react.states[0]).toBe(1);
    updated.nextPage();
    expect(react.states[0]).toBe(2);
    updated.prevPage();
    expect(react.states[0]).toBe(1);
    updated.reset();
    expect(react.states[0]).toBe(1);
  });

  it('resolves programmatic confirmations after a rerender', async () => {
    const { react, loaded } = loadWithReactMock(() => require('../src/useConfirm') as typeof import('../src/useConfirm'));

    const firstRender = loaded.useConfirm();
    const pending = firstRender.confirm({ message: 'Delete order?', variant: 'danger' });
    expect(react.states[0]).toBe(true);
    expect(react.states[1]).toEqual({ message: 'Delete order?', variant: 'danger' });

    react.reset();
    const secondRender = loaded.useConfirm();
    secondRender.resolve(true);

    await expect(pending).resolves.toBe(true);
    expect(react.states[0]).toBe(false);
    expect(react.states[1]).toBeNull();
    expect(react.states[2]).toBeNull();
  });

  it('queues, auto-dismisses, and manually dismisses notifications', () => {
    jest.useFakeTimers();
    jest.spyOn(Date, 'now').mockReturnValue(1716200000000);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    const { react, loaded } = loadWithReactMock(
      () => require('../src/useNotifications') as typeof import('../src/useNotifications'),
    );

    const notifications = loaded.useNotifications();
    const defaultId = notifications.push('Default');
    expect(react.states[0]).toEqual([{ id: defaultId, message: 'Default', variant: 'info', duration: 4000 }]);
    react.states[0] = [];

    const id = notifications.push('Synced', 'success', 2500);

    expect(id).toBe('toast-1716200000000-4fzzz');
    expect(react.states[0]).toEqual([{ id, message: 'Synced', variant: 'success', duration: 2500 }]);

    jest.advanceTimersByTime(2500);
    expect(react.states[0]).toEqual([]);

    const stickyId = notifications.push('Needs review', 'warning', 0);
    expect(react.states[0]).toEqual([{ id: stickyId, message: 'Needs review', variant: 'warning', duration: 0 }]);
    notifications.dismiss(stickyId);
    expect(react.states[0]).toEqual([]);
  });

  it('provides notification convenience helpers and barrel exports', () => {
    jest.useFakeTimers();
    jest.spyOn(Date, 'now').mockReturnValue(1716200000000);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    const { react, loaded } = loadWithReactMock(() => require('../src') as typeof import('../src'));

    expect([
      loaded.useLocalStorage,
      loaded.useDebounce,
      loaded.useOnlineStatus,
      loaded.usePagination,
      loaded.useFormatters,
      loaded.useNotifications,
      loaded.useConfirm,
    ].every((hook) => typeof hook === 'function')).toBe(true);

    const notifications = loaded.useNotifications();
    notifications.success('Saved');
    notifications.error('Failed');
    notifications.warning('Low stock');
    notifications.info('FYI');

    expect(react.states[0]).toEqual([
      expect.objectContaining({ message: 'Saved', variant: 'success' }),
      expect.objectContaining({ message: 'Failed', variant: 'error' }),
      expect.objectContaining({ message: 'Low stock', variant: 'warning' }),
      expect.objectContaining({ message: 'FYI', variant: 'info' }),
    ]);
  });
});
