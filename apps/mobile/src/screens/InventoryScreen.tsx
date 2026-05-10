import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { api } from "../lib/api";
import { formatVND } from "@smart-erp/utils";

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number | null;
  unit: string | null;
  price: string;
}

interface InventorySummary {
  totalProducts: number;
  totalUnits: number;
  totalValue: number;
  outOfStock: number;
  lowStock: number;
}

export default function InventoryScreen() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "lowstock">("summary");

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, lowStockData] = await Promise.allSettled([
        api.get<InventorySummary>("/inventory/summary"),
        api.get<LowStockItem[]>("/inventory/low-stock"),
      ]);
      if (summaryData.status === "fulfilled") setSummary(summaryData.value);
      if (lowStockData.status === "fulfilled")
        setLowStockItems(lowStockData.value);
    } catch (err) {
      console.error("Inventory fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab selector */}
      <View style={styles.tabRow}>
        {[
          { key: "summary" as const, label: "Tổng quan" },
          {
            key: "lowstock" as const,
            label: `Sắp hết (${lowStockItems.length})`,
          },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "summary" && summary && (
        <FlatList
          data={[
            {
              label: "Tổng sản phẩm",
              value: summary.totalProducts.toLocaleString("vi-VN"),
              color: "#3b82f6",
            },
            {
              label: "Tổng đơn vị",
              value: summary.totalUnits.toLocaleString("vi-VN"),
              color: "#10b981",
            },
            {
              label: "Giá trị tồn kho",
              value: formatVND(summary.totalValue),
              color: "#8b5cf6",
            },
            {
              label: "Sắp hết hàng",
              value: summary.lowStock.toString(),
              color: summary.lowStock > 0 ? "#f59e0b" : "#10b981",
              danger: summary.lowStock > 0,
            },
            {
              label: "Hết hàng",
              value: summary.outOfStock.toString(),
              color: summary.outOfStock > 0 ? "#ef4444" : "#10b981",
              danger: summary.outOfStock > 0,
            },
          ]}
          keyExtractor={(item) => item.label}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3b82f6"
            />
          }
          renderItem={({ item }) => (
            <View style={[styles.summaryCard, { borderLeftColor: item.color }]}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text
                style={[
                  styles.summaryValue,
                  item.danger && { color: item.color },
                ]}
              >
                {item.value}
              </Text>
            </View>
          )}
        />
      )}

      {activeTab === "lowstock" && (
        <FlatList
          data={lowStockItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3b82f6"
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>Tất cả sản phẩm đều đủ hàng</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOut = item.stock === 0;
            return (
              <View
                style={[styles.lowStockCard, isOut && styles.outOfStockCard]}
              >
                <View style={styles.lowStockLeft}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.productSku}>{item.sku}</Text>
                </View>
                <View style={styles.lowStockRight}>
                  <View
                    style={[
                      styles.stockBadge,
                      { backgroundColor: isOut ? "#fee2e2" : "#fef3c7" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stockText,
                        { color: isOut ? "#dc2626" : "#d97706" },
                      ]}
                    >
                      {isOut ? "Hết hàng" : `Còn ${item.stock}`}
                    </Text>
                  </View>
                  <Text style={styles.minStock}>
                    Tối thiểu: {item.minStock ?? 0}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  loadingText: { marginTop: 8, color: "#9ca3af", fontSize: 14 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: "#6b7280", fontSize: 14 },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  tabActive: { backgroundColor: "#eff6ff" },
  tabText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  tabTextActive: { color: "#2563eb", fontWeight: "700" },
  list: { padding: 16, gap: 10 },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryLabel: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: "700", color: "#111827" },
  lowStockCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  outOfStockCard: { borderWidth: 1, borderColor: "#fecaca" },
  lowStockLeft: { flex: 1, marginRight: 12 },
  productName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  productSku: {
    fontSize: 11,
    color: "#9ca3af",
    fontFamily: "monospace",
    marginTop: 2,
  },
  lowStockRight: { alignItems: "flex-end", gap: 4 },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stockText: { fontSize: 12, fontWeight: "700" },
  minStock: { fontSize: 11, color: "#9ca3af" },
});
