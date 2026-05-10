'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import { useToast } from '@/components/providers/ToastProvider';
import {
  CreditCard, Plus, ArrowDownCircle, ArrowUpCircle,
  ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';

interface Payment {
  id: string;
  code: string;
  type: 'receipt' | 'payment';
  partyName: string | null;
  amount: string;
  method: string;
  status: string;
  notes: string | null;
  paidAt: string;
  createdAt: string;
}

interface Summary {
  receipt: number;
  payment: number;
  balance: number;
  receiptCount: number;
  paymentCount: number;
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', card: 'Thẻ',
  momo: 'MoMo', vnpay: 'VNPay', zalopay: 'ZaloPay', credit: 'Công nợ',
};

const formatVND = (v: string | number | null | undefined) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    typeof v === 'string' ? parseFloat(v) : (v ?? 0)
  );

export default function PaymentsPage() {
  const { t } = useTranslation('common');
  const { success, error: showError } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<'receipt' | 'payment'>('receipt');
  const [form, setForm] = useState({
    partyName: '', amount: '', method: 'cash', notes: '',
    referenceType: '', partyType: 'customer',
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, summaryRes] = await Promise.allSettled([
        apiClient.get('/payments', { params: { page, limit, type: typeFilter || undefined } }),
        apiClient.get('/payments/summary'),
      ]);
      if (paymentsRes.status === 'fulfilled') {
        setPayments(paymentsRes.value.data.items);
        setTotalPages(paymentsRes.value.data.totalPages);
        setTotal(paymentsRes.value.data.total);
      }
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, typeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/payments', {
        type: createType,
        partyName: form.partyName || undefined,
        partyType: form.partyType || undefined,
        amount: parseFloat(form.amount),
        method: form.method,
        notes: form.notes || undefined,
      });
      success(createType === 'receipt' ? 'Đã tạo phiếu thu' : 'Đã tạo phiếu chi');
      setShowCreate(false);
      setForm({ partyName: '', amount: '', method: 'cash', notes: '', referenceType: '', partyType: 'customer' });
      fetchData();
    } catch (err: any) {
      showError(err.response?.data?.message ?? 'Tạo phiếu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const TYPE_FILTERS = [
    { value: '', label: 'Tất cả' },
    { value: 'receipt', label: 'Phiếu thu' },
    { value: 'payment', label: 'Phiếu chi' },
  ];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Thu chi</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{total} phiếu</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setCreateType('receipt'); setShowCreate(true); }}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
            >
              <ArrowDownCircle className="w-4 h-4" />
              Phiếu thu
            </button>
            <button
              onClick={() => { setCreateType('payment'); setShowCreate(true); }}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
            >
              <ArrowUpCircle className="w-4 h-4" />
              Phiếu chi
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownCircle className="w-4 h-4 text-green-600" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Tổng thu</p>
              </div>
              <p className="text-xl font-bold text-green-600">{formatVND(summary.receipt)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{summary.receiptCount} phiếu</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpCircle className="w-4 h-4 text-red-600" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Tổng chi</p>
              </div>
              <p className="text-xl font-bold text-red-600">{formatVND(summary.payment)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{summary.paymentCount} phiếu</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Số dư</p>
              <p className={`text-xl font-bold ${summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatVND(summary.balance)}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-400" />
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setTypeFilter(f.value); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                typeFilter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Đang tải...
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã phiếu</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Loại</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Đối tượng</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Số tiền</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phương thức</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ghi chú</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {payments.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Không có phiếu nào</td></tr>
                    ) : payments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-sm">
                          <span className={p.type === 'receipt' ? 'text-green-600' : 'text-red-600'}>{p.code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.type === 'receipt' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {p.type === 'receipt' ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                            {p.type === 'receipt' ? 'Thu' : 'Chi'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{p.partyName ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-bold">
                          <span className={p.type === 'receipt' ? 'text-green-600' : 'text-red-600'}>
                            {p.type === 'payment' ? '-' : '+'}{formatVND(p.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{METHOD_LABELS[p.method] ?? p.method}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-xs">{p.notes ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-xs text-gray-400">
                          {new Date(p.paidAt).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{total} phiếu</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {createType === 'receipt' ? 'Tạo phiếu thu' : 'Tạo phiếu chi'}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Đối tượng
                </label>
                <input
                  type="text"
                  value={form.partyName}
                  onChange={(e) => setForm((f) => ({ ...f, partyName: e.target.value }))}
                  placeholder="Tên khách hàng / nhà cung cấp..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Số tiền (VND) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                  min="1"
                  step="1000"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phương thức
                </label>
                <select
                  value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {Object.entries(METHOD_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ghi chú</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm">
                  Hủy
                </button>
                <button type="submit" disabled={saving}
                  className={`flex-1 py-2.5 text-white font-bold rounded-xl transition text-sm disabled:opacity-50 ${
                    createType === 'receipt' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}>
                  {saving ? 'Đang lưu...' : 'Tạo phiếu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
