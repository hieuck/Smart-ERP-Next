// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { productsApi, type Product } from '@/lib/api-products';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  ArrowLeft, Edit, Package, AlertTriangle,
  ArrowDown, ArrowUp, RefreshCw,
} from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  IN: { label: 'Nhập kho', color: 'text-green-600' },
  OUT: { label: 'Xuất kho', color: 'text-red-600' },
  ADJUSTMENT: { label: 'Điều chỉnh', color: 'text-blue-600' },
};

const formatVND = (v: string | number | null | undefined) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    typeof v === 'string' ? parseFloat(v) : (v ?? 0)
  );

export default function ProductDetailPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productsApi.getById(id),
      apiClient.get(`/products/${id}/transactions`).then((r) => r.data),
    ])
      .then(([p, txs]) => {
        setProduct(p);
        setTransactions(txs ?? []);
      })
      .catch(() => router.push('/products'))
      .finally(() => setLoading(false));
  }, [id]);

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

  if (!product) return null;

  const isLow = product.stock <= (product.minStock ?? 0);
  const margin = product.cost && parseFloat(product.price) > 0
    ? (((parseFloat(product.price) - parseFloat(product.cost)) / parseFloat(product.price)) * 100).toFixed(1)
    : null;

  return (
    <AuthGuard>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/products')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
              {!product.isActive && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded-full">
                  Ngừng KD
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => router.push(`/products/${id}/edit`)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Edit className="w-4 h-4" />
            {t('actions.edit')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Product info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basic info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Thông tin sản phẩm</h2>
              <div className="mb-4">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" className="w-full max-h-64 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
                ) : (
                  <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Package className="w-10 h-10 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: t('products.sku'), value: product.sku, mono: true },
                  { label: t('products.category'), value: product.category ?? '—' },
                  { label: t('products.unit'), value: product.unit ?? '—' },
                  { label: 'Trạng thái', value: product.isActive ? 'Đang kinh doanh' : 'Ngừng kinh doanh' },
                ].map((row) => (
                  <div key={row.label}>
                    <p className="text-gray-500 dark:text-gray-400">{row.label}</p>
                    <p className={`font-medium text-gray-900 dark:text-white mt-0.5 ${row.mono ? 'font-mono' : ''}`}>
                      {row.value}
                    </p>
                  </div>
                ))}
                {product.description && (
                  <div className="col-span-2">
                    <p className="text-gray-500 dark:text-gray-400">{t('products.description')}</p>
                    <p className="text-gray-900 dark:text-white mt-0.5">{product.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction history */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Lịch sử nhập/xuất ({transactions.length})
                </h2>
              </div>
              {transactions.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">{t('inventory.noTransactions')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Loại</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">SL</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Trước</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Sau</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Ghi chú</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {transactions.map((tx) => {
                        const info = TYPE_LABELS[tx.type] ?? { label: tx.type, color: 'text-gray-600' };
                        return (
                          <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-2.5">
                              <span className={`flex items-center gap-1 text-xs font-medium ${info.color}`}>
                                {tx.type === 'IN' ? <ArrowDown className="w-3 h-3" /> : tx.type === 'OUT' ? <ArrowUp className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
                                {info.label}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold">{tx.quantity}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500">{tx.previousStock}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">{tx.newStock}</td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs truncate max-w-xs">{tx.notes ?? tx.reference ?? '—'}</td>
                            <td className="px-4 py-2.5 text-right text-xs text-gray-400">
                              {new Date(tx.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right: Pricing & stock */}
          <div className="space-y-4">
            {/* Stock card */}
            <div className={`rounded-xl border p-5 ${isLow ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
              <div className="flex items-center gap-2 mb-3">
                {isLow && <AlertTriangle className="w-4 h-4 text-red-500" />}
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('products.stock')}</h2>
              </div>
              <p className={`text-4xl font-bold ${isLow ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                {product.stock}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {product.unit ?? 'đơn vị'} · Tối thiểu: {product.minStock ?? 0}
              </p>
              {isLow && (
                <p className="text-xs text-red-600 mt-2 font-medium">⚠ Cần nhập thêm hàng</p>
              )}
            </div>

            {/* Pricing card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Giá</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('products.price')}</span>
                  <span className="font-bold text-blue-600 text-base">{formatVND(product.price)}</span>
                </div>
                {product.cost && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{t('products.cost')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatVND(product.cost)}</span>
                  </div>
                )}
                {margin && (
                  <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400">Biên lợi nhuận</span>
                    <span className="font-bold text-green-600">{margin}%</span>
                  </div>
                )}
                {product.stock > 0 && product.cost && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Giá trị tồn kho</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatVND(product.stock * parseFloat(product.cost))}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push(`/inventory?productId=${id}`)}
                className="w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Điều chỉnh tồn kho
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
