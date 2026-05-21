// @ts-nocheck
'use client';

import { useTranslation } from '@smart-erp/i18n';
import AuthGuard from '@/components/layout/AuthGuard';
import { PageHeader, DataTable, Button, StatCard } from '@smart-erp/shared';

export default function TicketsPage() {
  const { t } = useTranslation('common');

  const columns = [
    { key: 'ticketNumber', label: t('helpdesk.ticketNumber') },
    { key: 'title', label: t('orders.code') },
    { key: 'status', label: t('helpdesk.status') },
    { key: 'priority', label: t('helpdesk.priority') },
    { key: 'category', label: t('helpdesk.category') },
    { key: 'assignee', label: t('helpdesk.assignee') },
    { key: 'createdAt', label: t('orders.createdAt') },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'blue';
      case 'in_progress': return 'yellow';
      case 'resolved': return 'green';
      case 'closed': return 'gray';
      case 'reopened': return 'red';
      default: return 'gray';
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <PageHeader
          title={t('helpdesk.title')}
          description={t('helpdesk.tickets')}
          actions={<Button>{t('helpdesk.createTicket')}</Button>}
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title={t('helpdesk.totalTickets')} value="0" label="" />
          <StatCard title={t('helpdesk.openTickets')} value="0" label="" />
          <StatCard title={t('helpdesk.urgentTickets')} value="0" label="" />
          <StatCard title={t('helpdesk.unassigned')} value="0" label="" />
        </div>
        <DataTable columns={columns} data={[]} loading={false} emptyMessage={t('common.noData')} />
      </div>
    </AuthGuard>
  );
}
