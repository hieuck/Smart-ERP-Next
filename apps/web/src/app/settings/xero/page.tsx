// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Input, Button, Switch, useToast, Spinner } from '@smart-erp/shared';
import { apiClient } from '@/lib/api-client';

export default function XeroSettingsPage() {
  const { t } = useTranslation('common');
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    xeroTenantId: '',
    syncCustomers: true,
    syncInvoices: true,
    syncPayments: true,
  });

  useEffect(() => {
    apiClient.get('/xero/status').then(res => {
      setConnected(res.data.connected);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const saveConnection = async () => {
    try {
      await apiClient.post('/xero/connect', config);
      toast.success(t('xero.saved'));
      setConnected(true);
    } catch (err) {
      toast.error(t('common.error'));
    }
  };

  const triggerSync = async (type: string) => {
    try {
      await apiClient.post('/xero/sync', { type });
      toast.success(t(`xero.sync${type}Success`));
    } catch (err) {
      toast.error(t('common.error'));
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('xero.title')}</h1>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <span>{t('xero.status')}</span>
            <span className={connected ? 'text-green-600' : 'text-red-600'}>
              {connected ? t('xero.connected') : t('xero.disconnected')}
            </span>
          </div>
          <Input label={t('xero.clientId')} value={config.clientId} onChange={e => setConfig({ ...config, clientId: e.target.value })} />
          <Input label={t('xero.clientSecret')} type="password" value={config.clientSecret} onChange={e => setConfig({ ...config, clientSecret: e.target.value })} />
          <Input label={t('xero.refreshToken')} type="password" value={config.refreshToken} onChange={e => setConfig({ ...config, refreshToken: e.target.value })} />
          <Input label={t('xero.tenantId')} value={config.xeroTenantId} onChange={e => setConfig({ ...config, xeroTenantId: e.target.value })} />
          <div className="flex gap-4">
            <div className="flex items-center gap-2"><Switch checked={config.syncCustomers} onCheckedChange={v => setConfig({ ...config, syncCustomers: v })} /><span>{t('xero.syncCustomers')}</span></div>
            <div className="flex items-center gap-2"><Switch checked={config.syncInvoices} onCheckedChange={v => setConfig({ ...config, syncInvoices: v })} /><span>{t('xero.syncInvoices')}</span></div>
            <div className="flex items-center gap-2"><Switch checked={config.syncPayments} onCheckedChange={v => setConfig({ ...config, syncPayments: v })} /><span>{t('xero.syncPayments')}</span></div>
          </div>
          <Button onClick={saveConnection}>{t('actions.save')}</Button>
        </div>
      </Card>

      {connected && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="secondary" onClick={() => triggerSync('customers')}>{t('xero.syncCustomersNow')}</Button>
          <Button variant="secondary" onClick={() => triggerSync('invoices')}>{t('xero.syncInvoicesNow')}</Button>
          <Button variant="secondary" onClick={() => triggerSync('payments')}>{t('xero.syncPaymentsNow')}</Button>
        </div>
      )}
    </div>
  );
}


