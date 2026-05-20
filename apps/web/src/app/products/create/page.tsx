// @ts-nocheck
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { productsApi } from '@/lib/api-products';
import AuthGuard from '@/components/layout/AuthGuard';
import { ArrowLeft, Save, Package } from 'lucide-react';

const UNITS = [
  { value: 'piece', label: 'Cái' },
  { value: 'kg', label: 'Kg' },
  { value: 'gram', label: 'Gram' },
  { value: 'liter', label: 'Lít' },
  { value: 'box', label: 'Hộp' },
  { value: 'pack', label: 'Gói' },
  { value: 'bottle', label: 'Chai' },
  { value: 'bag', label: 'Túi' },
  { value: 'roll', label: 'Cuộn' },
  { value: 'meter', label: 'Mét' },
  { value: 'pair', label: 'Đôi' },
  { value: 'set', label: 'Bộ' },
];

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';

export default function CreateProductPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    imageUrl: '',
    category: '',
    unit: 'piece',
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 0,
    isActive: true,
  });

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
      await productsApi.create(form);
      router.push('/products');
    } catch (err: any) {
      setError(err.response?.data?.message ?? t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/products')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('products.add')}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Basic info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Thông tin cơ bản</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.name')} <span className="text-red-500">*</span>
                </label>
                <input type="text" name="name" value={form.name} onChange={handleChange}
                  required placeholder="Tên sản phẩm" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.sku')}
                </label>
                <input type="text" name="sku" value={form.sku} onChange={handleChange}
                  placeholder="Tự tạo nếu để trống" className={inputClass} />
                <p className="mt-1 text-xs text-gray-400">Để trống để hệ thống tự sinh SKU.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.category')}
                </label>
                <input type="text" name="category" value={form.category} onChange={handleChange}
                  placeholder="Danh mục" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.unit')}
                </label>
                <select name="unit" value={form.unit} onChange={handleChange} className={inputClass}>
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ảnh sản phẩm
                </label>
                <input type="text" name="imageUrl" value={form.imageUrl} onChange={handleChange}
                  placeholder="https://example.com/product.jpg" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.description')}
                </label>
                <textarea name="description" value={form.description} onChange={handleChange}
                  rows={3} placeholder="Mô tả sản phẩm..." className={inputClass} />
              </div>
            </div>
          </div>

          {/* Pricing & stock */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Giá & Tồn kho</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.price')} (VND) <span className="text-red-500">*</span>
                </label>
                <input type="number" name="price" value={form.price} onChange={handleChange}
                  required min="0" step="1000" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.cost')} (VND)
                </label>
                <input type="number" name="cost" value={form.cost} onChange={handleChange}
                  min="0" step="1000" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tồn kho ban đầu
                </label>
                <input type="number" name="stock" value={form.stock} onChange={handleChange}
                  min="0" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.minStock')}
                </label>
                <input type="number" name="minStock" value={form.minStock} onChange={handleChange}
                  min="0" className={inputClass} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="isActive" id="isActive" checked={form.isActive}
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
