// @ts-nocheck
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { syncService } from '@/lib/sync-service';

interface Conflict {
  id: string;
  entityType: string;
  local: any;
  remote: any;
}

export default function ConflictResolver() {
  const { t } = useTranslation('common');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    const handleConflict = (event: CustomEvent) => {
      setConflicts(prev => [...prev, event.detail]);
    };
    window.addEventListener('sync-conflict', handleConflict as EventListener);
    return () => window.removeEventListener('sync-conflict', handleConflict as EventListener);
  }, []);

  const resolve = async (conflict: Conflict, choice: 'local' | 'remote') => {
    setResolving(true);
    try {
      await syncService.resolveConflict(conflict.id, choice);
      setConflicts(prev => prev.filter(c => c.id !== conflict.id));
    } finally {
      setResolving(false);
    }
  };

  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">{t('sync.conflictTitle')}</h2>
        <div className="space-y-4">
          {conflicts.map(conflict => (
            <div key={conflict.id} className="border rounded p-3">
              <p className="font-medium">{conflict.entityType}: {conflict.id}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => resolve(conflict, 'local')}
                  disabled={resolving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg"
                >
                  {t('sync.useLocal')}
                </button>
                <button
                  onClick={() => resolve(conflict, 'remote')}
                  disabled={resolving}
                  className="flex-1 py-2 border rounded-lg"
                >
                  {t('sync.useRemote')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
