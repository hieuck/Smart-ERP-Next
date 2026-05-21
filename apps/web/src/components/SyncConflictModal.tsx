// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';

interface Conflict {
  id: string;
  entityType: string;
  entityId: string;
  local: any;
  remote: any;
}

export function SyncConflictModal() {
  const { t } = useTranslation('common');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    const handleConflict = (event: CustomEvent<Conflict>) => {
      setConflicts(prev => [...prev, event.detail]);
    };
    window.addEventListener('sync-conflict', handleConflict as EventListener);
    return () => window.removeEventListener('sync-conflict', handleConflict as EventListener);
  }, []);

  const resolveConflict = async (conflict: Conflict, choice: 'local' | 'remote') => {
    setResolving(true);
    try {
      const chosen = choice === 'local' ? conflict.local : conflict.remote;
      await apiClient.post('/sync/resolve', {
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        chosenVersion: chosen,
      });
      setConflicts(prev => prev.filter(c => c.id !== conflict.id));
    } catch (err) {
      console.error('Failed to resolve conflict', err);
    } finally {
      setResolving(false);
    }
  };

  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {t('sync.conflictTitle')}
        </h2>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {conflicts.map(conflict => (
            <div key={conflict.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                {conflict.entityType}: {conflict.entityId}
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                <div>
                  <p className="text-gray-500">{t('sync.localVersion')}</p>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded">
                    {JSON.stringify(conflict.local, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-gray-500">{t('sync.remoteVersion')}</p>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded">
                    {JSON.stringify(conflict.remote, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => resolveConflict(conflict, 'local')}
                  disabled={resolving}
                  className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  {t('sync.keepLocal')}
                </button>
                <button
                  onClick={() => resolveConflict(conflict, 'remote')}
                  disabled={resolving}
                  className="flex-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                >
                  {t('sync.keepRemote')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
