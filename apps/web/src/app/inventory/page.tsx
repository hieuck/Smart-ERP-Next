'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { productsApi, type Product } from '@/lib/api-products';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  Warehouse, AlertTriangle, ArrowDown, ArrowUp,
  RefreshCw, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';

type AdjustType = 'IN' | 'OUT' | 'ADJUSTMENT';

interface Transaction {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

interface InventorySummary {
  totalProducts: number;
  totalUnits: number;
  totalValue: number;
  outOfStock: number;
  lowStock: number;
}

const formatVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const TYPE_CONFIG = {
  IN: { color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
  OUT: { color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
  ADJUSTMENT: { color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
} as const;

export default function InventoryPage() {
  const { t } = useTranslation('common');
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<'transactions' | 'lowstock' | 'reorder'>('transactions');
  const [reorderSuggestions, setReorderSuggestions] = useState<any[]>([]);

  // Adjust modal
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    productSearch: '',
    productId: '',
    productName: '',
    quantity: 1,
    type: 'IN' as AdjustType,
    notes: '',
    reference: '',
  });
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [adjusting, setAdjusting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, txRes, lowRes, reorderRes] = await Promise.allSettled([
        apiClient.get('/inventory/summary'),
        apiClient.get('/inventory/transactions', { params: { page, limit: 30 } }),
        apiClient.get('/inventory/low-stock'),
        apiClient.get('/inventory/reorder-suggestions'),
      ]);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
      if (txRes.status === 'fulfilled') {
        setTransactions(txRes.value.data.items ?? []);
        setTotalPages(txRes.value.data.totalPages ?? 1);
        setTotal(txRes.value.data.total ?? 0);
      }
      if (lowRes.status === 'fulfilled') setLowStockItems(lowRes.value.data ?? []);
      if (reorderRes.status === 'fulfilled') setReorderSuggestions(reorderRes.value.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page]);

  // Product search for adjust modal
  useEffect(() => {
    if (!adjustForm.productSearch.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const res = await productsApi.getAll({ search: adjustForm.productSearch, limit: 6 });
      setSearchResults(res.items);
    }, 250);
    return () => clearTimeout(t);
  }, [adjustForm.productSearch]);

