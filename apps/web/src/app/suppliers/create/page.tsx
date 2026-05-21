// @ts-nocheck
'use client';
import AuthGuard from '@/components/layout/AuthGuard';
import SupplierForm from '@/components/forms/SupplierForm';

export default function CreateSupplierPage() {
  return (
    <AuthGuard>
      <SupplierForm mode="create" />
    </AuthGuard>
  );
}

