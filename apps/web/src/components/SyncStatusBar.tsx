'use client';

import { useSyncStore, emitSyncEvent } from '@smart-erp/sync-status';
import { useTranslation } from 'react-i18next';
import { Button } from '@smart-erp/shared';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

export function SyncStatusBar() {
  const { t } = useTranslation('common');
  const { status, lastSync, pendingChanges, errorMessage } = useSyncStore();

  const handleManualSync = async () => {
    emitSyncEvent({ type: 'start' });
    try {
      const { syncService } = await import('@/lib/sync-service');
      await syncService.syncAll();
      emitSyncEvent({ type: 'success' });
    } catch (err) {
      emitSyncEvent({ type: 'failure', payload: err instanceof Error ? err.message : 'Sync failed' });
    }
  };

  useEffect(() => {
    const handleOnline = () => emitSyncEvent({ type: 'online' });
    const handleOffline = () => emitSyncEvent({ type: 'offline' });
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const statusIconMap: Record<string, React.ReactNode> = {
    idle: <Wifi className="h-4 w-4 text-green-600" />,
    syncing: <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
    offline: <WifiOff className="h-4 w-4 text-gray-400" />,
  };
  const statusIcon = statusIconMap[status];

  const statusText = t(`sync.status.${status}`, 'Sync status');

  return (
    <div className="flex items-center gap-3 px-4 py-1 text-xs bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-1">
        {statusIcon}
        <span className="text-gray-600 dark:text-gray-300">{statusText}</span>
      </div>
      {lastSync && (
        <span className="text-gray-400">
          {t('sync.lastSync')}: {lastSync.toLocaleTimeString()}
        </span>
      )}
      {pendingChanges > 0 && (
        <span className="text-amber-600 dark:text-amber-400">
          {t('sync.pendingChanges', { count: pendingChanges })}
        </span>
      )}
      {errorMessage && (
        <span className="text-red-500 truncate max-w-md">{errorMessage}</span>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualSync}
        disabled={status === 'syncing'}
        className="ml-auto h-6 px-2 text-xs"
      >
        <RefreshCw className={`h-3 w-3 mr-1 ${status === 'syncing' ? 'animate-spin' : ''}`} />
        {t('sync.syncNow')}
      </Button>
    </div>
  );
}