  const handleUpdateReorder = async (productId: string, minStock?: number, reorderQuantity?: number) => {
    try {
      await apiClient.patch(`/products/${productId}/reorder-points`, {
        minStock,
        reorderQuantity,
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message ?? t('inventory.updateFailed'));
    }
  };

  const handleAdjust = async () => {
    if (!adjustForm.productId || adjustForm.quantity <= 0) return;
    setAdjusting(true);
    try {
      await apiClient.post('/inventory/adjust', {
        productId: adjustForm.productId,
        quantity: adjustForm.quantity,
        type: adjustForm.type,
        notes: adjustForm.notes || undefined,
        reference: adjustForm.reference || undefined,
      });
      setShowAdjust(false);
      setAdjustForm({ productSearch: '', productId: '', productName: '', quantity: 1, type: 'IN', notes: '', reference: '' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message ?? t('inventory.adjustFailed'));
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Warehouse className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('inventory.title')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('inventory.summary')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdjust(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            {t('inventory.adjustment')}
          </button>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: t('inventory.totalProducts'), value: summary.totalProducts, color: 'text-gray-900 dark:text-white' },
              { label: t('inventory.totalUnits'), value: summary.totalUnits.toLocaleString('vi-VN'), color: 'text-gray-900 dark:text-white' },
              { label: t('inventory.stockValue'), value: formatVND(summary.totalValue), color: 'text-blue-600' },
              { label: t('inventory.lowStock'), value: summary.lowStock, color: summary.lowStock > 0 ? 'text-yellow-600' : 'text-gray-900 dark:text-white' },
              { label: t('inventory.outOfStock'), value: summary.outOfStock, color: summary.outOfStock > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white' },
            ].map((card) => (
              <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className={`mt-1 text-xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
          {[
            { key: 'transactions' as const, label: `${t('inventory.transactions')} (${total})` },
            { key: 'lowstock' as const, label: `${t('inventory.lowStock')} (${lowStockItems.length})` },
            { key: 'reorder' as const, label: `${t('inventory.reorderPoints')} (${reorderSuggestions.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

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
            {activeTab === 'transactions' && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('inventory.stockIn')}</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('nav.products')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('inventory.quantity')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('inventory.currentStock')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('inventory.stock')}</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('inventory.reason')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('common.time')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {transactions.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">{t('inventory.noTransactions')}</td></tr>
                        ) : transactions.map((tx) => {
                          const cfg = TYPE_CONFIG[tx.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.IN;
                          return (
                            <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                  {tx.type === 'IN' ? <ArrowDown className="w-3 h-3" /> : tx.type === 'OUT' ? <ArrowUp className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
                                  {tx.type === 'IN' ? t('inventory.stockIn') : tx.type === 'OUT' ? t('inventory.stockOut') : t('inventory.adjustment')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">{tx.productId.slice(0, 8)}…</td>
                              <td className="px-4 py-3 text-right font-bold">{tx.quantity}</td>
                              <td className="px-4 py-3 text-right text-gray-500">{tx.previousStock}</td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{tx.newStock}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-xs">{tx.notes ?? tx.reference ?? '—'}</td>
                              <td className="px-4 py-3 text-right text-xs text-gray-400">
                                {new Date(tx.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
                    <p className="text-sm text-gray-500">{total} {t('inventory.transactions')}</p>
                    <div className="flex gap-1">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
                      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'lowstock' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('nav.products')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('inventory.stock')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('inventory.minStock')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('products.price')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {lowStockItems.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">{t('inventory.allInStock')}</td></tr>
                      ) : lowStockItems.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                                <p className="text-xs text-gray-400">{p.sku}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-600">{p.stock}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{p.minStock ?? 0}</td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatVND(parseFloat(p.price as any))}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                setAdjustForm((f) => ({ ...f, productId: p.id, productName: p.name, type: 'IN' }));
                                setShowAdjust(true);
                              }}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                              {t('inventory.stockIn')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'reorder' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('nav.products')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('inventory.stock')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('inventory.minStock')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('inventory.reorderQuantity')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('inventory.suggestedOrder')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {reorderSuggestions.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">{t('inventory.noReorderSuggestions')}</td></tr>
                      ) : reorderSuggestions.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                              <p className="text-xs text-gray-400">{p.sku}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{p.stock}</td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              value={p.minStock ?? 0}
                              onChange={async (e) => {
                                const newVal = parseInt(e.target.value) || 0;
                                await handleUpdateReorder(p.id, newVal, p.reorderQuantity);
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-right text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              value={p.reorderQuantity ?? 0}
                              onChange={async (e) => {
                                const newVal = parseInt(e.target.value) || 0;
                                await handleUpdateReorder(p.id, p.minStock, newVal);
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-right text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-blue-600">
                            {p.suggestedOrderQuantity > 0 ? p.suggestedOrderQuantity : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                setAdjustForm((f) => ({ ...f, productId: p.id, productName: p.name, type: 'IN' }));
                                setShowAdjust(true);
                              }}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                              {t('inventory.stockIn')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Adjust modal */}
      {showAdjust && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('inventory.adjustment')}</h2>
            <div className="space-y-4">
              {/* Product search */}
              {!adjustForm.productId ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={adjustForm.productSearch}
                    onChange={(e) => setAdjustForm((f) => ({ ...f, productSearch: e.target.value }))}
                    placeholder={t('products.searchPlaceholder')}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setAdjustForm((f) => ({ ...f, productId: p.id, productName: p.name, productSearch: '' }))}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                        >
                          <span className="font-medium">{p.name}</span>
                          <span className="text-gray-400 ml-2 text-xs">{p.sku} · {t('inventory.stock')}: {p.stock}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{adjustForm.productName}</span>
                  <button onClick={() => setAdjustForm((f) => ({ ...f, productId: '', productName: '' }))} className="text-blue-400 hover:text-blue-600 text-xs">{t('common.change','Đổi')}</button>
                </div>
              )}

              {/* Type */}
              <div className="grid grid-cols-3 gap-2">
                {(['IN', 'OUT', 'ADJUSTMENT'] as AdjustType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAdjustForm((f) => ({ ...f, type }))}
                    className={`py-2 rounded-lg text-sm font-medium border transition ${
                      adjustForm.type === type
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {type === 'IN' ? t('inventory.stockIn') : type === 'OUT' ? t('inventory.stockOut') : t('inventory.adjustment')}
                  </button>
                ))}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('inventory.quantity')}</label>
                <input
                  type="number"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('inventory.reason')}</label>
                <input
                  type="text"
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder={t('inventory.notes','Lý do điều chỉnh...')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdjust(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAdjust}
                disabled={!adjustForm.productId || adjusting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold rounded-xl transition text-sm"
              >
                {adjusting ? t('common.processing') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
