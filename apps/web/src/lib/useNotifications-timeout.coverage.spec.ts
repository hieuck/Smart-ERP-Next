/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from '@smart-erp/hooks';

describe('useNotifications timeout cleanup', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not update state after the hook unmounts', () => {
    const { result, unmount } = renderHook(() => useNotifications());

    act(() => {
      result.current.push('hello', 'info', 5000);
    });
    expect(result.current.toasts).toHaveLength(1);

    unmount();

    // After unmount the timeout should be cleared. If it were not, advancing
    // timers would trigger a state update on an unmounted component and React
    // would warn. We assert no warnings are logged and state is not updated.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.advanceTimersByTime(5000);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('auto-dismisses toasts while still mounted', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.push('hello', 'info', 5000);
    });
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});
