/** @jest-environment jsdom */

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useParams: () => ({}),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/layout/AuthGuard', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/lib/api-portal', () => ({
  portalApi: {
    getTickets: jest.fn().mockResolvedValue([]),
    createTicket: jest.fn().mockResolvedValue({
      id: 'ticket-1',
      ticketNumber: 'TK-001',
      subject: 'Test ticket',
      status: 'open',
      createdAt: new Date().toISOString(),
    }),
    getInvoices: jest.fn().mockResolvedValue([]),
  },
}));

import { render, screen } from '@testing-library/react';
import PortalTicketsPage from './tickets/page';
import PortalInvoicesPage from './invoices/page';

describe('customer portal pages', () => {
  it('renders tickets page', async () => {
    render(<PortalTicketsPage />);
    expect(await screen.findByText('Support Tickets')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create Ticket' })).toBeTruthy();
  });

  it('renders invoices page', async () => {
    render(<PortalInvoicesPage />);
    expect(await screen.findByText('Invoices')).toBeTruthy();
    expect(await screen.findByText('No invoices found')).toBeTruthy();
  });
});
