'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import { Upload, CheckCircle, XCircle } from 'lucide-react';

export default function ImportProductsPage() {
  const { t } = useTranslation('common');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiClient.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message );
    } finally {
      setUploading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">{t('products.importTitle')}</h1>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full border rounded-lg p-2 dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">
              Required columns: sku, name, price (VND). Optional: description, category, unit, cost, stock, minStock, isActive.
            </p>
          </div>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? t('common.loading') : t('actions.import')}
          </button>

          {result && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" /> Created: {result.created}
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <CheckCircle className="w-4 h-4" /> Updated: {result.updated}
              </div>
              {result.errors.length > 0 && (
                <div className="text-red-600 text-sm">
                  <p className="font-medium">Errors:</p>
                  <ul className="list-disc pl-5">
                    {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    {result.errors.length > 10 && <li>... and {result.errors.length - 10} more</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}


