// Desktop Accounting Screen Component
import React, { useEffect, useState, useCallback } from 'react';
import { Card, StatCard } from '@smart-erp/ui';
import { useTranslation } from '@smart-erp/i18n';
import { formatVND } from '@smart-erp/utils';
import {
  DollarSign, TrendingUp, TrendingDown, RefreshCw,
  Wallet, Banknote
} from 'lucide-react';

interface AccountingStats {
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  cashBalance: number;
  bankBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
}

export function AccountingScreen() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<AccountingStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3000/accounting/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'X-Tenant-ID': localStorage.getItem('tenant_id') || '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Accounting dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.accounting')}</h1>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          {t('common.refresh')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('accounting.totalRevenue')}
          value={formatVND(stats?.totalRevenue || 0)}
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
        />
        <StatCard
          title={t('accounting.totalExpense')}
          value={formatVND(stats?.totalExpense || 0)}
          icon={<TrendingDown className="w-6 h-6 text-red-600" />}
          variant="danger"
        />
        <StatCard
          title={t('accounting.netIncome')}
          value={formatVND(stats?.netIncome || 0)}
          icon={<DollarSign className="w-6 h-6 text-blue-600" />}
        />
        <StatCard
          title={t('accounting.cashBalance')}
          value={formatVND(stats?.cashBalance || 0)}
          icon={<Wallet className="w-6 h-6 text-purple-600" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title={t('accounting.accountsReceivable')}>
          <p className="text-2xl font-bold text-gray-900">{formatVND(stats?.accountsReceivable || 0)}</p>
        </Card>
        <Card title={t('accounting.accountsPayable')}>
          <p className="text-2xl font-bold text-gray-900">{formatVND(stats?.accountsPayable || 0)}</p>
        </Card>
      </div>

      <Card title={t('accounting.bankBalance')}>
        <p className="text-2xl font-bold text-gray-900">{formatVND(stats?.bankBalance || 0)}</p>
      </Card>
    </div>
  );
}