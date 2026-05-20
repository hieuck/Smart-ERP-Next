// @ts-nocheck
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { productsApi, type Product } from '@/lib/api-products';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  Package, Search, Plus, Edit, Trash2, Eye,
  ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { db } from '@/lib/offline-db';
import { syncService } from '@/lib/sync-service';

const formatVND = (v: number | string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    typeof v === 'string' ? parseFloat(v) : v
  );

export default function ProductsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchProducts = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const res = await productsApi.getAll({ page: p, limit, search: s || undefined });
      setProductList(res.data?.items ?? res.items);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchProducts(); }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts(1, search);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirmDeleteMessage'))) return;
    try {
      await productsApi.delete(id);
      fetchProducts();
    } catch { /* handled */ }
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('products.title')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{total} {t('common.products')}</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/products/create')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('products.add')}
          </button>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('products.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm">
              {t('actions.search')}
            </button>
          </form>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('common.loading')}
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('products.name')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('products.sku')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('products.category')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('products.price')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('products.cost')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('products.stock')}</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {productList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                          {t('common.noData')}
                        </td>
                      </tr>
                    ) : productList.map((product) => {
                      const isLow = product.stock <= (product.minStock ?? 0);
                      return (
                        <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                  <Package className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                                {product.description && (
                                  <div className="text-xs text-gray-400 truncate max-w-xs">{product.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{product.sku}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                            {product.category || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                            {formatVND(product.price)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                            {product.cost ? formatVND(product.cost) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isLow && (
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                              )}
                              <span className={isLow ? 'text-red-600 font-bold' : 'text-gray-700 dark:text-gray-300'}>
                                {product.stock}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => router.push(`/products/${product.id}`)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                                title={t('common.view')}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => router.push(`/products/${product.id}/edit`)}
                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition"
                                title={t('common.edit')}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                                title={t('common.delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common.showing')} {(page - 1) * limit + 1}–{Math.min(page * limit, total)} {t('common.of')} {total}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}
