// Desktop Inventory Component - Lot Tracking & Warehouse Transfers
import React, { useEffect, useState, useCallback } from 'react';
import { Button, Card, DataTable } from '@smart-erp/ui';
import { useTranslation } from '@smart-erp/i18n';
import type { Column } from '@smart-erp/ui';
import {
  Warehouse, Package, ArrowRightLeft, AlertTriangle,
  Plus, RefreshCw, Search, ChevronLeft, ChevronRight,
  Clock, CheckCircle, XCircle, Truck,
} from 'lucide-react';

type InventoryTab = 'summary' | 'lowstock' | 'lots' | 'transfers';

interface InventorySummary {
  totalProducts: number;
  totalUnits: number;
  totalValue: number;
  outOfStock: number;
  lowStock: number;
}

interface Lot {
  id: string;
  lotNumber: string;
  productId: string;
  quantity: number;
  remainingQuantity: number;
  expiryDate: string | null;
  warehouseId: string | null;
  receivedDate: string;
  isActive: boolean;
}

interface Transfer {
  id: string;
  transferCode: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: 'draft' | 'approved' | 'shipped' | 'received' | 'cancelled';
  notes: string | null;
  createdAt: string;
  items: any[];
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
}

const TRANSFER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'inventory.transfers.draft', color: 'text-gray-600 bg-gray-100', icon: <Clock className="w-4 h-4" /> },
  approved: { label: 'inventory.transfers.approved', color: 'text-blue-600 bg-blue-100', icon: <CheckCircle className="w-4 h-4" /> },
  shipped: { label: 'inventory.transfers.shipped', color: 'text-orange-600 bg-orange-100', icon: <Truck className="w-4 h-4" /> },
  received: { label: 'inventory.transfers.received', color: 'text-green-600 bg-green-100', icon: <CheckCircle className="w-4 h-4" /> },
  cancelled: { label: 'inventory.transfers.cancelled', color: 'text-red-600 bg-red-100', icon: <XCircle className="w-4 h-4" /> },
};

const formatVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const API_BASE = 'http://localhost:3000';

function authHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    'X-Tenant-ID': localStorage.getItem('tenant_id') || '',
    'Content-Type': 'application/json',
  };
}

