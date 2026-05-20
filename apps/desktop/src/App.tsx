import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Calculator,
  CheckCircle2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Users,
  Warehouse,
  Wifi,
  WifiOff,
} from 'lucide-react';

type Screen = 'overview' | 'pos' | 'products' | 'orders' | 'crm' | 'inventory' | 'accounting';

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  imageUrl?: string;
  price: number;
  stock: number;
  minStock: number;
};

type CartLine = {
  product: Product;
  quantity: number;
};

const products: Product[] = [
  { id: 'p1', name: 'iPhone 15 Pro Max 256GB', sku: 'IP15-PM-256', category: 'Dien thoai', price: 33990000, stock: 18, minStock: 6 },
  { id: 'p2', name: 'MacBook Pro M3 14 inch', sku: 'MBP-M3-14', category: 'Laptop', price: 45990000, stock: 8, minStock: 4 },
  { id: 'p3', name: 'AirPods Pro 2', sku: 'APP-PRO-2', category: 'Phu kien', price: 5490000, stock: 34, minStock: 10 },
  { id: 'p4', name: 'Magic Keyboard Touch ID', sku: 'MK-BLU-TCH', category: 'Phu kien', price: 3990000, stock: 5, minStock: 8 },
  { id: 'p5', name: 'Dell UltraSharp 27 4K', sku: 'DELL-U2723QE', category: 'Man hinh', price: 12690000, stock: 11, minStock: 3 },
];

const orders = [
  { code: 'SO-2026-001', customer: 'Cong ty Minh Anh', total: 51580000, status: 'Da thanh toan', channel: 'POS' },
  { code: 'SO-2026-002', customer: 'Nguyen Thi Lan', total: 5490000, status: 'Dang xu ly', channel: 'Web' },
  { code: 'SO-2026-003', customer: 'Dai ly Sao Viet', total: 87960000, status: 'Cho giao', channel: 'B2B' },
];

const leads = [
  { name: 'Tran Hoang Nam', company: 'Nam Phat Retail', value: 125000000, stage: 'Qualified' },
  { name: 'Le Thu Ha', company: 'Ha Linh Trading', value: 76000000, stage: 'Contacted' },
  { name: 'Pham Quoc Viet', company: 'Viet Tech', value: 210000000, stage: 'Proposal' },
];

const navItems: Array<{ key: Screen; label: string; icon: React.ReactNode }> = [
  { key: 'overview', label: 'Tong quan', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'pos', label: 'POS', icon: <ShoppingCart className="h-4 w-4" /> },
  { key: 'products', label: 'San pham', icon: <Package className="h-4 w-4" /> },
  { key: 'orders', label: 'Don hang', icon: <CheckCircle2 className="h-4 w-4" /> },
  { key: 'crm', label: 'CRM', icon: <Users className="h-4 w-4" /> },
  { key: 'inventory', label: 'Kho', icon: <Warehouse className="h-4 w-4" /> },
  { key: 'accounting', label: 'Ke toan', icon: <Calculator className="h-4 w-4" /> },
];

const formatVND = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

