'use client';
import AuthGuard from '@/components/layout/AuthGuard';
import CustomerForm from '@/components/forms/CustomerForm';

export default function CreateCustomerPage() {
  return (
    <AuthGuard>
      <CustomerForm mode="create" />
    </AuthGuard>
  );
}


