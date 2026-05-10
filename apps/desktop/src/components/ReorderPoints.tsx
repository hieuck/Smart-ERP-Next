import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface ReorderSuggestion {
  id: string;
  name: string;
  sku: string;
  stock: number;
  min_stock: number;
  reorder_quantity: number;
  suggested_order_quantity: number;
}

export default function ReorderPoints() {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const result = await invoke<ReorderSuggestion[]>('get_reorder_suggestions');
      setSuggestions(result);
    } catch (err) {
      console.error(err);
      alert('Failed to load reorder suggestions');
    } finally {
      setLoading(false);
    }
  };

  const updateReorderPoint = async (productId: string, minStock?: number, reorderQuantity?: number) => {
    setUpdating(productId);
    try {
      await invoke('update_reorder_point', { productId, minStock, reorderQuantity });
      await fetchSuggestions();
    } catch (err) {
      console.error(err);
      alert('Update failed');
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Reorder Points</h1>
      {suggestions.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No products need reordering</div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <p className="text-sm text-gray-500">{item.sku}</p>
                </div>
                <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  Stock: {item.stock}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reorder Point</label>
                  <input
                    type="number"
                    value={item.min_stock}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      updateReorderPoint(item.id, val, item.reorder_quantity);
                    }}
                    disabled={updating === item.id}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reorder Quantity</label>
                  <input
                    type="number"
                    value={item.reorder_quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      updateReorderPoint(item.id, item.min_stock, val);
                    }}
                    disabled={updating === item.id}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Suggested Order</label>
                  <div className="mt-1 text-lg font-bold text-blue-600">
                    {item.suggested_order_quantity > 0 ? item.suggested_order_quantity : '—'}
                  </div>
                </div>
                {updating === item.id && (
                  <div className="flex items-center justify-end">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
