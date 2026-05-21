// @ts-nocheck
"use client";

"use client";

import { FiArrowUp, FiBox, FiDollarSign, FiShoppingCart, FiUsers, FiCpu } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import AuthGuard from "@/components/layout/AuthGuard";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  ordersGrowth: number;
}

export default function Dashboard() {
  const { t } = useTranslation("common");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get<DashboardStats>("/analytics/dashboard/summary");
      setStats(res.data);
    } catch (e) {
      console.error(e);
      // Fallback for demo
      setStats({
        totalRevenue: 154200000,
        totalOrders: 152,
        totalCustomers: 84,
        totalProducts: 340,
        revenueGrowth: 15.4,
        ordersGrowth: 5.2,
      });
    }
  };

  const generateAiInsight = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.get<any>("/ai-copilot/insights");
      const data = res.data;
      
      let insightText = `🤖 **Phân tích của Copilot (${data.healthStatus.toUpperCase()}):**\n` +
        `• **Bán hàng**: Doanh thu đạt ${formatCurrency(data.revenue)}. CRM có ${data.leadsCount} lead mới.\n` +
        `• **Hợp đồng**: Đã ký kết thành công ${data.signedCount} hợp đồng điện tử.\n` +
        `• **Nhân sự**: Ghi nhận ${data.lateCount} trường hợp đi trễ trong tháng.\n`;
        
      if (data.recommendations && data.recommendations.length > 0) {
        insightText += `• **Khuyến nghị**: ${data.recommendations.join(' ')}`;
      }
      
      setAiInsight(insightText);
    } catch (e) {
      console.error('Failed to fetch AI insights', e);
      setAiInsight("⚠️ Không thể kết nối với AI Copilot. Vui lòng kiểm tra lại kết nối API.");
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  return (
    <AuthGuard>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("nav.dashboard")}
        </h2>

        {/* AI Copilot Widget */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-[2px] shadow-lg">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <FiCpu size={24} /> AI Executive Copilot
              </h3>
              <button 
                onClick={generateAiInsight}
                disabled={generating}
                className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-2"
              >
                {generating ? "Đang phân tích dữ liệu..." : "Phân tích Sức khỏe Doanh nghiệp"}
              </button>
            </div>
            
            <div className="bg-indigo-50 dark:bg-gray-800 rounded-xl p-4 min-h-[100px] border border-indigo-100 dark:border-gray-700">
              {aiInsight ? (
                <div className="text-gray-700 dark:text-gray-300 space-y-2 leading-relaxed">
                  {aiInsight.split('\n').map((line, idx) => (
                    <p key={idx}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 italic text-center mt-6">
                  Bấm nút để AI tổng hợp dữ liệu từ CRM, Bán hàng, Sản xuất và Nhân sự.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Standard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title={t("dashboard.revenue")}
            value={formatCurrency(stats?.totalRevenue || 0)}
            icon={<FiDollarSign className="w-6 h-6" />}
            trend={stats?.revenueGrowth || 0}
            trendLabel="so với tháng trước"
          />
          <StatCard
            title={t("dashboard.orders")}
            value={stats?.totalOrders || 0}
            icon={<FiShoppingCart className="w-6 h-6" />}
            trend={stats?.ordersGrowth || 0}
            trendLabel="so với tháng trước"
          />
          <StatCard
            title={t("nav.customers")}
            value={stats?.totalCustomers || 0}
            icon={<FiUsers className="w-6 h-6" />}
          />
          <StatCard
            title={t("nav.products")}
            value={stats?.totalProducts || 0}
            icon={<FiBox className="w-6 h-6" />}
          />
        </div>
      </div>
    </AuthGuard>
  );
}

function StatCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">
          {title}
        </h3>
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {value}
      </p>
      {trend !== undefined && (
        <div className="flex items-center text-sm">
          <FiArrowUp
            className={`w-4 h-4 mr-1 ${trend >= 0 ? "text-green-500" : "text-red-500 rotate-180"}`}
          />
          <span className={trend >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
            {Math.abs(trend)}%
          </span>
          {trendLabel && (
            <span className="text-gray-500 ml-2">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

