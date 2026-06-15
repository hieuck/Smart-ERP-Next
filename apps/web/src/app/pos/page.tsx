// @ts-nocheck
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { productsApi, resolveProductImageUrl, type Product } from '@/lib/api-products';
import { customersApi, type Customer } from '@/lib/api-customers';
import { ordersApi } from '@/lib/api-orders';
import AuthGuard from '@/components/layout/AuthGuard';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  X,
  Check,
  Package,
  ChevronDown,
  Printer,
} from 'lucide-react';

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  quantity: number;
  discount: number; // amount
  lineTotal: number;
}

type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'momo' | 'vnpay' | 'zalopay';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { key: 'cash', label: 'Tiền mặt', icon: <Banknote className="w-4 h-4" /> },
  { key: 'bank_transfer', label: 'Chuyển khoản', icon: <CreditCard className="w-4 h-4" /> },
  { key: 'card', label: 'Thẻ', icon: <CreditCard className="w-4 h-4" /> },
  { key: 'momo', label: 'MoMo', icon: <Smartphone className="w-4 h-4" /> },
  { key: 'vnpay', label: 'VNPay', icon: <Smartphone className="w-4 h-4" /> },
  { key: 'zalopay', label: 'ZaloPay', icon: <Smartphone className="w-4 h-4" /> },
];

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export default function POSPage() {
  const { t } = useTranslation('common');
  const router = useRouter();

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderDiscount, setOrderDiscount] = useState(0); // amount
  const [orderDiscountType, setOrderDiscountType] = useState<'amount' | 'percent'>('amount');

  // Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ── Product search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!productSearch.trim()) {
      setProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const res = await productsApi.getAll({ search: productSearch, limit: 12, isActive: true });
        setProducts(res.data?.items ?? res.items);
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // ── Customer search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomers([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await customersApi.getAll({ search: customerSearch, limit: 6 });
        setCustomers(res.data.items);
        setShowCustomerDropdown(true);
      } catch {
        setCustomers([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // ── Cart helpers ────────────────────────────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    const price = parseFloat(product.price);
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, lineTotal: (i.quantity + 1) * i.price - i.discount }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit ?? 'piece',
          price,
          quantity: 1,
          discount: 0,
          lineTotal: price,
        },
      ];
    });
    setProductSearch('');
    setProducts([]);
    searchRef.current?.focus();
  }, []);

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const qty = Math.max(1, i.quantity + delta);
          return { ...i, quantity: qty, lineTotal: qty * i.price - i.discount };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateItemDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const d = Math.min(discount, i.price * i.quantity);
        return { ...i, discount: d, lineTotal: i.quantity * i.price - d };
      })
    );
  };

  // ── Totals ──────────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.lineTotal, 0);
  const discountAmount =
    orderDiscountType === 'percent'
      ? Math.round((subtotal * orderDiscount) / 100)
      : orderDiscount;
  const total = Math.max(0, subtotal - discountAmount);
  const change = paymentMethod === 'cash' ? Math.max(0, cashReceived - total) : 0;

  // ── Submit order ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await ordersApi.create({
        customerId: selectedCustomer?.id,
        channel: 'pos',
        paymentMethod,
        discountAmount,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.price,
          discountAmount: i.discount,
        })),
      });
      setLastOrder(res.data);
      setShowPaymentModal(false);
      setShowSuccessModal(true);
      // Reset
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setOrderDiscount(0);
      setCashReceived(0);
    } catch (err) {
      console.error('Failed to create order:', err);
      alert(t('pos.createOrderFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintLastOrder = () => {
    if (!lastOrder?.id) return;
    setShowSuccessModal(false);
    router.push(`/orders/${lastOrder.id}/invoice?print=1`);
  };

  return (
    <AuthGuard>
      <div className="flex h-[calc(100vh-57px)] overflow-hidden bg-gray-100 dark:bg-gray-900">
        {/* ── Left: Product search + grid ─────────────────────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-gray-200 dark:border-gray-700">
          {/* Search bar */}
          <div className="flex-shrink-0 bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Tìm sản phẩm theo tên, SKU, mã vạch... (F2)"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                autoFocus
              />
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                Đang tìm...
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-left hover:border-blue-400 hover:shadow-md transition-all group"
                  >
                    <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-md mb-2 flex items-center justify-center overflow-hidden group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                      {product.imageUrl ? (
                        <Image src={resolveProductImageUrl(product.imageUrl)} alt="" width={120} height={120} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <Package className="w-8 h-8 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2 leading-tight">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{product.sku}</p>
                    <p className="text-sm font-bold text-blue-600 mt-1">
                      {formatVND(parseFloat(product.price))}
                    </p>
                    <p className={`text-xs mt-0.5 ${product.stock <= (product.minStock ?? 0) ? 'text-red-500' : 'text-gray-400'}`}>
                      Tồn: {product.stock}
                    </p>
                  </button>
                ))}
              </div>
            ) : productSearch ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Package className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">{t('products.notFound')}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Search className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">{t('products.searchPrompt')}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Cart + payment ────────────────────────────────────────── */}
        <div className="flex flex-col w-96 bg-white dark:bg-gray-800">
          {/* Customer selector */}
          <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={selectedCustomer ? selectedCustomer.name : customerSearch}
                onChange={(e) => {
                  setSelectedCustomer(null);
                  setCustomerSearch(e.target.value);
                }}
                placeholder="Khách lẻ (tìm khách hàng...)"
                className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              {selectedCustomer && (
                <button
                  onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {showCustomerDropdown && customers.length > 0 && !selectedCustomer && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch('');
                        setShowCustomerDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                      {c.phone && <span className="text-gray-400 ml-2">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Giỏ hàng trống</p>
                <p className="text-xs mt-1">Tìm và chọn sản phẩm để thêm</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {cart.map((item) => (
                  <div key={item.productId} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-400">{item.sku}</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="flex-shrink-0 text-gray-300 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {/* Qty controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQty(item.productId, -1)}
                          className="w-7 h-7 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.productId, 1)}
                          className="w-7 h-7 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      {/* Price */}
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatVND(item.lineTotal)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatVND(item.price)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                    {/* Item discount */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Giảm:</span>
                      <input
                        type="number"
                        value={item.discount || ''}
                        onChange={(e) => updateItemDiscount(item.productId, parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min={0}
                        className="w-24 px-2 py-0.5 text-xs border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order summary + payment */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-3 space-y-2">
            {/* Order discount */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">Giảm đơn:</span>
              <input
                type="number"
                value={orderDiscount || ''}
                onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                min={0}
                className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={() => setOrderDiscountType((t) => (t === 'amount' ? 'percent' : 'amount'))}
                className="flex-shrink-0 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                {orderDiscountType === 'amount' ? '₫' : '%'}
              </button>
            </div>

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Tạm tính</span>
                <span>{formatVND(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá</span>
                  <span>-{formatVND(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-gray-700">
                <span>Tổng cộng</span>
                <span className="text-blue-600">{formatVND(total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-3 gap-1">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPaymentMethod(m.key)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border text-xs transition ${
                    paymentMethod === m.key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {m.icon}
                  <span className="truncate w-full text-center">{m.label}</span>
                </button>
              ))}
            </div>

            {/* Cash received */}
            {paymentMethod === 'cash' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">Tiền nhận:</span>
                <input
                  type="number"
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  placeholder={total.toString()}
                  min={0}
                  step={1000}
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
            {paymentMethod === 'cash' && cashReceived > 0 && (
              <div className="flex justify-between text-sm font-medium text-green-600">
                <span>Tiền thừa</span>
                <span>{formatVND(change)}</span>
              </div>
            )}

            {/* Quick cash buttons */}
            {paymentMethod === 'cash' && (
              <div className="flex gap-1 flex-wrap">
                {[50_000, 100_000, 200_000, 500_000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setCashReceived((p) => p + v)}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    +{(v / 1000).toFixed(0)}k
                  </button>
                ))}
                <button
                  onClick={() => setCashReceived(total)}
                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded hover:bg-blue-200 transition"
                >
                  Đủ tiền
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold rounded-xl transition text-base flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Thanh toán {cart.length > 0 && `(${cart.length} SP)`}
            </button>
          </div>
        </div>
      </div>

      {/* ── Payment confirmation modal ─────────────────────────────────────── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Xác nhận thanh toán</h2>
            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Khách hàng</span>
                <span className="font-medium">{selectedCustomer?.name ?? 'Khách lẻ'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Số sản phẩm</span>
                <span className="font-medium">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phương thức</span>
                <span className="font-medium">{PAYMENT_METHODS.find((m) => m.key === paymentMethod)?.label}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-blue-600 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span>Tổng cộng</span>
                <span>{formatVND(total)}</span>
              </div>
              {paymentMethod === 'cash' && cashReceived > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Tiền thừa</span>
                  <span>{formatVND(change)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50"
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success modal ──────────────────────────────────────────────────── */}
      {showSuccessModal && lastOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Thanh toán thành công</h2>
            <p className="text-gray-500 text-sm mb-1">Mã đơn: <span className="font-mono font-bold text-blue-600">{lastOrder.code}</span></p>
            <p className="text-2xl font-bold text-blue-600 mb-6">{formatVND(parseFloat(lastOrder.total))}</p>
            <div className="flex gap-3">
              <button
                onClick={handlePrintLastOrder}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                In hóa đơn
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
              >
                Đơn mới
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}

