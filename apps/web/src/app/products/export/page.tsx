'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';
import { Download } from 'lucide-react';

export default function ExportProductsPage() {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [isActive, setIsActive] = useState<boolean | ''>('');

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (isActive !== '') params.append('isActive', String(isActive));
      const res = await apiClient.get(`/products/export?${params.toString()}`);
      const products = res.data.items;

      // Convert to CSV
      const headers = ['sku', 'name', 'category', 'description', 'price', 'cost', 'stock', 'minStock', 'isActive'];
      const csvRows = [headers.join(',')];
      for (const p of products) {
        const row = headers.map(h => {
          let val = p[h];
          if (val === undefined) val = '';
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) val = `"${val.replace(/"/g, '""')}"`;
          if (h === 'isActive') val = val ? 'Active' : 'Inactive';
          return val;
        });
        csvRows.push(row.join(','));
      }
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', `products_export_${new Date().toISOString().slice(0,19)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed', error);
      alert('Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Download className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('products.exportTitle')}
            </h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.searchPlaceholder')}
              </label>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Min price (VND)
                </label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max price (VND)
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={isActive === '' ? '' : String(isActive)}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') setIsActive('');
                  else setIsActive(val === 'true');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <button
              onClick={handleExport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {loading ? t('common.loading') : t('actions.export')}
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}


