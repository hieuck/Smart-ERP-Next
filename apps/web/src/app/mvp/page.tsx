'use client';

import { BarChart3, Database, Package, ShoppingCart, Smartphone, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

const products = [
  { name: 'iPhone 15 Pro Max 256GB', sku: 'IP15-PM-256', category: 'Dien thoai', price: 33990000, stock: 18 },
  { name: 'MacBook Pro M3 14 inch', sku: 'MBP-M3-14', category: 'Laptop', price: 45990000, stock: 8 },
  { name: 'AirPods Pro 2', sku: 'APP-PRO-2', category: 'Phu kien', price: 5490000, stock: 34 },
  { name: 'Magic Keyboard Touch ID', sku: 'MK-BLU-TCH', category: 'Phu kien', price: 3990000, stock: 5 },
];

const orders = [
  { code: 'SO-2026-001', customer: 'Cong ty Minh Anh', total: 51580000, status: 'Da thanh toan' },
  { code: 'SO-2026-002', customer: 'Nguyen Thi Lan', total: 5490000, status: 'Dang xu ly' },
  { code: 'SO-2026-003', customer: 'Dai ly Sao Viet', total: 87960000, status: 'Cho giao' },
];

const formatVND = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

export default function WebMvpPage() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const revenue = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), []);
  const cartTotal = products.reduce((sum, product) => sum + product.price * (cart[product.sku] ?? 0), 0);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Smart ERP Next - Web MVP</h1>
            <p className="mt-1 text-sm text-slate-600">
              Dashboard, POS, san pham, don hang va CRM demo tren cung contract API/backend cua project.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <Database className="h-4 w-4" />
            Web, Android, iOS/Windows dung chung backend DB qua API
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric icon={<BarChart3 className="h-5 w-5" />} label="Doanh thu" value={formatVND(revenue)} />
          <Metric icon={<ShoppingCart className="h-5 w-5" />} label="Don hang" value={orders.length.toString()} />
          <Metric icon={<Package className="h-5 w-5" />} label="San pham" value={products.length.toString()} />
          <Metric icon={<Users className="h-5 w-5" />} label="Lead CRM" value="3" />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          <Panel title="POS nhanh">
            <div className="grid gap-3 md:grid-cols-2">
              {products.map((product) => (
                <button
                  key={product.sku}
                  onClick={() => setCart((current) => ({ ...current, [product.sku]: (current[product.sku] ?? 0) + 1 }))}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-slate-400"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-md bg-slate-200" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{product.name}</div>
                      <div className="text-xs text-slate-500">{product.sku} - {product.category}</div>
                      <div className="mt-2 font-semibold text-emerald-700">{formatVND(product.price)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Gio hang demo">
            <div className="space-y-3">
              {products.filter((product) => cart[product.sku]).map((product) => (
                <div key={product.sku} className="flex justify-between rounded-md border border-slate-200 p-3 text-sm">
                  <span>{product.name}</span>
                  <strong>x{cart[product.sku]}</strong>
                </div>
              ))}
              {cartTotal === 0 && <div className="rounded-md bg-slate-50 p-6 text-center text-sm text-slate-500">Chua co san pham</div>}
              <div className="border-t border-slate-200 pt-3 text-sm">
                <div className="flex justify-between"><span>Tong tien</span><strong>{formatVND(cartTotal)}</strong></div>
              </div>
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <Panel title="San pham co danh muc, SKU, anh dai dien">
            <Table columns={['Ten', 'SKU', 'Danh muc', 'Ton']} rows={products.map((p) => [p.name, p.sku, p.category, p.stock])} />
          </Panel>
          <Panel title="Don hang gan day">
            <Table columns={['Ma don', 'Khach hang', 'Gia tri', 'Trang thai']} rows={orders.map((o) => [o.code, o.customer, formatVND(o.total), o.status])} />
          </Panel>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-slate-600" />
            <div>
              <h2 className="font-semibold">Cross-platform MVP status</h2>
              <p className="text-sm text-slate-600">
                Android APK da build; iOS can macOS/Xcode hoac EAS signing; Windows native dung Tauri shell trong `apps/desktop`.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-medium uppercase">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: Array<Array<React.ReactNode>> }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
          {columns.map((column) => <th key={column} className="px-3 py-2">{column}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-b border-slate-100 last:border-0">
            {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-3">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
