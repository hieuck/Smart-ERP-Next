"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { usersApi } from "@/lib/api-client";
import AuthGuard from "@/components/layout/AuthGuard";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@smart-erp/hooks";
import { ConfirmDialog } from "@smart-erp/ui";
import { Users, Plus, Edit, Trash2, Search, Shield } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string;
  createdAt: string;
}

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  admin: {
    label: "Quản trị viên",
    color: "text-red-700",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  manager: {
    label: "Quản lý",
    color: "text-purple-700",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  accountant: {
    label: "Kế toán",
    color: "text-blue-700",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  warehouse: {
    label: "Thủ kho",
    color: "text-orange-700",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  sales: {
    label: "Bán hàng",
    color: "text-green-700",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  user: {
    label: "Nhân viên",
    color: "text-gray-700",
    bg: "bg-gray-100 dark:bg-gray-700",
  },
};

const ROLES = Object.entries(ROLE_CONFIG).map(([value, { label }]) => ({
  value,
  label,
}));

export default function UsersPage() {
  const { t } = useTranslation("common");
  const { success, error: showError } = useToast();
  const {
    confirm,
    isOpen: confirmOpen,
    options: confirmOptions,
    resolve: confirmResolve,
  } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    byRole: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create/edit modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "user",
    password: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async (q = search) => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.allSettled([
        usersApi.getAll(q || undefined),
        usersApi.getStats(),
      ]);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value.data);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ email: "", name: "", role: "user", password: "" });
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditId(u.id);
    setForm({ email: u.email, name: u.name ?? "", role: u.role, password: "" });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        const data: any = { name: form.name, role: form.role };
        if (form.password) data.password = form.password;
        await usersApi.update(editId, data);
        success("Đã cập nhật người dùng");
      } else {
        await usersApi.create({
          email: form.email,
          name: form.name,
          role: form.role,
          password: form.password,
        });
        success("Đã tạo người dùng");
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      showError(err.response?.data?.message ?? "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: t("common.confirmDeleteTitle"),
      message: t("common.confirmDeleteMessage"),
      variant: "danger",
      confirmLabel: t("actions.delete"),
      cancelLabel: t("actions.cancel"),
    });
    if (!ok) return;
    try {
      await usersApi.delete(id);
      success("Đã xóa người dùng");
      fetchUsers();
    } catch (err: any) {
      showError(err.response?.data?.message ?? "Xóa thất bại");
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white";

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
              <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("users.title")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stats?.total ?? 0} người dùng
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t("users.add")}
          </button>
        </div>

        {/* Stats by role */}
        {stats && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byRole).map(([role, count]) => {
              const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.user;
              return (
                <div
                  key={role}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
                >
                  <Shield className="w-3 h-3" />
                  {cfg.label}: {count}
                </div>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên, email..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
            >
              Tìm
            </button>
          </form>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg
              className="animate-spin w-6 h-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {t('common.loading', 'Loading...') }
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Người dùng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                      Vai trò
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      Ngày tạo
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-gray-400"
                      >
                        Không có người dùng nào
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const roleCfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.user;
                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                                  {(u.name ?? u.email).charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {u.name ?? "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                            {u.email}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${roleCfg.bg} ${roleCfg.color}`}
                            >
                              <Shield className="w-3 h-3" />
                              {roleCfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-400">
                            {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => openEdit(u)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                                title="Sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(u.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editId ? "Sửa người dùng" : t("users.add")}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("users.email")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    required
                    placeholder="user@example.com"
                    className={inputClass}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("users.name")}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Họ tên"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("users.role")} <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value }))
                  }
                  className={inputClass}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {editId
                    ? "Mật khẩu mới (để trống nếu không đổi)"
                    : "Mật khẩu *"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  required={!editId}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-sm disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
