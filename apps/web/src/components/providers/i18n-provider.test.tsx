/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nProvider } from './i18n-provider';

jest.mock('react-i18next', () => ({
  I18nextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/lib/i18n', () => {
  const mockI18n = {
    isInitialized: false,
    use: jest.fn().mockReturnThis(),
    init: jest.fn().mockResolvedValue({}),
  };
  return {
    __esModule: true,
    default: mockI18n,
    initI18n: jest.fn(),
  };
});

const { initI18n } = jest.requireMock('@/lib/i18n') as {
  initI18n: jest.Mock;
};

describe('I18nProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders children after initI18n resolves', async () => {
    initI18n.mockResolvedValue(undefined);

    render(
      <I18nProvider locale="vi">
        <div data-testid="content">Hello</div>
      </I18nProvider>,
    );

    expect(await screen.findByTestId('content')).toBeInTheDocument();
  });

  it('renders a fallback error UI when initI18n rejects', async () => {
    initI18n.mockRejectedValue(new Error('failed to load translations'));

    render(
      <I18nProvider locale="vi">
        <div data-testid="content">Hello</div>
      </I18nProvider>,
    );

    expect(
      await screen.findByTestId('i18n-error'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });
});
