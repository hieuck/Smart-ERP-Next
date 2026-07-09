'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { buildCsvRow } from '@/lib/csv-escape';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  BarChart3,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Download,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'custom';

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'week', label: 'Tuần này' },
  { key: 'month', label: 'Tháng này' },
  { key: 'quarter', label: 'Quý này' },
];

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const formatShort = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
};

function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;
  switch (range) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      from = new Date(now.getTime() - 6 * 86_400_000);
      break;
    case 'quarter':
      from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case 'month':
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { from: from.toISOString(), to };
}

export default function ReportsPage() {
  const { t } = useTranslation('common');
  const [range, setRange] = useState<DateRange>('month');
  const [summary, setSummary] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'revenue' | 'profit' | 'inventory' | 'products'>('revenue');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { from, to } = getDateRange(range);
    const params = { from, to };

    try {
      const [summaryRes, revenueRes, profitRes, topRes, invRes] = await Promise.allSettled([
        apiClient.get('/reports/summary', { params }),
        apiClient.get('/reports/revenue', { params: { ...params, groupBy: range === 'today' ? 'day' : 'day' } }),
        apiClient.get('/reports/profit', { params }),
        apiClient.get('/reports/top-products', { params: { ...params, limit: '10' } }),
        apiClient.get('/reports/inventory'),
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
      if (revenueRes.status === 'fulfilled') setRevenueData(revenueRes.value.data);
      if (profitRes.status === 'fulfilled') setProfitData(profitRes.value.data);
      if (topRes.status === 'fulfilled') setTopProducts(topRes.value.data);
      if (invRes.status === 'fulfilled') setInventory(invRes.value.data);
    } catch (err) {
      console.error('Reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = () => {
    const rows = [['Sản phẩm', 'SKU', 'Đã bán', 'Doanh thu', 'Lợi nhuận']];
    topProducts.forEach((p) =>
      rows.push([p.name, p.sku, p.sold, formatVND(p.revenue), formatVND(p.profit)])
    );
    const csv = rows.map(buildCsvRow).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const TABS = [
    { key: 'revenue' as const, label: 'Doanh thu', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'profit' as const, label: 'Lợi nhuận', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'products' as const, label: 'Sản phẩm', icon: <Package className="w-4 h-4" /> },
    { key: 'inventory' as const, label: 'Tồn kho', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('reports.title')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Phân tích kinh doanh</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <Download className="w-4 h-4" />
              Xuất CSV
            </button>
          </div>
        </div>

        {/* Date range selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-gray-400" />
          {DATE_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                range === r.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Đơn hàng', value: summary.orderCount, color: 'blue', icon: <BarChart3 className="w-5 h-5" /> },
              { label: 'Doanh thu', value: formatVND(summary.revenue), color: 'green', icon: <TrendingUp className="w-5 h-5" /> },
              { label: 'Đã thu', value: formatVND(summary.collected), color: 'purple', icon: <DollarSign className="w-5 h-5" /> },
              { label: 'Còn nợ', value: formatVND(summary.outstandingDebt), color: 'red', icon: <Users className="w-5 h-5" /> },
            ].map((card) => (
              <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${card.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : card.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : card.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('common.loading', 'Loading...')}
          </div>
        ) : (
          <>
            {/* Revenue tab */}
            {activeTab === 'revenue' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                  Biểu đồ doanh thu
                </h2>
                {revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="period" tickFormatter={(v) => new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [formatVND(Number(v ?? 0)), 'Doanh thu']} labelFormatter={(l) => new Date(l).toLocaleDateString('vi-VN')} />
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" name="Doanh thu" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                    Chưa có dữ liệu doanh thu
                  </div>
                )}
              </div>
            )}

            {/* Profit tab */}
            {activeTab === 'profit' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                  Doanh thu & Lợi nhuận
                </h2>
                {profitData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={profitData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="period" tickFormatter={(v) => new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, name) => [formatVND(Number(v ?? 0)), name === 'revenue' ? 'Doanh thu' : name === 'cost' ? 'Giá vốn' : 'Lợi nhuận']} />
                      <Legend formatter={(v) => v === 'revenue' ? 'Doanh thu' : v === 'cost' ? 'Giá vốn' : 'Lợi nhuận'} />
                      <Bar dataKey="revenue" fill="#3b82f6" name="revenue" />
                      <Bar dataKey="cost" fill="#f59e0b" name="cost" />
                      <Bar dataKey="profit" fill="#10b981" name="profit" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                    Chưa có dữ liệu lợi nhuận
                  </div>
                )}
              </div>
            )}

            {/* Top products tab */}
            {activeTab === 'products' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Top sản phẩm bán chạy</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Đã bán</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Doanh thu</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Lợi nhuận</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {topProducts.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Chưa có dữ liệu</td></tr>
                      ) : topProducts.map((p, i) => (
                        <tr key={p.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-gray-400 font-mono">{i + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{p.sold}</td>
                          <td className="px-4 py-3 text-right font-medium text-blue-600">{formatVND(p.revenue)}</td>
                          <td className="px-4 py-3 text-right font-medium text-green-600">{formatVND(p.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Inventory tab */}
            {activeTab === 'inventory' && inventory && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Tổng sản phẩm', value: inventory.totalProducts },
                    { label: 'Giá trị tồn kho', value: formatVND(inventory.totalStockValue) },
                    { label: t('inventory.lowStock'), value: inventory.lowStockCount, danger: inventory.lowStockCount > 0 },
                    { label: 'Hết hàng', value: inventory.outOfStockCount, danger: inventory.outOfStockCount > 0 },
                  ].map((card) => (
                    <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                      <p className={`mt-1 text-xl font-bold ${card.danger ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                        {card.value}
                      </p>
                    </div>
                  ))}
                </div>
                {inventory.lowStockItems?.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Sản phẩm sắp hết hàng</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tồn kho</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tối thiểu</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ĐVT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {inventory.lowStockItems.map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                                <p className="text-xs text-gray-400">{p.sku}</p>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-red-600">{p.stock}</td>
                              <td className="px-4 py-3 text-right text-gray-500">{p.minStock ?? 0}</td>
                              <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}


