// @ts-nocheck
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Input, Button, Tabs, Tab, useToast, Select } from '@smart-erp/shared';
import { apiClient } from '@/lib/api-client';

type EcommerceStore = {
  id: string;
  platform: string;
  name: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
};

type EcommerceSyncLog = {
  id: string;
  storeId: string;
  syncType: string;
  status: string;
  itemsProcessed: string;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
};

export default function EcommerceSettingsPage() {
  const { t } = useTranslation('common');
  const toast = useToast();

  const [stores, setStores] = useState<EcommerceStore[]>([]);
  const [logs, setLogs] = useState<EcommerceSyncLog[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('shopee');
  const [creating, setCreating] = useState(false);

  // Form states
  const [newStore, setNewStore] = useState({
    platform: 'shopee',
    name: '',
    configJson: '{}'
  });

  const loadStores = useCallback(async () => {
    setLoadingStores(true);
    try {
      const res = await apiClient.get('/ecommerce/stores');
      setStores(res.data || []);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoadingStores(false);
    }
  }, [t, toast]);

  const loadLogs = useCallback(async (storeId?: string | null) => {
    setLoadingLogs(true);
    try {
      const res = await apiClient.get('/ecommerce/logs', {
        params: storeId ? { storeId } : {},
      });
      setLogs(res.data || []);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoadingLogs(false);
    }
  }, [t, toast]);

  useEffect(() => {
    loadStores();
    loadLogs();
  }, [loadLogs, loadStores]);

  const syncAll = async () => {
    try {
      await apiClient.post('/ecommerce/sync/all');
      toast.success(t('actions.success','Thao tác thành công'));
      await loadStores();
      await loadLogs(selectedStoreId);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const syncStore = async (storeId: string) => {
    try {
      await apiClient.post(`/ecommerce/stores/${storeId}/sync`);
      toast.success(t('actions.success','Thao tác thành công'));
      await loadStores();
      setSelectedStoreId(storeId);
      await loadLogs(storeId);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleCreateStore = async () => {
    if (!newStore.name) {
      toast.error(t('validation.required', { field: t('ecommerce.create.name') }));
      return;
    }

    setCreating(true);
    try {
      // Validate JSON
      JSON.parse(newStore.configJson);

      await apiClient.post('/ecommerce/stores', {
        platform: newStore.platform,
        name: newStore.name,
        configJson: newStore.configJson,
      });

      toast.success(t('actions.success', 'Thao tác thành công'));
      setNewStore({ platform: 'shopee', name: '', configJson: '{}' });
      await loadStores();
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        toast.error(t('ecommerce.create.invalidJson', 'JSON không hợp lệ'));
      } else {
        toast.error(t('common.error'));
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('ecommerce.title')}</h1>
          <p className="text-sm text-gray-500">{t('ecommerce.stores.title')}</p>
        </div>
        <Button onClick={syncAll} disabled={loadingStores}>
          {t('ecommerce.actions.syncAll')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between border-b pb-2 mb-3">
            <h2 className="text-base font-semibold">{t('ecommerce.stores.title')}</h2>
          </div>

          <div className="space-y-2">
            {loadingStores && (
              <div className="text-sm text-gray-400 py-4 text-center">{t('common.loading')}</div>
            )}

            {!loadingStores && stores.length === 0 && (
              <div className="text-sm text-gray-400 py-4 text-center">{t('ecommerce.logs.empty')}</div>
            )}

            {stores.map((s) => (
              <div
                key={s.id}
                className={`border rounded-lg p-3 flex items-start justify-between gap-3 transition ${selectedStoreId === s.id ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'}`}
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{s.name}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span className="uppercase font-bold text-blue-600">{s.platform}</span>
                    <span>·</span>
                    <span className={s.lastSyncStatus === 'success' ? 'text-green-600' : s.lastSyncStatus === 'failed' ? 'text-red-600' : ''}>
                      {s.lastSyncStatus ?? '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedStoreId(s.id); loadLogs(s.id); }}>
                    {t('ecommerce.actions.viewLogs')}
                  </Button>
                  <Button size="sm" onClick={() => syncStore(s.id)}>
                    {t('ecommerce.actions.syncStore')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between border-b pb-2 mb-3">
            <h2 className="text-base font-semibold">{t('ecommerce.logs.title')}</h2>
            {selectedStoreId && (
              <button onClick={() => { setSelectedStoreId(null); loadLogs(null); }} className="text-xs text-blue-600 hover:underline">
                {t('common.viewAll', 'Xem tất cả')}
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {loadingLogs && (
              <div className="text-sm text-gray-400 py-4 text-center">{t('common.loading')}</div>
            )}

            {!loadingLogs && logs.length === 0 && (
              <div className="text-sm text-gray-400 py-4 text-center">{t('ecommerce.logs.empty')}</div>
            )}

            {!loadingLogs && logs.map((l) => (
              <div key={l.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                <div className="flex items-center justify-between gap-2">
                  <div className={`text-xs font-bold uppercase ${l.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {l.status}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    {new Date(l.startedAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-1 flex justify-between">
                  <span>{l.syncType}</span>
                  <span className="font-medium text-gray-900">{l.itemsProcessed}</span>
                </div>
                {l.errorMessage && (
                  <div className="text-[10px] text-red-500 mt-1 bg-red-50 p-1 rounded border border-red-100">
                    {l.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">{t('ecommerce.create.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Select
              label={t('ecommerce.create.platform')}
              value={newStore.platform}
              onChange={(v) => {
                setNewStore({ ...newStore, platform: v });
                setActiveTab(v);
              }}
              options={[
                { value: 'shopee', label: 'Shopee' },
                { value: 'lazada', label: 'Lazada' },
                { value: 'tiktokshop', label: 'TikTok Shop' },
                { value: 'shopify', label: 'Shopify' },
                { value: 'amazon', label: 'Amazon' },
                { value: 'ebay', label: 'eBay' },
                { value: 'woocommerce', label: 'WooCommerce' },
              ]}
            />
            <Input
              label={t('ecommerce.create.name')}
              placeholder="e.g. My Online Store"
              value={newStore.name}
              onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
            />
            <div className="pt-2">
              <Button onClick={handleCreateStore} disabled={creating} className="w-full">
                {creating ? t('common.processing') : t('ecommerce.actions.createStore')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('ecommerce.create.configJson')}
            </label>
            <textarea
              className="w-full h-32 p-3 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={newStore.configJson}
              onChange={(e) => setNewStore({ ...newStore, configJson: e.target.value })}
              placeholder='{"apiKey": "...", "apiSecret": "..."}'
            />
            <p className="text-[10px] text-gray-400 italic">
              * {t('ecommerce.create.configHelp', 'Nhập cấu hình API dưới dạng JSON chuẩn.')}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

