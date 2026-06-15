// @ts-nocheck
'use client';

import { useState } from 'react';
import { useTranslation } from '@smart-erp/i18n';
import AuthGuard from '@/components/layout/AuthGuard';
import { PageHeader, DataTable, Button } from '@smart-erp/shared';
import { useToast } from '@/components/providers/ToastProvider';

export default function EmployeesPage() {
  const { t } = useTranslation('common');
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const columns = [
    { key: 'code', label: t('hr.employee.title') + ' Code' },
    { key: 'name', label: t('customers.name') },
    { key: 'email', label: t('customers.email') },
    { key: 'phone', label: t('customers.phone') },
    { key: 'position', label: 'Position' },
    { key: 'salary', label: t('hr.payroll.salary') },
  ];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <PageHeader
          title={t('hr.employee.title')}
          description="Manage your employees"
          actions={
            <Button onClick={() => showToast('info', 'Add employee form coming soon')}>
              {t('hr.employee.add')}
            </Button>
          }
        />
        <DataTable
          columns={columns}
          data={employees}
          loading={loading}
          emptyMessage={t('common.noData')}
        />
      </div>
    </AuthGuard>
  );
}
