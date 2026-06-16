'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { customersApi, type Customer } from '@/lib/api-customers';
import AuthGuard from '@/components/layout/AuthGuard';
import CustomerForm from '@/components/forms/CustomerForm';

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customersApi.getOne(id)
      .then((res) => setCustomer(res.data))
      .catch(() => router.push('/customers'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center h-64 text-gray-400">
          <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Đang tải...
        </div>
      </AuthGuard>
    );
  }

  if (!customer) return null;

  return (
    <AuthGuard>
      <CustomerForm mode="edit" id={id} initial={customer} />
    </AuthGuard>
  );
}
