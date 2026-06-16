'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';

interface ApprovalRequest {
  id: string;
  documentType: string;
  documentId: string;
  documentAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  createdAt: string;
}

export default function ApprovalsPage() {
  const { t } = useTranslation('common');
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await apiClient.get<{ items: ApprovalRequest[] }>('/approvals');
      setRequests((res.data?.items ?? (res as any).items) as ApprovalRequest[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiClient.post(`/approvals/${id}/approve`, {});
      fetchRequests();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiClient.post(`/approvals/${id}/reject`, {});
      fetchRequests();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-4">{t('common.loading')}</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t('approvals.title')}</h1>
      {requests.length === 0 ? (
        <p className="text-gray-500">{t('common.noData')}</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{req.documentType}</p>
                  <p className="text-sm text-gray-500">ID: {req.documentId}</p>
                  <p className="mt-2">{t('approvals.amount')}: {req.documentAmount.toLocaleString()} VND</p>
                  <p className="text-sm">{t('approvals.requestedBy')}: {req.requestedBy}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-sm ${
                    req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    req.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {t(`approvals.status.${req.status}`)}
                  </span>
                  {req.status === 'pending' && (
                    <div className="mt-2 space-x-2">
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                      >
                        {t('actions.approve')}
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                      >
                        {t('actions.reject')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

