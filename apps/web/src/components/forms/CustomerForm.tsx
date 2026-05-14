'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { customersApi, type Customer } from '@/lib/api-customers';
import { ArrowLeft, Save } from 'lucide-react';

interface CustomerFormProps {
  initial?: Partial<Customer>;
  mode: 'create' | 'edit';
  id?: string;
}

const PROVINCES_VN = [
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
  'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
  'Bình Thuận', 'Cà Mau', 'Cần Thơ', 'Cao Bằng', 'Đà Nẵng',
  'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
  'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Nội', 'Hà Tĩnh',
  'Hải Dương', 'Hải Phòng', 'Hậu Giang', 'Hòa Bình', 'Hưng Yên',
  'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lâm Đồng',
  'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An',
  'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình',
  'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng',
  'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
  'Thừa Thiên Huế', 'Tiền Giang', 'TP. Hồ Chí Minh', 'Trà Vinh',
  'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái',
];

export default function CustomerForm({ initial = {}, mode, id }: CustomerFormProps) {
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
    customerGroup: initial.customerGroup ?? 'retail',
    debtLimit: initial.debtLimit ?? '0',
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
        await customersApi.create(form);
      } else {
        await customersApi.update(id!, form);
      }
      router.push('/customers');
    } catch (err: any) {
      setError(err.response?.data?.message ?? t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label, name, type = 'text', required = false, placeholder = '',
    children,
  }: {
    label: string; name: string; type?: string; required?: boolean;
    placeholder?: string; children?: React.ReactNode;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children ?? (
        <input
          type={type}
          name={name}
          value={(form as any)[name]}
          onChange={handleChange}
          required={required}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/customers')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {mode === 'create' ? t('customers.add') : t('customers.edit')}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Basic info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('customers.basicInfo')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('customers.code')} name="code" required placeholder={t('customers.placeholders.code')} />
            <Field label={t('customers.name')} name="name" required placeholder={t('customers.placeholders.name')} />
            <Field label={t('customers.phone')} name="phone" type="tel" placeholder={t('customers.placeholders.phone')} />
            <Field label={t('customers.email')} name="email" type="email" placeholder={t('customers.placeholders.email')} />
            <Field label={t('customers.taxCode')} name="taxCode" placeholder={t('customers.placeholders.taxCode')} />
            <Field label={t('customers.contactPerson')} name="contactPerson" placeholder={t('customers.placeholders.contactPerson')} />
          </div>
        </div>

        {/* Address */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('customers.addressSection')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label={t('customers.address')} name="address" placeholder={t('customers.placeholders.address')} />
            </div>
            <Field label={t('customers.ward')} name="ward" placeholder={t('customers.placeholders.ward')} />
            <Field label={t('customers.district')} name="district" placeholder={t('customers.placeholders.district')} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('customers.province')}
              </label>
              <select
                name="province"
                value={form.province}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{t('customers.placeholders.province')}</option>
                {PROVINCES_VN.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Business settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('customers.businessSection')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('customers.group')}
              </label>
              <select
                name="customerGroup"
                value={form.customerGroup}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="retail">{t('customers.groups.retail')}</option>
                <option value="wholesale">{t('customers.groups.wholesale')}</option>
                <option value="vip">{t('customers.groups.vip')}</option>
              </select>
            </div>
            <Field label={`${t('customers.debtLimit')} (VND)`} name="debtLimit" type="number" placeholder="0" />
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('customers.notes')}
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder={t('customers.placeholders.notes')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
              <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                {t('customers.active')}
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/customers')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            {t('actions.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? t('common.processing') : t('actions.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
