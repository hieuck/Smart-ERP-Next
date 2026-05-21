// @ts-nocheck
'use client';

import { useTranslation } from '@smart-erp/i18n';
import AuthGuard from '@/components/layout/AuthGuard';
import { PageHeader, DataTable, Button } from '@smart-erp/shared';

export default function LoyaltyRewardsPage() {
  const { t } = useTranslation('common');

  const columns = [
    { key: 'name', label: t('products.name') },
    { key: 'pointsRequired', label: t('loyalty.points') },
    { key: 'description', label: t('products.description') },
    { key: 'isActive', label: t('status.active') },
  ];

  return (
    <AuthGuard>
      <div className="space-y-6">
        <PageHeader
          title={t('loyalty.rewards')}
          description={t('loyalty.card')}
          actions={<Button>{t('actions.add')}</Button>}
        />
        <DataTable columns={columns} data={[]} loading={false} emptyMessage={t('common.noData')} />
      </div>
    </AuthGuard>
  );
}
