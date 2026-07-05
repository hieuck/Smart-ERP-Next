'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  AlertTriangle,
  Package,
  DollarSign,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ActivityFeed } from './components/ActivityFeed';
import { AIInsightWidget } from './components/AIInsightWidget';

interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  totalCustomers: number;
  lowStockCount: number;
  revenueChart: { date: string; revenue: number }[];
  recentOrders: {
    id: string;
    code: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
  topProducts: {
    id: string;
    name: string;
    sku: string;
    sold: number;
    revenue: number;
  }[];
}

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-yellow-100 text-yellow-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const emptyStats: DashboardStats = {
  todayRevenue: 0,
  todayOrders: 0,
  totalCustomers: 0,
  lowStockCount: 0,
  revenueChart: [],
  recentOrders: [],
  topProducts: [],
};

export default function DashboardPage() {
  const { t } = useTranslation('common');
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setApiFailed(false);
      try {
        const res = await apiClient.get('/insights/dashboard');
        if (res.data) setStats(res.data);
      } catch {
        setApiFailed(true);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {loading && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-400 animate-pulse">
            {t('dashboard.loading', 'Loading dashboard...')}
          </div>
        )}

        {apiFailed && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
            {t('dashboard.apiFailed', 'Could not load live data.')}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.todayRevenue')}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {formatVND(stats.todayRevenue)}
                </p>
                <p className="mt-1 text-xs text-green-600">{t('dashboard.revenueChange')}</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.todayOrders')}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.todayOrders}</p>
                <p className="mt-1 text-xs text-green-600">{t('dashboard.ordersChange')}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.newCustomers')}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCustomers.toLocaleString('vi-VN')}</p>
                <p className="mt-1 text-xs text-green-600">{t('dashboard.customersChange')}</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.lowStock')}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.lowStockCount}</p>
                <p className="mt-1 text-xs text-red-600">{t('dashboard.lowStockAlert')}</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-100 dark:border-blue-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🧠</span>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('dashboard.cashflowForecast')}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <AIInsightWidget
              title={t('forecast.demand')}
              value="180"
              subtitle={t('inventory.avgDailyDemand')}
              trend="up"
              color="blue"
            />
            <AIInsightWidget
              title={t('inventory.suggestedReorder')}
              value="45"
              subtitle={t('inventory.demandForecast')}
              trend="up"
              color="yellow"
            />
            <AIInsightWidget
              title={t('approvals.pending')}
              value="3"
              subtitle={t('approvals.status.pending')}
              trend="neutral"
              color="green"
            />
          </div>
        </div>

        {/* Revenue chart + Recent orders + Activity feed */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Revenue chart */}
          <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('dashboard.weeklyRevenue')}
              </h2>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>{t('dashboard.revenueWeeklyChange')}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.revenueChart}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                />
                <Tooltip
                  formatter={(value) => [formatVND(Number(value ?? 0)), t('analytics.revenue')]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Activity feed (new) */}
          <div className="xl:col-span-1">
            <ActivityFeed />
          </div>
        </div>

        {/* Top products & Recent orders row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Top products */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              {t('dashboard.topProducts')}
            </h2>
            <div className="space-y-3">
              {stats.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.sku} · {product.sold} {t('dashboard.sold')}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
                    {formatVND(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent orders (keep existing) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('dashboard.recentOrders')}
              </h2>
              <Link href="/orders" className="text-sm text-blue-600 hover:underline">{t('dashboard.viewAll')} →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('dashboard.orderCode')}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('dashboard.customer')}</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('dashboard.total')}</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('dashboard.status')}</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('dashboard.time')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-5 py-3 font-medium text-blue-600">{order.code}</td>
                      <td className="px-5 py-3 text-gray-900 dark:text-white">{order.customerName}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        {formatVND(order.total)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] }`}>
                          {t(`orders.status.${order.status}`, { defaultValue: order.status })}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-400 text-xs">
                        {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}


