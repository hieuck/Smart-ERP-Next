'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';

interface BomItem {
  id: string;
  componentProductId: string;
  componentProductName: string;
  quantity: number;
  unitCost?: number;
  wastagePercent?: number;
}

export default function BOMPage() {
  const { t } = useTranslation('common');
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState('1');

  useEffect(() => {
    fetchBOM();
  }, [productId]);

  const fetchBOM = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/manufacturing/bom/${productId}`);
      setBomItems(res.data || []);
    } catch {
      setBomItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium">Product ID:</label>
          <input
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          />
          <button onClick={fetchBOM} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            {t('actions.search.title')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">{t('common.loading')}</div>
        ) : bomItems.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No BOM items found</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Component</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Wastage %</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bomItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">{item.componentProductName}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{item.unitCost ?? '-'}</td>
                    <td className="px-4 py-3 text-right">{item.wastagePercent ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}