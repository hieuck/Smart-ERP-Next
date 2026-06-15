// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, ShoppingBag, Link, CheckCircle, AlertCircle, Store } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import { DataTable, Button, PageHeader } from '@smart-erp/shared';

interface ChannelStatus {
  id: string;
  platform: 'shopee' | 'lazada' | 'tiktok';
  shopName: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSyncAt: string | null;
  productCount: number;
  orderCount: number;
}

export default function OmnichannelPage() {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<ChannelStatus[]>([
    {
      id: 'shp-1',
      platform: 'shopee',
      shopName: 'Smart Store Official',
      status: 'connected',
      lastSyncAt: new Date(Date.now() - 3600000).toISOString(),
      productCount: 1250,
      orderCount: 345,
    },
    {
      id: 'lzd-1',
      platform: 'lazada',
      shopName: 'Smart Store Mall',
      status: 'connected',
      lastSyncAt: new Date(Date.now() - 7200000).toISOString(),
      productCount: 890,
      orderCount: 120,
    },
    {
      id: 'tt-1',
      platform: 'tiktok',
      shopName: 'Smart Store Shop',
      status: 'disconnected',
      lastSyncAt: null,
      productCount: 0,
      orderCount: 0,
    }
  ]);

  const handleSync = (id: string) => {
    setChannels(prev => prev.map(c => 
      c.id === id ? { ...c, status: 'syncing' } : c
    ));
    setTimeout(() => {
      setChannels(prev => prev.map(c => 
        c.id === id ? { ...c, status: 'connected', lastSyncAt: new Date().toISOString() } : c
      ));
    }, 2000);
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'shopee': return '#ee4d2d';
      case 'lazada': return '#0f146d';
      case 'tiktok': return '#000000';
      default: return '#6b7280';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="w-3.5 h-3.5" />
          {t('omnichannel.connected') || 'Đã kết nối'}
        </span>
      );
      case 'disconnected': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300">
          <Link className="w-3.5 h-3.5" />
          {t('omnichannel.disconnected') || 'Chưa kết nối'}
        </span>
      );
      case 'syncing': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          {t('omnichannel.syncing') || 'Đang đồng bộ'}
        </span>
      );
      case 'error': return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <AlertCircle className="w-3.5 h-3.5" />
          {t('omnichannel.error') || 'Lỗi kết nối'}
        </span>
      );
      default: return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
          {status}
        </span>
      );
    }
  };

  const columns = [
    {
      key: 'platform',
      label: t('omnichannel.platform') || 'Nền tảng',
      render: (row: ChannelStatus) => (
        <div className="flex items-center gap-2 font-semibold" style={{ color: getPlatformColor(row.platform) }}>
          {row.platform.charAt(0).toUpperCase() + row.platform.slice(1)}
        </div>
      )
    },
    { key: 'shopName', label: t('omnichannel.shopName') || 'Tên Shop' },
    {
      key: 'status',
      label: t('omnichannel.status') || 'Trạng thái',
      render: (row: ChannelStatus) => getStatusBadge(row.status)
    },
    {
      key: 'products',
      label: t('omnichannel.products') || 'Sản phẩm',
      render: (row: ChannelStatus) => <span className="font-semibold">{row.productCount}</span>
    },
    {
      key: 'orders',
      label: t('omnichannel.orders') || 'Đơn hàng',
      render: (row: ChannelStatus) => <span className="font-semibold text-blue-600">{row.orderCount}</span>
    },
    {
      key: 'lastSync',
      label: t('omnichannel.lastSync') || 'Đồng bộ lần cuối',
      render: (row: ChannelStatus) => row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString('vi-VN') : '-'
    },
    {
      key: 'actions',
      label: t('common.actions') || 'Thao tác',
      render: (row: ChannelStatus) => (
        <div className="flex gap-2">
          {row.status === 'disconnected' ? (
            <Button size="sm" variant="primary">{t('omnichannel.connect') || 'Kết nối'}</Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={row.status === 'syncing'}
              onClick={() => handleSync(row.id)}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${row.status === 'syncing' ? 'animate-spin' : ''}`} />
              {t('omnichannel.syncNow') || 'Đồng bộ'}
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <PageHeader
          title={t('omnichannel.title')}
          description={t('omnichannel.subtitle')}
          icon={<Store className="w-5 h-5" />}
          iconColor="indigo"
          actions={
            <Button variant="primary">
              <Link className="w-4 h-4 mr-1.5" />
              {t('omnichannel.addChannel')}
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: t('omnichannel.totalShops'), value: channels.length, icon: ShoppingBag, color: 'text-blue-500 bg-blue-100' },
            { label: t('omnichannel.activeShops'), value: channels.filter(c => c.status === 'connected' || c.status === 'syncing').length, icon: CheckCircle, color: 'text-green-500 bg-green-100' },
            { label: t('omnichannel.totalProducts'), value: channels.reduce((sum, c) => sum + c.productCount, 0), icon: RefreshCw, color: 'text-purple-500 bg-purple-100' },
            { label: t('omnichannel.totalOrders'), value: channels.reduce((sum, c) => sum + c.orderCount, 0), icon: ShoppingBag, color: 'text-orange-500 bg-orange-100' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                  <div className={`p-2 rounded-lg ${s.color.split(' ')[1]}`}>
                    <Icon className={`w-4 h-4 ${s.color.split(' ')[0]}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm border-gray-200 dark:border-gray-800">
          <DataTable
            data={channels}
            columns={columns}
            emptyMessage={t('omnichannel.noChannels') || 'Chưa có kênh bán hàng nào.'}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
