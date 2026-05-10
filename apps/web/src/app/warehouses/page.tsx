'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/layout/AuthGuard';
import { useToast } from '@/components/providers/ToastProvider';
import { Warehouse, Plus, Edit, Trash2, Star, Check } from 'lucide-react';

interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function WarehousesPage() {
  const { t } = useTranslation('common');
  const { success, error: showError } = useToast();
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/edit modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', address: '', isDefault: false });
  const [saving, setSaving] = useState(false);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/warehouses');
      setWarehouses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWarehouses(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ code: '', name: '', address: '', isDefault: false });
    setShowModal(true);
  };

  const openEdit = (w: WarehouseItem) => {
    setEditId(w.id);
    setForm({ code: w.code, name: w.name, address: w.address ?? '', isDefault: w.isDefault });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await apiClient.patch(`/warehouses/${editId}`, form);
        success('Đã cập nhật kho');
      } else {
        await apiClient.post('/warehouses', form);
        success('Đã tạo kho mới');
      }
      setShowModal(false);
      fetchWarehouses();
    } catch (err: any) {
      showError(err.response?.data?.message ?? 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa kho này?')) return;
    try {
      await apiClient.delete(`/warehouses/${id}`);
      success('Đã xóa kho');
      fetchWarehouses();
    } catch (err: any) {
      showError(err.response?.data?.message ?? 'Xóa thất bại');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiClient.patch(`/warehouses/${id}`, { isDefault: true });
      success('Đã đặt làm kho mặc định');
      fetchWarehouses();
    } catch (err: any) {
      showError(err.response?.data?.message ?? 'Thất bại');
    }
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Warehouse className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('warehouses.title')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{warehouses.length} kho</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('warehouses.add')}
          </button>
        </div>

        {/* Warehouse cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Đang tải...
          </div>
        ) : warehouses.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Warehouse className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Chưa có kho nào. Tạo kho đầu tiên.</p>
            <button onClick={openCreate} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
              Tạo kho
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((w) => (
              <div key={w.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-5 ${
                w.isDefault
                  ? 'border-blue-300 dark:border-blue-700 ring-1 ring-blue-200 dark:ring-blue-800'
                  : 'border-gray-200 dark:border-gray-700'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${w.isDefault ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <Warehouse className={`w-4 h-4 ${w.isDefault ? 'text-blue-600' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{w.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{w.code}</p>
                    </div>
                  </div>
                  {w.isDefault && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
                      <Star className="w-3 h-3" />
                      Mặc định
                    </span>
                  )}
                </div>

                {w.address && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 truncate">{w.address}</p>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {!w.isDefault && (
                    <button
                      onClick={() => handleSetDefault(w.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                      title="Đặt làm mặc định"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mặc định
                    </button>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => openEdit(w)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                    title="Sửa"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editId ? 'Sửa kho' : t('warehouses.add')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('warehouses.code')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  required
                  placeholder="KHO-001"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('warehouses.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Kho chính"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('warehouses.address')}
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Địa chỉ kho..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('warehouses.isDefault')}
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm">
                  Hủy
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-sm disabled:opacity-50">
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
