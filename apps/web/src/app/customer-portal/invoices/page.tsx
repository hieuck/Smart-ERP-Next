'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { portalApi, type PortalInvoice } from '@/lib/api-portal';
import AuthGuard from '@/components/layout/AuthGuard';
import { ArrowLeft, FileText, Receipt } from 'lucide-react';
import { PageHeader } from '@smart-erp/shared';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  issued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const formatVND = (v: string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(v ?? '0'));

export default function PortalInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.getInvoices()
      .then((data) => setInvoices(data ?? []))
      .catch((err) => console.error('Failed to fetch invoices:', err))
      .finally(() => setLoading(false));
  }, []);

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
            title="Invoices"
            description="View your e-invoices"
            icon={<FileText className="w-5 h-5" />}
            iconColor="green"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading...
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Receipt className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No invoices found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(invoice.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatVND(invoice.total)}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[invoice.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
