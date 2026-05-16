'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@smart-erp/i18n';
import { apiClient } from '@/lib/api-client';
import { Button, Input, Select, Table, DatePicker } from '@smart-erp/shared';
import { Download } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';

interface ActivityLog {
  id: string;
  createdAt: string;
  user: { name: string; email: string };
  action: string;
  entityType: string;
  entityId: string;
  details: any;
}

export default function ActivityLogsPage() {
  const { t } = useTranslation('common');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    fromDate: '',
    toDate: '',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/activity', {
        params: { page, limit: 20, ...filters },
      });
      setLogs(res.data.items);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error('Failed to fetch activity logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const exportCSV = () => {
    const headers = [t('activityLogs.timestamp'), t('activityLogs.user'), t('activityLogs.action'), t('activityLogs.entityType'), t('activityLogs.entityId'), t('activityLogs.details')];
    const rows = logs.map(log => [
      new Date(log.createdAt).toLocaleString(),
      log.user?.name || log.user?.email,
      t(`actions.${log.action}`),
      t(`entities.${log.entityType}`),
      log.entityId,
      JSON.stringify(log.details),
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthGuard>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{t('activityLogs.title')}</h1>
          <Button onClick={exportCSV}><Download className="mr-2 h-4 w-4" /> {t('common.export')}</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Select
            placeholder={t('activityLogs.entityType')}
            options={[
              { value: 'order', label: t('entities.order') },
              { value: 'product', label: t('entities.product') },
              { value: 'customer', label: t('entities.customer') },
              { value: 'supplier', label: t('entities.supplier') },
              { value: 'inventory', label: t('entities.inventory') },
            ]}
            value={filters.entityType}
            onChange={(val) => setFilters({ ...filters, entityType: val })}
          />
          <Select
            placeholder={t('activityLogs.action')}
            options={[
              { value: 'created', label: t('actions.created') },
              { value: 'updated', label: t('actions.updated') },
              { value: 'deleted', label: t('actions.deleted') },
              { value: 'approved', label: t('actions.approved') },
              { value: 'rejected', label: t('actions.rejected') },
              { value: 'stock_adjusted', label: t('actions.stockAdjusted') },
            ]}
            value={filters.action}
            onChange={(val) => setFilters({ ...filters, action: val })}
          />
          <DatePicker
            placeholder={t('common.fromDate')}
            value={filters.fromDate}
            onChange={(val) => setFilters({ ...filters, fromDate: val })}
          />
          <DatePicker
            placeholder={t('common.toDate')}
            value={filters.toDate}
            onChange={(val) => setFilters({ ...filters, toDate: val })}
          />
        </div>

        {loading ? (
          <div className="text-center py-8">{t('common.loading')}</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('activityLogs.timestamp')}</TableHead>
                  <TableHead>{t('activityLogs.user')}</TableHead>
                  <TableHead>{t('activityLogs.action')}</TableHead>
                  <TableHead>{t('activityLogs.entityType')}</TableHead>
                  <TableHead>{t('activityLogs.entityId')}</TableHead>
                  <TableHead>{t('activityLogs.details')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{log.user?.name || log.user?.email}</TableCell>
                    <TableCell>{t(`actions.${log.action}`)}</TableCell>
                    <TableCell>{t(`entities.${log.entityType}`)}</TableCell>
                    <TableCell>{log.entityId}</TableCell>
                    <TableCell>{JSON.stringify(log.details)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between items-center mt-4">
              <Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t('common.previous')}</Button>
              <span>{t('common.page')} {page} / {totalPages}</span>
              <Button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
            </div>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
