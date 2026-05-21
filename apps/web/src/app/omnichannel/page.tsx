// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiRefreshCw, FiShoppingBag, FiLink, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import AuthGuard from '@/components/layout/AuthGuard';
import { Card, Button, Badge, DataTable, StatCard } from '@smart-erp/ui';

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
    // Mock sync
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
      case 'connected': return <Badge variant="success" icon={<FiCheckCircle />}>{t('omnichannel.connected') || 'Đã kết nối'}</Badge>;
      case 'disconnected': return <Badge variant="outline" icon={<FiLink />}>{t('omnichannel.disconnected') || 'Chưa kết nối'}</Badge>;
      case 'syncing': return <Badge variant="primary" icon={<FiRefreshCw className="animate-spin" />}>{t('omnichannel.syncing') || 'Đang đồng bộ'}</Badge>;
      case 'error': return <Badge variant="danger" icon={<FiAlertCircle />}>{t('omnichannel.error') || 'Lỗi kết nối'}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns = [
    { 
      header: t('omnichannel.platform') || 'Nền tảng', 
      accessor: (row: ChannelStatus) => (
        <div className="flex items-center gap-2 font-semibold" style={{ color: getPlatformColor(row.platform) }}>
          {row.platform.charAt(0).toUpperCase() + row.platform.slice(1)}
        </div>
      ) 
    },
    { header: t('omnichannel.shopName') || 'Tên Shop', accessor: 'shopName' },
    { 
      header: t('omnichannel.status') || 'Trạng thái', 
      accessor: (row: ChannelStatus) => getStatusBadge(row.status)
    },
    { 
      header: t('omnichannel.products') || 'Sản phẩm', 
      accessor: (row: ChannelStatus) => <span className="font-semibold">{row.productCount}</span>
    },
    { 
      header: t('omnichannel.orders') || 'Đơn hàng', 
      accessor: (row: ChannelStatus) => <span className="font-semibold text-blue-600">{row.orderCount}</span>
    },
    { 
      header: t('omnichannel.lastSync') || 'Đồng bộ lần cuối', 
      accessor: (row: ChannelStatus) => row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString('vi-VN') : '-'
    },
    {
      header: t('common.actions') || 'Thao tác',
      accessor: (row: ChannelStatus) => (
        <div className="flex gap-2">
          {row.status === 'disconnected' ? (
            <Button size="sm" variant="primary">{t('omnichannel.connect') || 'Kết nối'}</Button>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              icon={<FiRefreshCw className={row.status === 'syncing' ? 'animate-spin' : ''} />}
              disabled={row.status === 'syncing'}
              onClick={() => handleSync(row.id)}
            >
              {t('omnichannel.syncNow') || 'Đồng bộ'}
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('omnichannel.title') || 'Bán hàng đa kênh (Omnichannel)'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('omnichannel.subtitle') || 'Quản lý tập trung sản phẩm và đơn hàng từ Shopee, Lazada, TikTok Shop.'}
            </p>
          </div>
          <Button icon={<FiLink />} variant="primary">
            {t('omnichannel.addChannel') || 'Thêm kênh mới'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title={t('omnichannel.totalShops') || 'Tổng số Shop'}
            value={channels.length}
            icon={<FiShoppingBag className="w-5 h-5 text-blue-500" />}
          />
          <StatCard
            title={t('omnichannel.activeShops') || 'Đang kết nối'}
            value={channels.filter(c => c.status === 'connected' || c.status === 'syncing').length}
            icon={<FiCheckCircle className="w-5 h-5 text-green-500" />}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title={t('omnichannel.totalProducts') || 'Sản phẩm đồng bộ'}
            value={channels.reduce((sum, c) => sum + c.productCount, 0)}
            icon={<FiRefreshCw className="w-5 h-5 text-purple-500" />}
          />
          <StatCard
            title={t('omnichannel.totalOrders') || 'Đơn hàng đa kênh'}
            value={channels.reduce((sum, c) => sum + c.orderCount, 0)}
            icon={<FiShoppingBag className="w-5 h-5 text-orange-500" />}
          />
        </div>

        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
          <DataTable
            data={channels}
            columns={columns}
            emptyMessage={t('omnichannel.noChannels') || 'Chưa có kênh bán hàng nào.'}
          />
        </Card>
      </div>
    </AuthGuard>
  );
}

