'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { formatVND } from '@smart-erp/shared/utils/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, RefreshCw,
  Wallet, Coins, Activity, CreditCard,
} from 'lucide-react';

interface AccountingDashboardProps {
  period?: string;
}

interface DashboardData {
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  netAssets: number;
  cashBalance: number;
  bankBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  revenueBreakdown: { category: string; amount: number }[];
  expenseBreakdown: { category: string; amount: number }[];
  monthlyCashflow: { month: string; income: number; expense: number }[];
  topExpenses: { accountName: string; amount: number }[];
  revenueTrend: { date: string; amount: number }[];
  recentJournalEntries: {
    id: string;
    voucherNumber: string;
    description: string;
    totalDebit: number;
    totalCredit: number;
    voucherDate: string;
    isPosted: boolean;
  }[];
}

const CURRENCY_COLORS = {
  revenue: '#10b981',
  expense: '#ef4444',
  netIncome: '#3b82f6',
  assets: '#8b5cf6',
  liabilities: '#f59e0b',
  cash: '#06b6d4',
};

const EXPENSE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function AccountingDashboard({ period }: AccountingDashboardProps) {
  const { t } = useTranslation('common');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/accounting/dashboard', {
        params: { period: period || new Date().getFullYear().toString() },
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch accounting dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-3 text-gray-500">{t('common.loading')}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-12 text-gray-500">
        {t('common.noData')}
      </div>
    );
  }

  const profitMargin = data.totalRevenue > 0
    ? ((data.netIncome / data.totalRevenue) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('accounting.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('accounting.chartOfAccounts')}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          disabled={refreshing}
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <StatisticCard
          title={t('accounting.totalRevenue')}
          value={formatVND(data.totalRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          color={CURRENCY_COLORS.revenue}
          trend="+12.5%"
          trendUp
        />
        {/* Expenses */}
        <StatisticCard
          title={t('accounting.totalExpense')}
          value={formatVND(data.totalExpense)}
          icon={<TrendingDown className="w-5 h-5" />}
          color={CURRENCY_COLORS.expense}
          trend="+8.3%"
          trendUp={false}
        />
        {/* Net Income */}
        <StatisticCard
          title={t('accounting.netIncome')}
          value={formatVND(data.netIncome)}
          icon={<Wallet className="w-5 h-5" />}
          color={CURRENCY_COLORS.netIncome}
          trend={`${profitMargin}%`}
          trendUp={parseFloat(profitMargin) >= 0}
        />
        {/* Net Assets */}
        <StatisticCard
          title={t('accounting.equity')}
          value={formatVND(data.netAssets)}
          icon={<Activity className="w-5 h-5" />}
          color={CURRENCY_COLORS.assets}
        />
      </div>

      {/* Cash Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CashCard title={t('accounting.cashBalance')} value={formatVND(data.cashBalance)} icon={<Wallet />} color="#06b6d4" />
        <CashCard title={t('accounting.bankBalance')} value={formatVND(data.bankBalance)} icon={<CreditCard />} color="#3b82f6" />
        <CashCard title={t('accounting.accountsReceivable')} value={formatVND(data.accountsReceivable)} icon={<TrendingUp />} color="#8b5cf6" />
        <CashCard title={t('accounting.accountsPayable')} value={formatVND(data.accountsPayable)} icon={<TrendingDown />} color="#f59e0b" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue vs Expense Area Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            {t('reports.revenue')} vs {t('reports.expense')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.monthlyCashflow}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CURRENCY_COLORS.revenue} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CURRENCY_COLORS.revenue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CURRENCY_COLORS.expense} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CURRENCY_COLORS.expense} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="month" className="text-gray-500" />
              <YAxis className="text-gray-500" tickFormatter={(v) => (v / 1000000).toFixed(0) + 'M'} />
              <Tooltip />
              <Area type="monotone" dataKey="income" stroke={CURRENCY_COLORS.revenue} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="expense" stroke={CURRENCY_COLORS.expense} fill="url(#colorExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Expense Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            {t('accounting.financialReports.incomeStatement')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.expenseBreakdown.map((e, i) => ({
                  ...e,
                  color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
                }))}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.expenseBreakdown.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatVND(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Journal Entries */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {t('accounting.journalEntries')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('accounting.voucherNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('accounting.voucherDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('accounting.description')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('accounting.debit')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('accounting.credit')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('accounting.financialReports.balanceSheet')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {data.recentJournalEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-blue-600">{entry.voucherNumber}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.voucherDate}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {entry.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">
                    {formatVND(entry.totalDebit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400">
                    {formatVND(entry.totalCredit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        entry.isPosted
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}
                    >
                      {entry.isPosted ? t('accounting.posted') : t('accounting.unposted')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatisticCard({
  title,
  value,
  icon,
  color,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}10` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
        )}
      </div>
      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">{title}</h4>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

function CashCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <span style={{ color }}>{icon}</span>
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h4>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}