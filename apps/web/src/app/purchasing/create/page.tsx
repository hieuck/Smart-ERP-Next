
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { productsApi, type Product } from '@/lib/api-products';
import AuthGuard from '@/components/layout/AuthGuard';
import { ArrowLeft, Save, Search, Plus, Trash2, ShoppingBag } from 'lucide-react';

interface Supplier { id: string; code: string; name: string; }
interface CartItem {
  productId: string;
  productName: string;
  productSku: string;
  unit: string;
  orderedQty: number;
  unitCost: number;
  lineTotal: number;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export default function CreatePurchaseOrderPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Header fields
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');

  // Supplier search
  const [supplierSearch, setSupplierSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [showProductDrop, setShowProductDrop] = useState(false);

  // Items
  const [items, setItems] = useState<CartItem[]>([]);

  // Supplier search
  useEffect(() => {
    if (!supplierSearch.trim()) { setSuppliers([]); return; }
    const timer = setTimeout(async () => {
      const res = await apiClient.get('/suppliers', { params: { search: supplierSearch, limit: 6 } });
      setSuppliers(res.data.items ?? []);
      setShowSupplierDrop(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [supplierSearch]);

  // Product search
  useEffect(() => {
    if (!productSearch.trim()) { setProductResults([]); return; }
    const timer = setTimeout(async () => {
      const res = await productsApi.getAll({ search: productSearch, limit: 8, isActive: true });
      setProductResults(res.data?.items ?? res.items);
      setShowProductDrop(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const addProduct = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, orderedQty: i.orderedQty + 1, lineTotal: (i.orderedQty + 1) * i.unitCost }
            : i
        );
      }
      const unitCost = parseFloat(product.cost as any) || 0;
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          unit: product.unit ?? 'piece',
          orderedQty: 1,
          unitCost,
          lineTotal: unitCost,
        },
      ];
    });
    setProductSearch('');
    setProductResults([]);
    setShowProductDrop(false);
  };

  const updateItem = (productId: string, field: 'orderedQty' | 'unitCost', value: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const updated = { ...i, [field]: value };
        updated.lineTotal = updated.orderedQty * updated.unitCost;
        return updated;
      })
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { setError('Vui lòng thêm ít nhất 1 sản phẩm'); return; }
    setError('');
    setSaving(true);
    try {
      await apiClient.post('/purchasing', {
        supplierId: supplierId || undefined,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          orderedQty: i.orderedQty,
          unitCost: i.unitCost,
        })),
      });
      router.push('/purchasing');
    } catch (err: any) {
      setError(err.response?.data?.message ?? t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/purchasing')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('purchasing.add')}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Product search */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Thêm sản phẩm
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Tìm sản phẩm theo tên, SKU..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  {showProductDrop && productResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
                      {productResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addProduct(p)}
                          className="w-full px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm flex items-center justify-between"
                        >
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                            <span className="text-gray-400 ml-2 text-xs font-mono">{p.sku}</span>
                          </div>
                          <span className="text-gray-500 text-xs">Tồn: {p.stock}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Items table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Danh sách sản phẩm ({items.length})
                  </h2>
                </div>
                {items.length === 0 ? (
                  <div className="px-5 py-10 text-center text-gray-400 text-sm">
                    Chưa có sản phẩm nào. Tìm và thêm sản phẩm ở trên.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">SL đặt</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Giá nhập</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Thành tiền</th>
                          <th className="px-4 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {items.map((item) => (
                          <tr key={item.productId}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                              <p className="text-xs text-gray-400 font-mono">{item.productSku}</p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                value={item.orderedQty}
                                onChange={(e) => updateItem(item.productId, 'orderedQty', parseInt(e.target.value) || 1)}
                                min={1}
                                className="w-20 px-2 py-1 text-right border border-gray-200 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                value={item.unitCost}
                                onChange={(e) => updateItem(item.productId, 'unitCost', parseFloat(e.target.value) || 0)}
                                min={0}
                                step={1000}
                                className="w-28 px-2 py-1 text-right border border-gray-200 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                              {formatVND(item.lineTotal)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button type="button" onClick={() => removeItem(item.productId)}
                                className="text-red-400 hover:text-red-600 transition">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Header info + summary */}
            <div className="space-y-4">
              {/* Supplier */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  {t('purchasing.supplier')}
                </h2>
                <div className="relative">
                  {selectedSupplier ? (
                    <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg">
                      <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                        {selectedSupplier.name}
                      </span>
                      <button type="button" onClick={() => { setSelectedSupplier(null); setSupplierId(''); setSupplierSearch(''); }}
                        className="text-indigo-400 hover:text-indigo-600 text-xs">Đổi</button>
                    </div>
                  ) : (
                    <>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        placeholder="Tìm nhà cung cấp..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      {showSupplierDrop && suppliers.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                          {suppliers.map((s) => (
                            <button key={s.id} type="button"
                              onClick={() => { setSelectedSupplier(s); setSupplierId(s.id); setSupplierSearch(''); setShowSupplierDrop(false); }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                              <span className="font-medium">{s.name}</span>
                              <span className="text-gray-400 ml-2 text-xs">{s.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Dates & notes */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('purchasing.expectedDate')}
                  </label>
                  <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ghi chú</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    rows={3} placeholder="Ghi chú đơn nhập..." className={inputClass} />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <span>Số sản phẩm</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span>Tổng tiền</span>
                  <span className="text-indigo-600">{formatVND(subtotal)}</span>
                </div>
              </div>

              <button type="submit" disabled={saving || items.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold rounded-xl transition">
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Tạo đơn nhập'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}