export function InventoryScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<InventoryTab>('summary');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Lot modal
  const [showLotModal, setShowLotModal] = useState(false);
  const [lotForm, setLotForm] = useState({ productId: '', lotNumber: '', expiryDate: '', quantity: 1, warehouseId: '' });
  const [lotProducts, setLotProducts] = useState<any[]>([]);
  const [lotSearch, setLotSearch] = useState('');

  // Transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromWarehouseId: '', toWarehouseId: '', notes: '',
    items: [{ productId: '', quantityRequested: 1 }],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, lowRes, lotsRes, transfersRes, whRes] = await Promise.allSettled([
        fetch(`${API_BASE}/inventory/summary`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API_BASE}/inventory/low-stock`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API_BASE}/inventory/lots`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API_BASE}/inventory/transfers`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API_BASE}/warehouses`, { headers: authHeaders() }).then(r => r.json()),
      ]);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
      if (lowRes.status === 'fulfilled') setLowStockItems(lowRes.value);
      if (lotsRes.status === 'fulfilled') setLots(Array.isArray(lotsRes.value) ? lotsRes.value : lotsRes.value.items || []);
      if (transfersRes.status === 'fulfilled') setTransfers(Array.isArray(transfersRes.value) ? transfersRes.value : transfersRes.value.items || []);
      if (whRes.status === 'fulfilled') setWarehouses(whRes.value);
    } catch (err) {
      console.error('Inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Search products for lot modal
  useEffect(() => {
    if (!lotSearch.trim()) { setLotProducts([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/products?search=${lotSearch}&limit=6`, { headers: authHeaders() });
        const data = await res.json();
        setLotProducts(Array.isArray(data) ? data : data.items || []);
      } catch (e) { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [lotSearch]);

  const handleCreateLot = async () => {
    if (!lotForm.productId || !lotForm.lotNumber || lotForm.quantity <= 0) return;
    try {
      const res = await fetch(`${API_BASE}/inventory/lots`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(lotForm),
      });
      if (res.ok) {
        setShowLotModal(false);
        setLotForm({ productId: '', lotNumber: '', expiryDate: '', quantity: 1, warehouseId: '' });
        setLotSearch('');
        setLotProducts([]);
        fetchData();
      }
    } catch (e) { console.error('Create lot error:', e); }
  };

  const handleCreateTransfer = async () => {
    if (!transferForm.fromWarehouseId || !transferForm.toWarehouseId) return;
    try {
      const res = await fetch(`${API_BASE}/inventory/transfers`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(transferForm),
      });
      if (res.ok) {
        setShowTransferModal(false);
        setTransferForm({ fromWarehouseId: '', toWarehouseId: '', notes: '', items: [{ productId: '', quantityRequested: 1 }] });
        fetchData();
      }
    } catch (e) { console.error('Create transfer error:', e); }
  };

  const handleTransferAction = async (id: string, action: string) => {
    try {
      await fetch(`${API_BASE}/inventory/transfers/${id}/${action}`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      fetchData();
    } catch (e) { console.error(`${action} error:`, e); }
  };

  // Column definitions
  const lotColumns: Column<Lot>[] = [
    { key: 'lotNumber', label: t('inventory.lots.lotNumber'), minWidth: 120 },
    { key: 'productId', label: t('nav.products'), minWidth: 120, render: (row) => <span className="text-xs text-gray-500">{row.productId.slice(0, 8)}…</span> },
    { key: 'quantity', label: t('inventory.lots.quantity'), minWidth: 80, align: 'right', render: (row) => row.quantity },
    { key: 'remainingQuantity', label: t('inventory.lots.remainingQuantity'), minWidth: 100, align: 'right', render: (row) => <span className={row.remainingQuantity === 0 ? 'text-red-600 font-bold' : 'text-gray-700'}>{row.remainingQuantity}</span> },
    { key: 'expiryDate', label: t('inventory.lots.expiryDate'), minWidth: 110, render: (row) => {
      if (!row.expiryDate) return <span className="text-gray-400">—</span>;
      const date = new Date(row.expiryDate);
      const isExpired = date < new Date();
      return <span className={`text-sm ${isExpired ? 'text-red-600 font-bold' : 'text-gray-700'}`}>{date.toLocaleDateString('vi-VN')}</span>;
    }},
    { key: 'warehouseId', label: t('inventory.lots.warehouse'), minWidth: 100, render: (row) => <span className="text-xs text-gray-500">{row.warehouseId ? row.warehouseId.slice(0, 8) : '—'}</span> },
  ];

  const transferColumns: Column<Transfer>[] = [
    { key: 'transferCode', label: t('inventory.transfers.code'), minWidth: 140, render: (row) => <span className="font-mono font-medium text-blue-600">{row.transferCode}</span> },
    { key: 'fromWarehouseId', label: t('inventory.transfers.fromWarehouse'), minWidth: 120 },
    { key: 'toWarehouseId', label: t('inventory.transfers.toWarehouse'), minWidth: 120 },
    { key: 'status', label: t('inventory.transfers.status'), minWidth: 100, align: 'center', render: (row) => {
      const cfg = TRANSFER_STATUS_CONFIG[row.status] || TRANSFER_STATUS_CONFIG.draft;
      return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.icon}{t(cfg.label)}</span>;
    }},
    { key: 'createdAt', label: t('common.time'), minWidth: 100, render: (row) => <span className="text-xs text-gray-400">{new Date(row.createdAt).toLocaleDateString('vi-VN')}</span> },
    { key: 'actions', label: t('common.actions'), minWidth: 160, align: 'center', render: (row) => {
      if (row.status === 'draft') return <Button size="sm" onClick={() => handleTransferAction(row.id, 'approve')}>{t('inventory.transfers.approve')}</Button>;
      if (row.status === 'approved') return <Button size="sm" onClick={() => handleTransferAction(row.id, 'ship')}>{t('inventory.transfers.ship')}</Button>;
      if (row.status === 'shipped') return <Button size="sm" onClick={() => handleTransferAction(row.id, 'receive')}>{t('inventory.transfers.receive')}</Button>;
      if (row.status === 'draft' || row.status === 'approved') return <Button size="sm" variant="destructive" onClick={() => handleTransferAction(row.id, 'cancel')}>{t('common.cancel')}</Button>;
      return null;
    }},
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Warehouse className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('inventory.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('inventory.summary')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'lots' && (
            <Button onClick={() => setShowLotModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('inventory.lots.add')}
            </Button>
          )}
          {activeTab === 'transfers' && (
            <Button onClick={() => setShowTransferModal(true)}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              {t('inventory.transfers.add')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: t('inventory.totalProducts'), value: summary.totalProducts },
            { label: t('inventory.totalUnits'), value: summary.totalUnits.toLocaleString('vi-VN') },
            { label: t('inventory.stockValue'), value: formatVND(summary.totalValue) },
            { label: t('inventory.lowStock'), value: summary.lowStock, danger: summary.lowStock > 0 },
            { label: t('inventory.outOfStock'), value: summary.outOfStock, danger: summary.outOfStock > 0 },
          ].map(card => (
            <Card key={card.label} className={`border-l-4 ${card.danger ? 'border-red-500' : 'border-blue-500'}`}>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className={`text-xl font-bold mt-1 ${card.danger ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{card.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          {[
            { key: 'summary' as const, label: t('inventory.summary'), icon: <Warehouse className="w-4 h-4" /> },
            { key: 'lowstock' as const, label: t('inventory.lowStock'), icon: <AlertTriangle className="w-4 h-4" /> },
            { key: 'lots' as const, label: `${t('inventory.lots.title')} (${lots.length})`, icon: <Package className="w-4 h-4" /> },
            { key: 'transfers' as const, label: `${t('inventory.transfers.title')} (${transfers.length})`, icon: <ArrowRightLeft className="w-4 h-4" /> },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-400">{t('common.loading')}</span>
        </div>
      ) : (
        <>
          {activeTab === 'summary' && <p className="text-gray-500 text-center py-8">📊 {t('inventory.summary')}</p>}

          {activeTab === 'lowstock' && (
            <Card>
              <DataTable
                columns={[
                  { key: 'name', label: t('nav.products'), render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-gray-400">{row.sku}</p></div> },
                  { key: 'stock', label: t('inventory.stock'), align: 'right', render: (row) => <span className={row.stock === 0 ? 'text-red-600 font-bold' : 'text-yellow-600'}>{row.stock}</span> },
                  { key: 'minStock', label: t('inventory.minStock'), align: 'right' },
                  { key: 'price', label: t('products.price'), align: 'right', render: (row) => formatVND(parseFloat(row.price)) },
                ]}
                data={lowStockItems}
              />
            </Card>
          )}

          {activeTab === 'lots' && (
            <Card title={t('inventory.lots.title')}>
              <DataTable columns={lotColumns} data={lots} />
            </Card>
          )}

          {activeTab === 'transfers' && (
            <Card title={t('inventory.transfers.title')}>
              <DataTable columns={transferColumns} data={transfers} />
            </Card>
          )}
        </>
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
                  <input type="text" value={lotSearch}
                    onChange={(e) => setLotSearch(e.target.value)}
                    placeholder={t('products.searchPlaceholder')}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
                  {lotProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {lotProducts.map((p: any) => (
                        <button key={p.id} onClick={() => { setLotForm(f => ({ ...f, productId: p.id })); setLotSearch(p.name); setLotProducts([]); }}
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
                  <span className="text-sm font-medium text-blue-700">{lotForm.productId}</span>
                  <button onClick={() => setLotForm(f => ({ ...f, productId: '' }))} className="text-blue-500 hover:text-blue-700 text-xs">{t('common.change')}</button>
                </div>
              )}
              <input type="text" value={lotForm.lotNumber} onChange={e => setLotForm(f => ({ ...f, lotNumber: e.target.value }))}
                placeholder={t('inventory.lots.lotNumber')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
              <input type="date" value={lotForm.expiryDate} onChange={e => setLotForm(f => ({ ...f, expiryDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
              <input type="number" value={lotForm.quantity} onChange={e => setLotForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                placeholder={t('inventory.lots.quantity')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
              <select value={lotForm.warehouseId} onChange={e => setLotForm(f => ({ ...f, warehouseId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white">
                <option value="">{t('inventory.lots.warehouse')}</option>
                {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowLotModal(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                {t('common.cancel')}
              </button>
              <button onClick={handleCreateLot} disabled={!lotForm.productId || !lotForm.lotNumber} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-sm">
                {t('common.save')}
              </button>
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
              <select value={transferForm.fromWarehouseId}
                onChange={e => setTransferForm(f => ({ ...f, fromWarehouseId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white">
                <option value="">{t('inventory.transfers.fromWarehouse')}</option>
                {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
              </select>
              <select value={transferForm.toWarehouseId}
                onChange={e => setTransferForm(f => ({ ...f, toWarehouseId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white">
                <option value="">{t('inventory.transfers.toWarehouse')}</option>
                {warehouses.filter(wh => wh.id !== transferForm.fromWarehouseId).map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
              </select>
              <textarea value={transferForm.notes} onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))}
                placeholder={t('inventory.reason')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowTransferModal(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                {t('common.cancel')}
              </button>
              <button onClick={handleCreateTransfer} disabled={!transferForm.fromWarehouseId || !transferForm.toWarehouseId} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-sm">
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}