export default function DesktopApp() {
  const [activeScreen, setActiveScreen] = useState<Screen>('overview');
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState(new Date());

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((product) =>
      [product.name, product.sku, product.category].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [search]);

  const cartTotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const lowStock = products.filter((product) => product.stock <= product.minStock);
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (!existing) return [...current, { product, quantity: 1 }];
      return current.map((line) =>
        line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line,
      );
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((current) =>
      current
        .map((line) => (line.product.id === productId ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0),
    );
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-950">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-lg font-semibold tracking-normal">Smart ERP Next</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            {online ? <Wifi className="h-3.5 w-3.5 text-emerald-600" /> : <WifiOff className="h-3.5 w-3.5 text-amber-600" />}
            {online ? 'Online mode' : 'Offline mode'}
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveScreen(item.key)}
              className={cx(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition',
                activeScreen === item.key
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
          Native Windows MVP - Tauri
          <div>Last sync: {lastSync.toLocaleTimeString('vi-VN')}</div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">{navItems.find((item) => item.key === activeScreen)?.label}</h1>
            <p className="text-sm text-slate-500">Du lieu demo local, san sang noi backend API khi cau hinh production.</p>
          </div>
          <button
            type="button"
            onClick={() => setLastSync(new Date())}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Sync now
          </button>
        </header>

        <div className="p-6">
          {activeScreen === 'overview' && (
            <Overview revenue={revenue} lowStockCount={lowStock.length} cartTotal={cartTotal} />
          )}
          {activeScreen === 'pos' && (
            <PosScreen
              products={filteredProducts}
              cart={cart}
              cartTotal={cartTotal}
              search={search}
              setSearch={setSearch}
              addToCart={addToCart}
              updateQuantity={updateQuantity}
              clearCart={() => setCart([])}
            />
          )}
          {activeScreen === 'products' && <ProductsScreen products={filteredProducts} search={search} setSearch={setSearch} />}
          {activeScreen === 'orders' && <OrdersScreen />}
          {activeScreen === 'crm' && <CrmScreen />}
          {activeScreen === 'inventory' && <InventoryScreen lowStock={lowStock} />}
          {activeScreen === 'accounting' && <AccountingScreen revenue={revenue} />}
        </div>
      </main>
    </div>
  );
}

function Overview({ revenue, lowStockCount, cartTotal }: { revenue: number; lowStockCount: number; cartTotal: number }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Metric label="Doanh thu" value={formatVND(revenue)} tone="emerald" />
        <Metric label="Don hang" value={orders.length.toString()} tone="blue" />
        <Metric label="Khach hang tiem nang" value={leads.length.toString()} tone="violet" />
        <Metric label="Can nhap kho" value={lowStockCount.toString()} tone={lowStockCount > 0 ? 'amber' : 'slate'} />
      </div>

      <div className="grid grid-cols-[1.3fr_0.7fr] gap-4">
        <Panel title="Don hang gan day">
          <SimpleTable
            columns={['Ma don', 'Khach hang', 'Kenh', 'Gia tri', 'Trang thai']}
            rows={orders.map((order) => [order.code, order.customer, order.channel, formatVND(order.total), order.status])}
          />
        </Panel>
        <Panel title="POS dang mo">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Gio hang hien tai</span><strong>{formatVND(cartTotal)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">San pham active</span><strong>{products.length}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">SKU tu sinh</span><strong>Da bat</strong></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function PosScreen({
  products,
  cart,
  cartTotal,
  search,
  setSearch,
  addToCart,
  updateQuantity,
  clearCart,
}: {
  products: Product[];
  cart: CartLine[];
  cartTotal: number;
  search: string;
  setSearch: (value: string) => void;
  addToCart: (product: Product) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_380px] gap-4">
      <Panel title="Ban hang nhanh">
        <SearchBox value={search} onChange={setSearch} placeholder="Tim ten, SKU hoac danh muc" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => addToCart(product)}
              className="rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-slate-400"
            >
              <div className="h-10 w-10 rounded-md bg-slate-200" />
              <div className="mt-3 truncate font-medium">{product.name}</div>
              <div className="text-xs text-slate-500">{product.sku}</div>
              <div className="mt-2 font-semibold text-emerald-700">{formatVND(product.price)}</div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={`Gio hang (${cart.length})`}>
        <div className="space-y-3">
          {cart.length === 0 && <div className="rounded-md bg-slate-50 p-6 text-center text-sm text-slate-500">Chua co san pham</div>}
          {cart.map((line) => (
            <div key={line.product.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{line.product.name}</div>
                <div className="text-xs text-slate-500">{formatVND(line.product.price)}</div>
              </div>
              <div className="flex items-center gap-2">
                <IconButton label="Giam" onClick={() => updateQuantity(line.product.id, -1)}><Minus className="h-4 w-4" /></IconButton>
                <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
                <IconButton label="Tang" onClick={() => updateQuantity(line.product.id, 1)}><Plus className="h-4 w-4" /></IconButton>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="flex justify-between text-sm"><span className="text-slate-500">Tam tinh</span><strong>{formatVND(cartTotal)}</strong></div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={clearCart}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Trash2 className="h-4 w-4" />
            Thanh toan demo
          </button>
        </div>
      </Panel>
    </div>
  );
}

function ProductsScreen({ products, search, setSearch }: { products: Product[]; search: string; setSearch: (value: string) => void }) {
  return (
    <Panel title="Danh muc san pham">
      <SearchBox value={search} onChange={setSearch} placeholder="Tim san pham" />
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <SimpleTable
          columns={['Anh', 'Ten', 'SKU', 'Danh muc', 'Gia', 'Ton kho']}
          rows={products.map((product) => [
            <div className="h-8 w-8 rounded bg-slate-200" />,
            product.name,
            product.sku,
            product.category,
            formatVND(product.price),
            `${product.stock} / min ${product.minStock}`,
          ])}
        />
      </div>
    </Panel>
  );
}

function OrdersScreen() {
  return (
    <Panel title="Quan ly don hang">
      <SimpleTable
        columns={['Ma don', 'Khach hang', 'Kenh', 'Gia tri', 'Trang thai']}
        rows={orders.map((order) => [order.code, order.customer, order.channel, formatVND(order.total), order.status])}
      />
    </Panel>
  );
}

function CrmScreen() {
  return (
    <Panel title="CRM pipeline">
      <SimpleTable
        columns={['Lead', 'Cong ty', 'Gia tri co hoi', 'Giai doan']}
        rows={leads.map((lead) => [lead.name, lead.company, formatVND(lead.value), lead.stage])}
      />
    </Panel>
  );
}

function InventoryScreen({ lowStock }: { lowStock: Product[] }) {
  return (
    <Panel title="Canh bao ton kho">
      <SimpleTable
        columns={['San pham', 'SKU', 'Danh muc', 'Ton hien tai', 'Muc toi thieu']}
        rows={lowStock.map((product) => [product.name, product.sku, product.category, product.stock, product.minStock])}
      />
    </Panel>
  );
}

function AccountingScreen({ revenue }: { revenue: number }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Metric label="Doanh thu ghi nhan" value={formatVND(revenue)} tone="emerald" />
      <Metric label="Cong no phai thu" value={formatVND(94000000)} tone="amber" />
      <Metric label="Dong tien kha dung" value={formatVND(286000000)} tone="blue" />
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'blue' | 'violet' | 'amber' | 'slate' }) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
  };
  return (
    <div className={cx('rounded-lg border p-4', tones[tone])}>
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-500"
      />
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function SimpleTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
          {columns.map((column) => <th key={column} className="px-3 py-2 font-semibold">{column}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b border-slate-100 last:border-0">
            {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-3">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
