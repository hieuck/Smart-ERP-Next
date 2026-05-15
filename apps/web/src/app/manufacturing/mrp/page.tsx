'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuthGuard from '@/components/layout/AuthGuard';
import { apiClient } from '@/lib/api-client';

interface MRPResult {
  productId: number;
  productName: string;
  netRequirement: number;
  suggestedProduction: number;
  rawMaterialGap: number;
  bomComponents: { componentProductName: string; gap: number }[];
}

export default function MRPPage() {
  const { t } = useTranslation('common');
  const [results, setResults] = useState<MRPResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runMRP = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/mrp/calculate-batch', { daysAhead: 30 });
      setResults(res.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{t('mrp.title')}</h2>
          <button onClick={runMRP} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
            {loading ? t('common.loading') : t('mrp.batchMRP')}
          </button>
        </div>

        {results.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">Click "Run Batch MRP" to calculate material requirements</div>
        )}

        {results.length > 0 && (
          <div className="grid gap-4">
            {results.map((r) => (
              <div key={r.productId} className={`bg-white rounded-xl shadow p-4 border-l-4 ${r.netRequirement > 0 ? 'border-red-500' : 'border-green-500'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{r.productName}</h3>
                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">{t('mrp.netRequirement')}: </span>
                        <span className="font-bold">{r.netRequirement}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('mrp.suggestedProduction')}: </span>
                        <span className="font-bold">{r.suggestedProduction}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('mrp.rawMaterialGap')}: </span>
                        <span className={`font-bold ${r.rawMaterialGap > 0 ? 'text-red-600' : 'text-green-600'}`}>{r.rawMaterialGap}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {r.bomComponents.filter(c => c.gap > 0).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-1">{t('mrp.bomComponents')}:</p>
                    {r.bomComponents.filter(c => c.gap > 0).map((c, i) => (
                      <span key={i} className="inline-block px-2 py-1 mr-2 mb-1 text-xs bg-red-50 text-red-700 rounded">
                        {c.componentProductName}: -{c.gap}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}