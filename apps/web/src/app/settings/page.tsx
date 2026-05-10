"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { i18n } from "@smart-erp/i18n";
import AuthGuard from "@/components/layout/AuthGuard";
import { useToast } from "@/components/providers/ToastProvider";
import {
  Settings,
  Building2,
  Globe,
  Bell,
  Shield,
  Palette,
  ChevronRight,
  Save,
  Check,
  Sun,
  Moon,
} from "lucide-react";

type SettingsTab =
  | "company"
  | "general"
  | "notifications"
  | "security"
  | "appearance";

const TABS: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "company",
    label: "Thông tin công ty",
    icon: <Building2 className="w-4 h-4" />,
  },
  { key: "general", label: "Chung", icon: <Globe className="w-4 h-4" /> },
  {
    key: "notifications",
    label: "Thông báo",
    icon: <Bell className="w-4 h-4" />,
  },
  { key: "security", label: "Bảo mật", icon: <Shield className="w-4 h-4" /> },
  {
    key: "appearance",
    label: "Giao diện",
    icon: <Palette className="w-4 h-4" />,
  },
];

const inputClass =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white";

export default function SettingsPage() {
  const { t } = useTranslation("common");
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>("company");

  const [company, setCompany] = useState({
    name: "Công ty TNHH Smart ERP",
    address: "123 Đường ABC, Quận 1, TP. Hồ Chí Minh",
    phone: "028 1234 5678",
    email: "info@smarterp.vn",
    taxCode: "0123456789",
    website: "https://smarterp.vn",
  });

  const [general, setGeneral] = useState({
    language: i18n.language ?? "vi",
    currency: "VND",
    timezone: "Asia/Ho_Chi_Minh",
    dateFormat: "DD/MM/YYYY",
  });

  const [notifications, setNotifications] = useState({
    lowStockAlert: true,
    newOrderAlert: true,
    paymentAlert: true,
    emailNotifications: false,
    browserNotifications: true,
  });

  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const handleSave = () => {
    // Apply language change immediately
    if (general.language !== i18n.language) {
      i18n.changeLanguage(general.language);
      localStorage.setItem("language", general.language);
    }
    success(t("common.success"));
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("settings.title")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Cấu hình hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            <Save className="w-4 h-4" />
            {t("actions.save")}
          </button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <div className="w-52 flex-shrink-0">
            <nav className="space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    activeTab === tab.key
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {tab.icon}
                    {tab.label}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            {/* Company */}
            {activeTab === "company" && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                  {t("settings.company")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      key: "name",
                      label: t("settings.companyName"),
                      type: "text",
                    },
                    {
                      key: "taxCode",
                      label: t("settings.companyTaxCode"),
                      type: "text",
                    },
                    {
                      key: "phone",
                      label: t("settings.companyPhone"),
                      type: "tel",
                    },
                    {
                      key: "email",
                      label: t("settings.companyEmail"),
                      type: "email",
                    },
                    { key: "website", label: "Website", type: "url" },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        value={(company as any)[field.key]}
                        onChange={(e) =>
                          setCompany((c) => ({
                            ...c,
                            [field.key]: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("settings.companyAddress")}
                    </label>
                    <textarea
                      value={company.address}
                      onChange={(e) =>
                        setCompany((c) => ({ ...c, address: e.target.value }))
                      }
                      rows={2}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* General */}
            {activeTab === "general" && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                  {t("settings.general")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("settings.language")}
                    </label>
                    <select
                      value={general.language}
                      onChange={(e) =>
                        setGeneral((g) => ({ ...g, language: e.target.value }))
                      }
                      className={inputClass}
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("settings.currency")}
                    </label>
                    <select
                      value={general.currency}
                      onChange={(e) =>
                        setGeneral((g) => ({ ...g, currency: e.target.value }))
                      }
                      className={inputClass}
                    >
                      <option value="VND">VND — Đồng Việt Nam</option>
                      <option value="USD">USD — US Dollar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("settings.timezone")}
                    </label>
                    <select
                      value={general.timezone}
                      onChange={(e) =>
                        setGeneral((g) => ({ ...g, timezone: e.target.value }))
                      }
                      className={inputClass}
                    >
                      <option value="Asia/Ho_Chi_Minh">
                        Asia/Ho_Chi_Minh (UTC+7)
                      </option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("settings.dateFormat")}
                    </label>
                    <select
                      value={general.dateFormat}
                      onChange={(e) =>
                        setGeneral((g) => ({
                          ...g,
                          dateFormat: e.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === "notifications" && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                  {t("settings.notifications")}
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      key: "lowStockAlert",
                      label: "Cảnh báo sắp hết hàng",
                      desc: "Thông báo khi tồn kho dưới mức tối thiểu",
                    },
                    {
                      key: "newOrderAlert",
                      label: "Đơn hàng mới",
                      desc: "Thông báo khi có đơn hàng mới",
                    },
                    {
                      key: "paymentAlert",
                      label: "Thanh toán",
                      desc: "Thông báo khi nhận được thanh toán",
                    },
                    {
                      key: "emailNotifications",
                      label: "Thông báo qua email",
                      desc: "Gửi email cho các sự kiện quan trọng",
                    },
                    {
                      key: "browserNotifications",
                      label: "Thông báo trình duyệt",
                      desc: "Hiển thị thông báo trên trình duyệt",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications((n) => ({
                            ...n,
                            [item.key]: !(n as any)[item.key],
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          (notifications as any)[item.key]
                            ? "bg-blue-600"
                            : "bg-gray-200 dark:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            (notifications as any)[item.key]
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === "security" && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                  {t("settings.security")}
                </h2>
                <div className="space-y-4 max-w-sm">
                  {[
                    { key: "current", label: "Mật khẩu hiện tại" },
                    { key: "next", label: "Mật khẩu mới" },
                    { key: "confirm", label: "Xác nhận mật khẩu mới" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {f.label}
                      </label>
                      <input
                        type="password"
                        value={(passwords as any)[f.key]}
                        onChange={(e) =>
                          setPasswords((p) => ({
                            ...p,
                            [f.key]: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      if (passwords.next !== passwords.confirm) {
                        alert("Mật khẩu không khớp");
                        return;
                      }
                      success("Đã đổi mật khẩu");
                      setPasswords({ current: "", next: "", confirm: "" });
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                  >
                    Đổi mật khẩu
                  </button>
                </div>
              </div>
            )}

            {/* Appearance */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                  {t("settings.general")} — Giao diện
                </h2>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Chủ đề
                  </p>
                  <div className="flex gap-3">
                    {[
                      {
                        key: "light",
                        label: "Sáng",
                        icon: <Sun className="w-4 h-4" />,
                        action: () => {
                          document.documentElement.classList.remove("dark");
                          localStorage.setItem("theme", "light");
                        },
                      },
                      {
                        key: "dark",
                        label: "Tối",
                        icon: <Moon className="w-4 h-4" />,
                        action: () => {
                          document.documentElement.classList.add("dark");
                          localStorage.setItem("theme", "dark");
                        },
                      },
                      {
                        key: "system",
                        label: "Hệ thống",
                        icon: null,
                        action: () => {
                          localStorage.removeItem("theme");
                          const d = window.matchMedia(
                            "(prefers-color-scheme: dark)",
                          ).matches;
                          document.documentElement.classList.toggle("dark", d);
                        },
                      },
                    ].map((theme) => (
                      <button
                        key={theme.key}
                        onClick={theme.action}
                        className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                      >
                        {theme.icon}
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {theme.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Màu chủ đạo
                  </p>
                  <div className="flex gap-2">
                    {[
                      "#3b82f6",
                      "#10b981",
                      "#8b5cf6",
                      "#f59e0b",
                      "#ef4444",
                      "#06b6d4",
                    ].map((color) => (
                      <button
                        key={color}
                        style={{ backgroundColor: color }}
                        className="w-8 h-8 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-gray-400 transition"
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
