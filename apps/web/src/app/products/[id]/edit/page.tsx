'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { productsApi, type Product } from '@/lib/api-products';
import AuthGuard from '@/components/layout/AuthGuard';
import { ProductTranslationsEditor } from '@/components/ProductTranslationsEditor';
import { ProductImageInput } from '@/components/ProductImageInput';
import { ArrowLeft, Save, Package } from 'lucide-react';

const UNITS = [
  { value: 'piece', label: 'Cái' }, { value: 'kg', label: 'Kg' },
  { value: 'gram', label: 'Gram' }, { value: 'liter', label: 'Lít' },
  { value: 'box', label: 'Hộp' }, { value: 'pack', label: 'Gói' },
  { value: 'bottle', label: 'Chai' }, { value: 'bag', label: 'Túi' },
  { value: 'roll', label: 'Cuộn' }, { value: 'meter', label: 'Mét' },
  { value: 'pair', label: 'Đôi' }, { value: 'set', label: 'Bộ' },
];

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';

export default function EditProductPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Partial<Product>>({});

  useEffect(() => {
    productsApi.getById(id)
      .then((product) => setForm(product))
      .catch(() => router.push('/products'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await productsApi.update(id, form);
      router.push('/products');
    } catch (err: any) {
      setError(err.response?.data?.message ?? t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center h-64 text-gray-400">
          <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {t('common.loading')}
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/products')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('products.edit')}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Thông tin cơ bản</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.name')} <span className="text-red-500">*</span>
                </label>
                <input type="text" name="name" value={form.name ?? ''} onChange={handleChange}
                  required className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.sku')}
                </label>
                <input type="text" name="sku" value={form.sku ?? ''} onChange={handleChange}
                  placeholder="Giữ nguyên nếu không đổi" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.category')}
                </label>
                <input type="text" name="category" value={form.category ?? ''} onChange={handleChange}
                  className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.unit')}
                </label>
                <select name="unit" value={form.unit ?? 'piece'} onChange={handleChange} className={inputClass}>
                  {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ảnh sản phẩm
                </label>
                <ProductImageInput
                  value={form.imageUrl ?? ''}
                  disabled={saving}
                  onChange={(imageUrl) => setForm((prev) => ({ ...prev, imageUrl }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.description')}
                </label>
                <textarea name="description" value={form.description ?? ''} onChange={handleChange}
                  rows={3} className={inputClass} />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.translations')}
                </label>
                <ProductTranslationsEditor
                  value={(form as any).translations}
                  onChange={(translations: any) => setForm(prev => ({ ...prev, translations }))}
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Giá & Tồn kho</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.price')} (VND) <span className="text-red-500">*</span>
                </label>
                <input type="number" name="price" value={form.price ?? 0} onChange={handleChange}
                  required min="0" step="1000" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.cost')} (VND)
                </label>
                <input type="number" name="cost" value={form.cost ?? 0} onChange={handleChange}
                  min="0" step="1000" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.stock')}
                </label>
                <input type="number" name="stock" value={form.stock ?? 0} onChange={handleChange}
                  min="0" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.minStock')}
                </label>
                <input type="number" name="minStock" value={form.minStock ?? 0} onChange={handleChange}
                  min="0" className={inputClass} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="isActive" id="isActive" checked={form.isActive ?? true}
                  onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('products.isActive')}
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.push('/products')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              {t('actions.cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? t('common.saving') : t('actions.save')}
            </button>
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}
