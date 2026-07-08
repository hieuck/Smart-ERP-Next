'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { customersApi, type Customer } from '@/lib/api-customers';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { PageHeader } from '@smart-erp/shared';

const groupLabels: Record<string, string> = {
  retail: 'Bán lẻ',
  wholesale: 'Bán sỉ',
  vip: 'VIP',
};

const groupColors: Record<string, string> = {
  retail: 'bg-gray-100 text-gray-700',
  wholesale: 'bg-blue-100 text-blue-700',
  vip: 'bg-yellow-100 text-yellow-700',
};

export default function CustomersPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customersApi.getAll({ page, limit, search: search || undefined });
      setCustomers(res.items);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirmDeleteMessage'))) return;
    try {
      await customersApi.delete(id);
      fetchCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  };

  const formatVND = (amount: string | null) => {
    if (!amount) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
      parseFloat(amount)
    );
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <PageHeader
          title={t('customers.title')}
          description={`${total} ${t('common.customers')}`}
          icon={<Users className="w-5 h-5" />}
          iconColor="purple"
          actions={
            <button
              onClick={() => router.push('/customers/create')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              {t('customers.add')}
            </button>
          }
        />

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('customers.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
            >
              Tìm
            </button>
          </form>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('common.loading')}
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('customers.code')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('customers.name')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('customers.contact')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('customers.group')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('customers.currentDebt')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('customers.totalPurchased')}</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                          Không có khách hàng nào
                        </td>
                      </tr>
                    ) : (
                      customers.map((customer) => (
                        <tr
                          key={customer.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{customer.code}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                            {customer.address && (
                              <div className="text-xs text-gray-400 truncate max-w-xs">{customer.address}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {customer.phone && (
                              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                <Phone className="w-3.5 h-3.5" />
                                <span className="text-xs">{customer.phone}</span>
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center gap-1 text-gray-400">
                                <Mail className="w-3.5 h-3.5" />
                                <span className="text-xs">{customer.email}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {customer.customerGroup && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${groupColors[customer.customerGroup] ?? 'bg-gray-100 text-gray-700'}`}>
                                {groupLabels[customer.customerGroup] ?? customer.customerGroup}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={parseFloat(customer.currentDebt ?? '0') > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                              {formatVND(customer.currentDebt)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">
                            {formatVND(customer.totalPurchased)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => router.push(`/customers/${customer.id}/edit`)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                                title="Sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(customer.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common.showing')} {(page - 1) * limit + 1}–{Math.min(page * limit, total)} {t('common.of')} {total}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}


