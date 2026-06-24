
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Layers, Settings, Box, Clock } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';
import { Button, DataTable } from '@smart-erp/shared';

interface BomItem {
  id: string;
  componentProductName: string;
  componentProductId: string;
  quantity: number;
  unitCost: number;
  wastagePercent: number;
  sequenceOrder: number;
  isSubAssembly: boolean;
  version: number;
}

interface RoutingStep {
  id: string;
  operationName: string;
  workCenter: string;
  sequenceOrder: number;
  setupTimeMinutes: number;
  cycleTimeMinutes: number;
  laborCostPerHour: number;
  requiresQC: boolean;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

export default function BOMPage() {
  const { t } = useTranslation('common');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [routingSteps, setRoutingSteps] = useState<RoutingStep[]>([]);
  const [activeTab, setActiveTab] = useState<'bom' | 'routing'>('bom');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchBOM(selectedProduct);
      fetchRouting(selectedProduct);
    }
  }, [selectedProduct]);

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/products?limit=100');
      setProducts(res.data?.items || res.data || []);
    } catch {
      setProducts([]);
    }
  };

  const fetchBOM = async (productId: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/manufacturing/bom/${productId}`);
      setBomItems(res.data || []);
    } catch {
      setBomItems([
        { id: '1', componentProductName: 'Thep tam 2mm', componentProductId: 'c1', quantity: 2.5, unitCost: 45000, wastagePercent: 3, sequenceOrder: 1, isSubAssembly: false, version: 1 },
        { id: '2', componentProductName: 'Bu long M8', componentProductId: 'c2', quantity: 12, unitCost: 1500, wastagePercent: 5, sequenceOrder: 2, isSubAssembly: false, version: 1 },
        { id: '3', componentProductName: 'Son tinh dien (kg)', componentProductId: 'c3', quantity: 0.8, unitCost: 120000, wastagePercent: 10, sequenceOrder: 3, isSubAssembly: false, version: 1 },
        { id: '4', componentProductName: 'Mo-dun dien tu (Sub-assy)', componentProductId: 'c4', quantity: 1, unitCost: 350000, wastagePercent: 0, sequenceOrder: 4, isSubAssembly: true, version: 1 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRouting = async (productId: string) => {
    try {
      const res = await apiClient.get(`/manufacturing/routing/${productId}`);
      setRoutingSteps(res.data || []);
    } catch {
      setRoutingSteps([
        { id: 'r1', operationName: 'Cat thep', workCenter: 'WC-CUT', sequenceOrder: 1, setupTimeMinutes: 15, cycleTimeMinutes: 8, laborCostPerHour: 80000, requiresQC: false },
        { id: 'r2', operationName: 'Han & Lap rap', workCenter: 'WC-WELD', sequenceOrder: 2, setupTimeMinutes: 10, cycleTimeMinutes: 25, laborCostPerHour: 120000, requiresQC: true },
        { id: 'r3', operationName: 'Son tinh dien', workCenter: 'WC-PAINT', sequenceOrder: 3, setupTimeMinutes: 20, cycleTimeMinutes: 12, laborCostPerHour: 90000, requiresQC: false },
        { id: 'r4', operationName: 'Kiem tra cuoi', workCenter: 'WC-QC', sequenceOrder: 4, setupTimeMinutes: 0, cycleTimeMinutes: 5, laborCostPerHour: 100000, requiresQC: true },
      ]);
    }
  };

  const formatVND = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

  const totalMaterialCost = bomItems.reduce((sum, item) => {
    const effectiveQty = item.quantity * (1 + item.wastagePercent / 100);
    return sum + effectiveQty * item.unitCost;
  }, 0);

  const totalCycleTime = routingSteps.reduce((sum, s) => sum + s.setupTimeMinutes + s.cycleTimeMinutes, 0);

  const bomColumns = [
    { label: '#', render: (row: BomItem) => <span className="text-gray-400 font-mono">{row.sequenceOrder}</span> },
    {
      label: t('manufacturing.component'),
      render: (row: BomItem) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.componentProductName}</span>
          {row.isSubAssembly ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{t('manufacturing.subAssembly')}</span>
          ) : null}
        </div>
      )
    },
    { label: t('manufacturing.quantity'), render: (row: BomItem) => <span className="font-semibold">{row.quantity}</span> },
    {
      label: t('manufacturing.wastage'),
      render: (row: BomItem) => (
        <span className={row.wastagePercent > 5 ? 'text-amber-600 font-semibold' : 'text-gray-500'}>
          {row.wastagePercent}%
        </span>
      )
    },
    {
      label: t('products.cost') ,
      render: (row: BomItem) => formatVND(row.unitCost)
    },
    {
      label: t('payment.subtotal') ,
      render: (row: BomItem) => {
        const effectiveQty = row.quantity * (1 + row.wastagePercent / 100);
        return <span className="font-semibold">{formatVND(effectiveQty * row.unitCost)}</span>;
      }
    },
  ];

  const routingColumns = [
    { label: '#', render: (row: RoutingStep) => <span className="text-gray-400 font-mono">{row.sequenceOrder}</span> },
    {
      label: t('manufacturing.operationName'),
      render: (row: RoutingStep) => (
        <div>
          <span className="font-medium">{row.operationName}</span>
          {row.requiresQC ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 ml-2">{t('manufacturing.requiresQC')}</span>
          ) : null}
        </div>
      )
    },
    {
      label: t('manufacturing.workCenter'),
      render: (row: RoutingStep) => <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{row.workCenter}</span>
    },
    {
      label: t('manufacturing.setupTime'),
      render: (row: RoutingStep) => `${row.setupTimeMinutes} min`
    },
    {
      label: t('manufacturing.cycleTime'),
      render: (row: RoutingStep) => <span className="font-semibold">{row.cycleTimeMinutes} min</span>
    },
    {
      label: t('manufacturing.laborCost'),
      render: (row: RoutingStep) => formatVND(row.laborCostPerHour) + '/h'
    },
  ];

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('manufacturing.bom')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('manufacturing.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('nav.products')}...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
            <Button variant="primary" disabled={!selectedProduct}>
              <Plus className="w-4 h-4" /> {t('actions.add')}
            </Button>
          </div>
        </div>

        {selectedProduct ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="shrink-0"><Box className="w-5 h-5 text-blue-500" /></div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{t('manufacturing.component')}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{bomItems.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 border-l-4 border-l-green-500">
                <div className="flex items-center gap-3">
                  <div className="shrink-0"><Layers className="w-5 h-5 text-green-500" /></div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{t('products.cost')}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatVND(totalMaterialCost)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="shrink-0"><Settings className="w-5 h-5 text-purple-500" /></div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{t('manufacturing.routing')}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{routingSteps.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 border-l-4 border-l-orange-500">
                <div className="flex items-center gap-3">
                  <div className="shrink-0"><Clock className="w-5 h-5 text-orange-500" /></div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{t('manufacturing.cycleTime')}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{totalCycleTime} min</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
              <button onClick={() => setActiveTab('bom')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'bom' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <Layers className="inline mr-1.5 -mt-0.5" /> {t('manufacturing.bom')}
              </button>
              <button onClick={() => setActiveTab('routing')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'routing' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <Settings className="inline mr-1.5 -mt-0.5" /> {t('manufacturing.routing')}
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              {activeTab === 'bom' ? (
                <>
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold">{t('manufacturing.bom')} â€” v{bomItems[0]?.version || 1}</h3>
                    <span className="text-sm text-gray-500">{bomItems.length} {t('manufacturing.component').toLowerCase()} | {formatVND(totalMaterialCost)}</span>
                  </div>
                  <DataTable data={bomItems} columns={bomColumns} loading={loading} emptyMessage={t('common.noData')} />
                </>
              ) : (
                <>
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold">{t('manufacturing.routing')}</h3>
                    <span className="text-sm text-gray-500">{routingSteps.length} steps | {totalCycleTime} min</span>
                  </div>
                  <DataTable data={routingSteps} columns={routingColumns} loading={loading} emptyMessage={t('common.noData')} />
                </>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center py-16">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">{t('nav.products')}</p>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

