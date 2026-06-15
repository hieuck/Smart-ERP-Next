// @ts-nocheck
'use client';

import { useTranslation } from '@smart-erp/i18n';
import AuthGuard from '@/components/layout/AuthGuard';
import { PageHeader, DataTable, Button } from '@smart-erp/shared';

export default function FixedAssetsPage() {
  const { t } = useTranslation('common');

  const columns = [
    { key: 'code', label: t('fixedAssets.code') },
    { key: 'name', label: t('fixedAssets.name') },
    { key: 'category', label: t('fixedAssets.category') },
    { key: 'purchaseCost', label: t('fixedAssets.purchaseCost') },
    { key: 'accumulatedDepreciation', label: t('fixedAssets.accumulatedDepreciation') },
    { key: 'status', label: t('fixedAssets.status') },
  ];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <PageHeader
          title={t('fixedAssets.title')}
          description={t('fixedAssets.asset')}
          actions={
            <Button>{t('fixedAssets.add')}</Button>
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
