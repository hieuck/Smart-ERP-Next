
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { productsApi, type Product } from '@/lib/api-products';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  Card,
  Button,
  Input,
  Select,
  DatePicker,
  PageHeader,
  DataTable,
  StatCard
} from '@smart-erp/shared';
import {
  Warehouse, AlertTriangle, ArrowDown, ArrowUp,
  RefreshCw, Search, ChevronLeft, ChevronRight,
  Package, ArrowRightLeft, Clock, AlertCircle,
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

const TRANSFER_STATUS_CONFIG = {
  draft: { label: 'inventory.transfers.draft', color: 'text-gray-600 bg-gray-50' },
  approved: { label: 'inventory.transfers.approved', color: 'text-blue-600 bg-blue-50' },
  shipped: { label: 'inventory.transfers.shipped', color: 'text-orange-600 bg-orange-50' },
  received: { label: 'inventory.transfers.received', color: 'text-green-600 bg-green-50' },
  cancelled: { label: 'inventory.transfers.cancelled', color: 'text-red-600 bg-red-50' },
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
  const [activeTab, setActiveTab] = useState<'transactions' | 'lowstock' | 'reorder' | 'lots' | 'transfers' | 'omnichannel'>('transactions');
  const [reorderSuggestions, setReorderSuggestions] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Lots state
  const [lots, setLots] = useState<any[]>([]);
  const [showLotModal, setShowLotModal] = useState(false);
  const [lotForm, setLotForm] = useState({
    productSearch: '', productId: '', productName: '',
    lotNumber: '', expiryDate: '', quantity: 1, warehouseId: '',
  });
  const [lotSearchResults, setLotSearchResults] = useState<Product[]>([]);
  const [creatingLot, setCreatingLot] = useState(false);

  // Transfers state
  const [transfers, setTransfers] = useState<any[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromWarehouseId: '', toWarehouseId: '', notes: '',
    items: [{ productId: '', quantityRequested: 1 }],
  });
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [creatingTransfer, setCreatingTransfer] = useState(false);

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

  const [showCreatePoModal, setShowCreatePoModal] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [creatingReorderPo, setCreatingReorderPo] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [reorderPoNotes, setReorderPoNotes] = useState<string>('');
  const [reorderPoItems, setReorderPoItems] = useState<{ productId: string; name: string; sku: string; quantity: number; included: boolean }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, txRes, lowRes, reorderRes, lotsRes, transfersRes, whRes, storesRes] = await Promise.allSettled([
        apiClient.get('/inventory/summary'),
        apiClient.get('/inventory/transactions', { params: { page, limit: 30 } }),
        apiClient.get('/inventory/low-stock'),
        apiClient.get('/inventory/reorder-suggestions'),
        apiClient.get('/inventory/lots'),
        apiClient.get('/inventory/transfers'),
        apiClient.get('/warehouses'),
        apiClient.get('/ecommerce/stores'),
      ]);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
      if (txRes.status === 'fulfilled') {
        setTransactions(txRes.value.data.items ?? []);
        setTotalPages(txRes.value.data.totalPages ?? 1);
        setTotal(txRes.value.data.total ?? 0);
      }
      if (lowRes.status === 'fulfilled') setLowStockItems(lowRes.value.data ?? []);
      if (reorderRes.status === 'fulfilled') setReorderSuggestions(reorderRes.value.data ?? []);
      if (lotsRes.status === 'fulfilled') setLots(lotsRes.value.data ?? []);
      if (transfersRes.status === 'fulfilled') setTransfers(transfersRes.value.data ?? []);
      if (whRes.status === 'fulfilled') setWarehouses(whRes.value.data ?? []);
      if (storesRes.status === 'fulfilled') setStores(storesRes.value.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!adjustForm.productSearch.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const res = await productsApi.getAll({ search: adjustForm.productSearch, limit: 6 });
      setSearchResults(res.items);
    }, 250);
    return () => clearTimeout(t);
  }, [adjustForm.productSearch]);

  const syncStock = async (storeId: string) => {
    setSyncing(storeId);
    try {
      const res = await apiClient.post(`/inventory/sync-channel-stock/${storeId}`);
      alert(t('actions.success') + ': ' + JSON.stringify(res.data));
    } catch (err: any) {
      alert(err.response?.data?.message ?? t('common.error'));
    } finally {
      setSyncing(null);
    }
  };

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

  useEffect(() => {
    if (!lotForm.productSearch.trim()) { setLotSearchResults([]); return; }
    const t = setTimeout(async () => {
      const res = await productsApi.getAll({ search: lotForm.productSearch, limit: 6 });
      setLotSearchResults(res.items);
    }, 250);
    return () => clearTimeout(t);
  }, [lotForm.productSearch]);

  const handleCreateLot = async () => {
    if (!lotForm.productId || !lotForm.lotNumber || lotForm.quantity <= 0) return;
    setCreatingLot(true);
    try {
      await apiClient.post('/inventory/lots', {
        productId: lotForm.productId,
        lotNumber: lotForm.lotNumber,
        expiryDate: lotForm.expiryDate || undefined,
        quantity: lotForm.quantity,
        warehouseId: lotForm.warehouseId || undefined,
      });
      setShowLotModal(false);
      setLotForm({ productSearch: '', productId: '', productName: '', lotNumber: '', expiryDate: '', quantity: 1, warehouseId: '' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to create lot');
    } finally {
      setCreatingLot(false);
    }
  };

  const handleCreateTransfer = async () => {
    if (!transferForm.fromWarehouseId || !transferForm.toWarehouseId || transferForm.items.length === 0) return;
    setCreatingTransfer(true);
    try {
      await apiClient.post('/inventory/transfers', {
        fromWarehouseId: transferForm.fromWarehouseId,
        toWarehouseId: transferForm.toWarehouseId,
        notes: transferForm.notes || undefined,
        items: transferForm.items.filter(i => i.productId && i.quantityRequested > 0),
      });
      setShowTransferModal(false);
      setTransferForm({ fromWarehouseId: '', toWarehouseId: '', notes: '', items: [{ productId: '', quantityRequested: 1 }] });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to create transfer');
    } finally {
      setCreatingTransfer(false);
    }
  };

  const openCreatePoModal = async () => {
    setSelectedSupplier(null);
    setSupplierSearch('');
    setShowCreatePoModal(true);
    const defaultWh = warehouses.find((w: any) => w.isDefault);
    setSelectedWarehouseId(defaultWh?.id ?? '');
    setExpectedDate('');
    setReorderPoNotes('');
    setReorderPoItems(
      reorderSuggestions
        .filter((s: any) => s.suggestedOrderQuantity > 0)
        .map((s: any) => ({
          productId: s.id,
          name: s.name,
          sku: s.sku,
          quantity: s.suggestedOrderQuantity,
          included: true,
        })),
    );
    try {
      const res = await apiClient.get('/suppliers', { params: { limit: 20 } });
      setSuppliers(res.data.items ?? []);
    } catch {
      setSuppliers([]);
    }
  };

  const handleCreatePoFromSuggestions = async () => {
    if (!selectedSupplier) return;
    setCreatingReorderPo(true);
    try {
      await apiClient.post('/purchasing/from-reorder-suggestions', {
        supplierId: selectedSupplier.id,
        warehouseId: selectedWarehouseId || undefined,
        expectedDate: expectedDate || undefined,
        notes: reorderPoNotes || undefined,
        items: reorderPoItems
          .filter((i) => i.included && i.quantity > 0)
          .map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      setShowCreatePoModal(false);
      alert(t('purchasing.createSuccess'));
      window.location.href = '/purchasing';
    } catch (err: any) {
      alert(err.response?.data?.message ?? t('purchasing.createError'));
    } finally {
      setCreatingReorderPo(false);
    }
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <PageHeader
          title={t('inventory.title')}
          description={t('inventory.summary')}
          icon={<Warehouse className="w-5 h-5" />}
          iconColor="orange"
          actions={
            <Button onClick={() => setShowAdjust(true)} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              {t('inventory.adjustment')}
            </Button>
          }
        />

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title={t('inventory.totalProducts')} value={summary.totalProducts} icon={<Package />} />
            <StatCard title={t('inventory.totalUnits')} value={summary.totalUnits.toLocaleString('vi-VN')} icon={<Warehouse />} />
            <StatCard title={t('inventory.stockValue')} value={formatVND(summary.totalValue)} icon={<RefreshCw />} color="text-blue-600" />
            <StatCard title={t('inventory.lowStock')} value={summary.lowStock} icon={<AlertTriangle />} color={summary.lowStock > 0 ? 'text-yellow-600' : ''} />
            <StatCard title={t('inventory.outOfStock')} value={summary.outOfStock} icon={<AlertCircle />} color={summary.outOfStock > 0 ? 'text-red-600' : ''} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          {[
            { key: 'transactions' as const, label: `${t('inventory.transactions')} (${total})`, icon: Clock },
            { key: 'lowstock' as const, label: `${t('inventory.lowStock')} (${lowStockItems.length})`, icon: AlertTriangle },
            { key: 'reorder' as const, label: `${t('inventory.reorderPoints')} (${reorderSuggestions.length})`, icon: RefreshCw },
            { key: 'lots' as const, label: `${t('inventory.lots.title')} (${lots.length})`, icon: Package },
            { key: 'transfers' as const, label: `${t('inventory.transfers.title')} (${transfers.length})`, icon: ArrowRightLeft },
            { key: 'omnichannel' as const, label: `Omnichannel (${stores.length})`, icon: RefreshCw },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
          </div>
          {(activeTab === 'lots' || activeTab === 'transfers') && (
            <div className="flex gap-2">
              {activeTab === 'lots' && (
                <Button onClick={() => setShowLotModal(true)} size="sm">
                  <Package className="w-4 h-4 mr-2" />
                  {t('inventory.lots.add')}
                </Button>
              )}
              {activeTab === 'transfers' && (
                <Button onClick={() => setShowTransferModal(true)} size="sm">
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  {t('inventory.transfers.add')}
                </Button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="animate-spin w-6 h-6 mr-2" />
            {t('common.loading')}
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'transactions' && (
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
                            <Button
                              onClick={() => {
                                setAdjustForm((f) => ({ ...f, productId: p.id, productName: p.name, type: 'IN' }));
                                setShowAdjust(true);
                              }}
                              size="sm"
                            >
                              {t('inventory.stockIn')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'reorder' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button onClick={openCreatePoModal} size="sm">
                    {t('purchasing.add')}
                  </Button>
                </div>
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
                              <Input
                                type="number"
                                value={p.minStock ?? 0}
                                onChange={async (e) => {
                                  const newVal = parseInt(e.target.value) || 0;
                                  await handleUpdateReorder(p.id, newVal, p.reorderQuantity);
                                }}
                                className="w-20 text-right"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Input
                                type="number"
                                value={p.reorderQuantity ?? 0}
                                onChange={async (e) => {
                                  const newVal = parseInt(e.target.value) || 0;
                                  await handleUpdateReorder(p.id, p.minStock, newVal);
                                }}
                                className="w-20 text-right"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-blue-600">
                              {p.suggestedOrderQuantity > 0 ? p.suggestedOrderQuantity : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                onClick={() => {
                                  setAdjustForm((f) => ({ ...f, productId: p.id, productName: p.name, type: 'IN' }));
                                  setShowAdjust(true);
                                }}
                                size="sm"
                              >
                                {t('inventory.stockIn')}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'lots' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('inventory.lots.lotNumber')}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('nav.products')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('inventory.lots.quantity')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('inventory.lots.remainingQuantity')}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('inventory.lots.expiryDate')}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('inventory.lots.warehouse')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {lots.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">{t('inventory.noTransactions')}</td></tr>
                      ) : lots.map((lot) => (
                        <tr key={lot.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 font-mono font-medium">{lot.lotNumber}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{lot.productId?.slice(0, 8)}…</td>
                          <td className="px-4 py-3 text-right font-medium">{lot.quantity}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{lot.remainingQuantity}</td>
                          <td className="px-4 py-3">
                            {lot.expiryDate ? (
                              <span className={`text-sm ${new Date(lot.expiryDate) < new Date() ? 'text-red-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                                {new Date(lot.expiryDate).toLocaleDateString('vi-VN')}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{lot.warehouseId ? lot.warehouseId.slice(0, 8) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'transfers' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('inventory.transfers.code')}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('inventory.transfers.fromWarehouse')}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('inventory.transfers.toWarehouse')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('inventory.transfers.status')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('common.time')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {transfers.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">{t('inventory.noTransactions')}</td></tr>
                      ) : transfers.map((transfer) => {
                        const statusCfg = TRANSFER_STATUS_CONFIG[transfer.status as keyof typeof TRANSFER_STATUS_CONFIG] ?? TRANSFER_STATUS_CONFIG.draft;
                        return (
                          <tr key={transfer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 font-mono font-medium text-blue-600">{transfer.transferCode}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs">{transfer.fromWarehouseId?.slice(0, 8)}…</td>
                            <td className="px-4 py-3 text-gray-600 text-xs">{transfer.toWarehouseId?.slice(0, 8)}…</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                {t(statusCfg.label)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-gray-400">
                              {new Date(transfer.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'omnichannel' && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold">Omnichannel Stores</h2>
                  <Button onClick={async () => {
                    try {
                      const res = await apiClient.post('/inventory/sync-all-stores-stock');
                      alert(t('actions.success') + ': ' + JSON.stringify(res.data));
                    } catch { alert(t('common.error')); }
                  }}>
                    Sync All Stores
                  </Button>
                </div>

                <div className="space-y-3">
                  {stores.length === 0 ? (
                    <div className="text-sm text-gray-400 py-8 text-center">
                      No stores connected.
                    </div>
                  ) : stores.map((s) => (
                    <div key={s.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{s.name}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span className="uppercase font-bold text-blue-600">{s.platform}</span>
                          <span>·</span>
                          <span className={s.lastSyncStatus === 'success' ? 'text-green-600' : s.lastSyncStatus === 'failed' ? 'text-red-600' : ''}>
                            {s.lastSyncStatus ?? '—'}
                          </span>
                          {s.lastSyncAt && (
                            <>
                              <span>·</span>
                              <span>{new Date(s.lastSyncAt).toLocaleString('vi-VN')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => syncStock(s.id)}
                        disabled={syncing === s.id}
                      >
                        {syncing === s.id ? t('common.processing') : 'Push Stock'}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Adjust modal */}
        {showAdjust && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('inventory.adjustment')}</h2>
              <div className="space-y-4">
                {!adjustForm.productId ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      value={adjustForm.productSearch}
                      onChange={(e) => setAdjustForm((f) => ({ ...f, productSearch: e.target.value }))}
                      placeholder={t('products.searchPlaceholder')}
                      className="pl-9"
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
                            <span className="text-gray-400 ml-2 text-xs">{p.sku}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{adjustForm.productName}</span>
                    <button onClick={() => setAdjustForm((f) => ({ ...f, productId: '', productName: '' }))} className="text-blue-400 hover:text-blue-600 text-xs">{t('common.change')}</button>
                  </div>
                )}

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

                <Input
                  label={t('inventory.quantity')}
                  type="number"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                  min={1}
                />

                <Input
                  label={t('inventory.reason')}
                  type="text"
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setShowAdjust(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleAdjust}
                  disabled={!adjustForm.productId || adjusting}
                  className="flex-1"
                >
                  {adjusting ? t('common.processing') : t('common.confirm')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Lot Modal */}
        {showLotModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('inventory.lots.add')}</h2>
              <div className="space-y-4">
                {!lotForm.productId ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="text" value={lotForm.productSearch}
                      onChange={(e) => setLotForm((f) => ({ ...f, productSearch: e.target.value }))}
                      placeholder={t('products.searchPlaceholder')}
                      className="pl-9" />
                    {lotSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {lotSearchResults.map((p) => (
                          <button key={p.id}
                            onClick={() => setLotForm((f) => ({ ...f, productId: p.id, productName: p.name, productSearch: '' }))}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-gray-400 ml-2 text-xs">{p.sku}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{lotForm.productName}</span>
                    <button onClick={() => setLotForm((f) => ({ ...f, productId: '', productName: '' }))} className="text-blue-400 hover:text-blue-600 text-xs">{t('common.change')}</button>
                  </div>
                )}
                <Input value={lotForm.lotNumber}
                  onChange={(e) => setLotForm((f) => ({ ...f, lotNumber: e.target.value }))}
                  placeholder={t('inventory.lots.lotNumber')} />
                <DatePicker value={lotForm.expiryDate}
                  onChange={(val) => setLotForm((f) => ({ ...f, expiryDate: val }))} />
                <Input type="number" value={lotForm.quantity}
                  onChange={(e) => setLotForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                  placeholder={t('inventory.lots.quantity')} />
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setShowLotModal(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreateLot} disabled={!lotForm.productId || !lotForm.lotNumber || creatingLot} className="flex-1">
                  {creatingLot ? t('common.processing') : t('common.save')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Create PO Modal */}
        {showCreatePoModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('purchasing.supplier')}</h2>
              <div className="space-y-3">
                <Select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                >
                  <option value="">{t('purchasing.selectWarehouseOptional')}</option>
                  {warehouses.map((wh: any) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </Select>
                <DatePicker
                  value={expectedDate}
                  onChange={(val) => setExpectedDate(val)}
                />
                <textarea
                  value={reorderPoNotes}
                  onChange={(e) => setReorderPoNotes(e.target.value)}
                  placeholder={t('purchasing.notes')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                />
                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  {reorderPoItems.map((it) => (
                    <div key={it.productId} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <input
                        type="checkbox"
                        checked={it.included}
                        onChange={(e) =>
                          setReorderPoItems((prev) =>
                            prev.map((p) =>
                              p.productId === it.productId ? { ...p, included: e.target.checked } : p,
                            ),
                          )
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{it.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{it.sku}</div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={it.quantity}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 0;
                          setReorderPoItems((prev) =>
                            prev.map((p) => (p.productId === it.productId ? { ...p, quantity: v } : p)),
                          );
                        }}
                        className="w-20"
                      />
                    </div>
                  ))}
                </div>
                <Input
                  type="text"
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  placeholder={t('suppliers.searchPlaceholder')}
                />
                <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  {suppliers
                    .filter((s) => !supplierSearch || (s.name ?? '').toLowerCase().includes(supplierSearch.toLowerCase()))
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSupplier(s)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedSupplier?.id === s.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      >
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-gray-400">{s.code}</div>
                      </button>
                    ))}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setShowCreatePoModal(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleCreatePoFromSuggestions}
                  disabled={!selectedSupplier || creatingReorderPo || reorderPoItems.filter((i) => i.included && i.quantity > 0).length === 0}
                  className="flex-1"
                >
                  {creatingReorderPo ? t('common.processing') : t('purchasing.add')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('inventory.transfers.add')}</h2>
              <div className="space-y-4">
                <Select value={transferForm.fromWarehouseId}
                  onChange={(e) => setTransferForm((f) => ({ ...f, fromWarehouseId: e.target.value }))}>
                  <option value="">{t('inventory.transfers.fromWarehouse')}</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </Select>
                <Select value={transferForm.toWarehouseId}
                  onChange={(e) => setTransferForm((f) => ({ ...f, toWarehouseId: e.target.value }))}>
                  <option value="">{t('inventory.transfers.toWarehouse')}</option>
                  {warehouses.filter((wh) => wh.id !== transferForm.fromWarehouseId).map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </Select>
                <textarea value={transferForm.notes}
                  onChange={(e) => setTransferForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder={t('inventory.reason')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setShowTransferModal(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreateTransfer}
                  disabled={!transferForm.fromWarehouseId || !transferForm.toWarehouseId || creatingTransfer}
                  className="flex-1">
                  {creatingTransfer ? t('common.processing') : t('common.save')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

