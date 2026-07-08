'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { portalApi, type PortalTicket } from '@/lib/api-portal';
import AuthGuard from '@/components/layout/AuthGuard';
import { ArrowLeft, Ticket, Plus, MessageSquare } from 'lucide-react';
import { PageHeader } from '@smart-erp/shared';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export default function PortalTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<PortalTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    portalApi.getTickets()
      .then((data) => setTickets(data ?? []))
      .catch((err) => console.error('Failed to fetch tickets:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const ticket = await portalApi.createTicket({ subject, message });
      setTickets((prev) => [ticket, ...prev]);
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error('Failed to create ticket:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/customer-portal')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <PageHeader
            title="Support Tickets"
            description="View and create support tickets"
            icon={<Ticket className="w-5 h-5" />}
            iconColor="blue"
          />
        </div>

        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Ticket
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What do you need help with?"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue in detail"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !subject.trim() || !message.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition"
          >
            {submitting ? 'Submitting...' : 'Create Ticket'}
          </button>
        </form>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading...
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No tickets yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{ticket.subject}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">{ticket.ticketNumber}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(ticket.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
