'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { productsApi, type Product } from '@/lib/api-products';
import AuthGuard from '@/components/layout/AuthGuard';
import { ArrowLeft, Printer } from 'lucide-react';

export default function BarcodePrintPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (ids.length === 0) { setLoading(false); return; }
      try {
        const results = await Promise.allSettled(ids.map((id) => productsApi.getById(id)));
        setProducts(results.filter((r) => r.status === 'fulfilled').map((r: any) => r.value));
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [ids]);

  useEffect(() => {
    if (!loading && products.length > 0 && typeof window !== 'undefined') {
      import('jsbarcode').then((mod) => {
        const JsBarcode = mod.default || mod;
        products.forEach((p) => {
          const el = document.getElementById(`barcode-${p.id}`);
          if (el) {
            try { JsBarcode(el, p.sku, { format: 'CODE128', width: 2, height: 60, displayValue: true, fontSize: 14 }); } catch { /* invalid SKU */ }
          }
        });
      });
    }
  }, [loading, products]);

  const handlePrint = () => { window.print(); };

  if (loading) return <AuthGuard><div className="p-6 text-center text-gray-400">Loading...</div></AuthGuard>;

  return (
    <AuthGuard>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 no-print">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /> Back</button>
          {products.length > 0 && <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Printer className="w-4 h-4" /> Print Labels</button>}
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg font-medium">No products selected</p>
            <p className="text-sm mt-1">Select products from the product list to print barcode labels.</p>
          </div>
        ) : (
          <div ref={printRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" id="labels-container">
            {products.map((p) => (
              <div key={p.id} className="border border-gray-200 rounded-lg p-4 text-center print:border print:shadow-none">
                <p className="text-xs font-bold text-gray-800 truncate mb-1">{p.name}</p>
                <svg id={`barcode-${p.id}`} className="mx-auto"></svg>
                <p className="text-sm font-bold text-blue-600 mt-1">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(p.price))}</p>
                <p className="text-xs text-gray-400">{p.sku}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          #labels-container > div { page-break-inside: avoid; }
        }
      `}</style>
    </AuthGuard>
  );
}
