'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Save } from 'lucide-react';

interface SupplierFormProps {
  initial?: Record<string, any>;
  mode: 'create' | 'edit';
  id?: string;
}

export default function SupplierForm({ initial = {}, mode, id }: SupplierFormProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    code: initial.code ?? '',
    name: initial.name ?? '',
    phone: initial.phone ?? '',
    email: initial.email ?? '',
    address: initial.address ?? '',
    ward: initial.ward ?? '',
    district: initial.district ?? '',
    province: initial.province ?? '',
    taxCode: initial.taxCode ?? '',
    contactPerson: initial.contactPerson ?? '',
    bankAccount: initial.bankAccount ?? '',
    bankName: initial.bankName ?? '',
    notes: initial.notes ?? '',
    isActive: initial.isActive ?? true,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (mode === 'create') {
        await apiClient.post('/suppliers', form);
      } else {
        await apiClient.patch(`/suppliers/${id}`, form);
      }
      router.push('/suppliers');
    } catch (err: any) {
      setError(err.response?.data?.message ?? t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';

  const Field = ({ label, name, type = 'text', placeholder = '', required = false }: {
    label: string; name: string; type?: string; placeholder?: string; required?: boolean;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={(form as any)[name]}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/suppliers')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {mode === 'create' ? t('suppliers.add') : 'Sửa nhà cung cấp'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('suppliers.basicInfo')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('suppliers.code')} name="code" required placeholder={t('suppliers.placeholders.code')} />
            <Field label={t('suppliers.name')} name="name" required placeholder={t('suppliers.placeholders.name')} />
            <Field label={t('suppliers.phone')} name="phone" type="tel" placeholder={t('suppliers.placeholders.phone')} />
            <Field label={t('suppliers.email')} name="email" type="email" placeholder={t('suppliers.placeholders.email')} />
            <Field label={t('suppliers.taxCode')} name="taxCode" placeholder={t('suppliers.placeholders.taxCode')} />
            <Field label={t('suppliers.contactPerson')} name="contactPerson" placeholder={t('suppliers.placeholders.contactPerson')} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('suppliers.addressTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label={t('suppliers.address')} name="address" placeholder={t('suppliers.placeholders.address')} />
            </div>
            <Field label={t('suppliers.ward')} name="ward" placeholder={t('suppliers.placeholders.ward')} />
            <Field label={t('suppliers.district')} name="district" placeholder={t('suppliers.placeholders.district')} />
            <Field label={t('suppliers.province')} name="province" placeholder={t('suppliers.placeholders.province')} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('suppliers.bankInfo')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('suppliers.bankAccount')} name="bankAccount" placeholder={t('suppliers.placeholders.bankAccount')} />
            <Field label={t('suppliers.bankName')} name="bankName" placeholder={t('suppliers.placeholders.bankName')} />
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('suppliers.notes')}</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                className={inputClass}
                placeholder={t('suppliers.placeholders.notes')}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isActive"
                id="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">{t('suppliers.active')}</label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.push('/suppliers')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            {t('actions.cancel')}
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : t('actions.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

