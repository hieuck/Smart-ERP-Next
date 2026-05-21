// @ts-nocheck
'use client';

import { useTranslation } from '@smart-erp/i18n';
import AuthGuard from '@/components/layout/AuthGuard';
import { PageHeader, DataTable, Button } from '@smart-erp/shared';

export default function LoyaltyCardsPage() {
  const { t } = useTranslation('common');

  const columns = [
    { key: 'customerName', label: t('customers.name') },
    { key: 'points', label: t('loyalty.points') },
    { key: 'tier', label: t('loyalty.tier') },
    { key: 'expiryDate', label: t('inventory.lots.expiryDate') },
  ];

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'purple';
      case 'gold': return 'yellow';
      case 'silver': return 'gray';
      default: return 'blue';
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <PageHeader
          title={t('loyalty.title')}
          description={t('loyalty.card')}
          actions={
            <Button>{t('hr.employee.add')}</Button>
          }
        />
        <DataTable
          columns={columns}
          data={[]}
          loading={false}
          emptyMessage={t('common.noData')}
        />
      </div>
    </AuthGuard>
  );
}
