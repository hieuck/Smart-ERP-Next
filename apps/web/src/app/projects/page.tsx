// @ts-nocheck
'use client';

import { useTranslation } from '@smart-erp/i18n';
import AuthGuard from '@/components/layout/AuthGuard';
import { PageHeader, DataTable, Button, StatCard } from '@smart-erp/shared';

export default function ProjectsPage() {
  const { t } = useTranslation('common');

  const columns = [
    { key: 'code', label: t('projects.code') },
    { key: 'name', label: t('projects.name') },
    { key: 'status', label: t('projects.status') },
    { key: 'priority', label: t('projects.priority') },
    { key: 'startDate', label: t('projects.startDate') },
    { key: 'endDate', label: t('projects.endDate') },
    { key: 'budget', label: t('projects.budget') },
  ];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <PageHeader
          title={t('projects.title')}
          description={t('projects.project')}
          actions={<Button>{t('projects.add')}</Button>}
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title={t('projects.stats')} value="0" label={t('projects.totalTasks')} />
          <StatCard title={t('projects.completedTasks')} value="0" label="" />
          <StatCard title={t('projects.inProgressTasks')} value="0" label="" />
          <StatCard title={t('projects.completionRate')} value="0%" label="" />
        </div>
        <DataTable columns={columns} data={[]} loading={false} emptyMessage={t('common.noData')} />
      </div>
    </AuthGuard>
  );
}
