// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';
import { Button } from '@smart-erp/shared';
import { CheckCircle, XCircle } from 'lucide-react';

interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  requesterName: string;
  createdAt: string;
}

export function PendingApprovals() {
  const { t } = useTranslation('common');
  const { token } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!token) return;
      try {
        const res = await apiClient.get('/approvals/pending');
        setRequests(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [token]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await apiClient.post(`/approvals/${id}/${action}`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-4 text-center">{t('common.loading')}</div>;
  if (requests.length === 0) return <div className="p-4 text-center text-gray-500">{t('approvals.noPending')}</div>;

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {requests.map((req) => (
        <div key={req.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {t(`entity.${req.entityType}`)} #{req.entityId}
              </p>
              <p className="text-sm text-gray-500">
                {t('approvals.requestedBy')}: {req.requesterName} · {new Date(req.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleAction(req.id, 'approve')}>
                <CheckCircle className="mr-1 h-4 w-4 text-green-600" />
                {t('actions.approve')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAction(req.id, 'reject')}>
                <XCircle className="mr-1 h-4 w-4 text-red-600" />
                {t('actions.reject')}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}