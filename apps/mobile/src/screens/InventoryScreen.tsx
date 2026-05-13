import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity,
  TextInput, Alert,
} from "react-native";
import { useTranslation } from "@smart-erp/i18n";
import { api } from "../lib/api";
import { formatVND } from "@smart-erp/utils";
import { Picker } from "@react-native-picker/picker";

type InventoryTab = "summary" | "lowstock" | "lots" | "transfers";

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  price: string;
  stock: number;
  minStock: number | null;
  unit: string | null;
}

interface InventorySummary {
  totalProducts: number;
  totalUnits: number;
  totalValue: number;
  outOfStock: number;
  lowStock: number;
}

interface Lot {
  id: string;
  lotNumber: string;
  productId: string;
  quantity: number;
  remainingQuantity: number;
  expiryDate: string | null;
  warehouseId: string | null;
}

interface Transfer {
  id: string;
  transferCode: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: string;
  createdAt: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

const TRANSFER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Nháp", color: "#6b7280" },
  approved: { label: "Đã duyệt", color: "#3b82f6" },
  shipped: { label: "Đã giao", color: "#f59e0b" },
  received: { label: "Đã nhận", color: "#10b981" },
  cancelled: { label: "Đã hủy", color: "#ef4444" },
};

export default function InventoryScreen() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<InventoryTab>("summary");

  // Lot form state
  const [showLotModal, setShowLotModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lotNumber, setLotNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [lotQuantity, setLotQuantity] = useState("1");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // Transfer form state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromWh, setFromWh] = useState("");
  const [toWh, setToWh] = useState("");
  const [transferNotes, setTransferNotes] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, lowStockData, lotsData, transfersData, whData] =
        await Promise.allSettled([
          api.get<InventorySummary>("/inventory/summary"),
          api.get<LowStockItem[]>("/inventory/low-stock"),
          api.get<Lot[]>("/inventory/lots"),
          api.get<Transfer[]>("/inventory/transfers"),
          api.get<Warehouse[]>("/warehouses"),
        ]);
      if (summaryData.status === "fulfilled") setSummary(summaryData.value);
      if (lowStockData.status === "fulfilled") setLowStockItems(lowStockData.value);
      if (lotsData.status === "fulfilled") setLots(lotsData.value);
      if (transfersData.status === "fulfilled") setTransfers(transfersData.value);
      if (whData.status === "fulfilled") setWarehouses(whData.value);
    } catch (err) {
      console.error("Inventory fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const searchProducts = async (query: string) => {
    setProductSearch(query);
    if (!query.trim()) {
      setProducts([]);
      return;
    }
    try {
      const res = await api.get<{ items: Product[] }>("/products", {
        params: { search: query, limit: 6, isActive: true },
      });
      setProducts(Array.isArray(res.items) ? res.items : []);
    } catch {
      setProducts([]);
    }
  };

  const handleCreateLot = async () => {
    if (!selectedProduct || !lotNumber.trim() || parseInt(lotQuantity) <= 0) {
      Alert.alert(t("common.error"), t("inventory.lots.lotNumber"));
      return;
    }
    try {
      await api.post("/inventory/lots", {
        productId: selectedProduct.id,
        lotNumber: lotNumber.trim(),
        expiryDate: expiryDate || undefined,
        quantity: parseInt(lotQuantity),
        warehouseId: selectedWarehouse || undefined,
      });
      setShowLotModal(false);
      setSelectedProduct(null);
      setLotNumber("");
      setExpiryDate("");
      setLotQuantity("1");
      setSelectedWarehouse("");
      setProducts([]);
      fetchData();
    } catch (err: any) {
      Alert.alert(t("common.error"), err.response?.data?.message || "Failed to create lot");
    }
  };

  const handleCreateTransfer = async () => {
    if (!fromWh || !toWh) {
      Alert.alert(t("common.error"), t("inventory.transfers.fromWarehouse"));
      return;
    }
    if (fromWh === toWh) {
      Alert.alert(t("common.error"), "Cannot transfer to the same warehouse");
      return;
    }
    try {
      await api.post("/inventory/transfers", {
        fromWarehouseId: fromWh,
        toWarehouseId: toWh,
        notes: transferNotes.trim() || undefined,
        items: [],
      });
      setShowTransferModal(false);
      setFromWh("");
      setToWh("");
      setTransferNotes("");
      fetchData();
    } catch (err: any) {
      Alert.alert(t("common.error"), err.response?.data?.message || "Failed to create transfer");
    }
  };

  const handleTransferAction = async (id: string, action: string) => {
    try {
      await api.patch(`/inventory/transfers/${id}/${action}`);
      fetchData();
    } catch (err: any) {
      Alert.alert(t("common.error"), err.response?.data?.message || `Failed to ${action}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("inventory.title")}</Text>
        <Text style={styles.headerSub}>{t("inventory.summary")}</Text>
      </View>

      {/* Summary cards */}
      {summary && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { label: t("inventory.totalProducts"), value: summary.totalProducts, color: "#3b82f6" },
            { label: t("inventory.totalUnits"), value: summary.totalUnits, color: "#10b981" },
            { label: t("inventory.lowStock"), value: summary.lowStock, color: summary.lowStock > 0 ? "#f59e0b" : "#10b981" },
            { label: t("inventory.outOfStock"), value: summary.outOfStock, color: summary.outOfStock > 0 ? "#ef4444" : "#10b981" },
          ]}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={styles.summaryList}
          renderItem={({ item }: any) => (
            <View style={[styles.summaryCard, { borderLeftColor: item.color }]}>
              <Text style={[styles.summaryValue, { color: item.danger ? item.color : undefined }]}>
                {item.value}
              </Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          )}
        />
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[
          { key: "summary" as const, label: t("inventory.summary") },
          { key: "lowstock" as const, label: `${t("inventory.lowStock")} (${lowStockItems.length})` },
          { key: "lots" as const, label: `${t("inventory.lots.title")} (${lots.length})` },
          { key: "transfers" as const, label: `${t("inventory.transfers.title")} (${transfers.length})` },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === "summary" && summary && (
        <View style={styles.summaryDetail}>
          {[
            { icon: "📦", label: t("inventory.totalProducts"), value: summary.totalProducts },
            { icon: "🔢", label: t("inventory.totalUnits"), value: summary.totalUnits },
            { icon: "💰", label: t("inventory.stockValue"), value: formatVND(summary.totalValue) },
            { icon: "⚠️", label: t("inventory.lowStock"), value: summary.lowStock },
            { icon: "❌", label: t("inventory.outOfStock"), value: summary.outOfStock },
          ].map((item: any, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>{item.icon}</Text>
              <Text style={styles.summaryDetailLabel}>{item.label}</Text>
              <Text style={styles.summaryDetailValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}

      {activeTab === "lowstock" && (
        <FlatList
          data={lowStockItems}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{t("inventory.allStockOK")}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOut = item.stock === 0;
            return (
              <View style={[styles.lowStockCard, isOut && styles.outOfStockCard]}>
                <View style={styles.lowStockLeft}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productSku}>{item.sku}</Text>
                </View>
                <View style={styles.lowStockRight}>
                  <View style={[styles.stockBadge, { backgroundColor: isOut ? "#fee2e2" : "#fef3c7" }]}>
                    <Text style={[styles.stockText, { color: isOut ? "#dc2626" : "#d97706" }]}>
                      {isOut ? t("inventory.outOfStock") : `${t("inventory.stock")}: ${item.stock}`}
                    </Text>
                  </View>
                  <Text style={styles.minStock}>{t("inventory.minStock")}: {item.minStock ?? 0}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {activeTab === "lots" && (
        <FlatList
          data={lots}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{t("inventory.noTransactions")}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
            return (
              <View style={[styles.lotCard, isExpired && styles.expiredCard]}>
                <View style={styles.lotHeader}>
                  <Text style={styles.lotNumber}>{item.lotNumber}</Text>
                  {isExpired && <Text style={styles.expiredBadge}>{t("inventory.lots.expired")}</Text>}
                </View>
                <View style={styles.lotRow}>
                  <Text style={styles.lotLabel}>{t("inventory.lots.quantity")}:</Text>
                  <Text style={styles.lotValue}>{item.quantity}</Text>
                  <Text style={styles.lotLabel}>| {t("inventory.lots.remainingQuantity")}:</Text>
                  <Text style={[styles.lotValue, item.remainingQuantity === 0 && styles.zeroQuantity]}>
                    {item.remainingQuantity}
                  </Text>
                </View>
                {item.expiryDate && (
                  <Text style={styles.expiryText}>
                    {t("inventory.lots.expiryDate")}: {new Date(item.expiryDate).toLocaleDateString("vi-VN")}
                  </Text>
                )}
              </View>
            );
          }}
          ListFooterComponent={
            <TouchableOpacity style={styles.addButton} onPress={() => setShowLotModal(true)}>
              <Text style={styles.addButtonText}>+ {t("inventory.lots.add")}</Text>
            </TouchableOpacity>
          }
        />
      )}

      {activeTab === "transfers" && (
        <FlatList
          data={transfers}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{t("inventory.noTransactions")}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusCfg = TRANSFER_STATUS_MAP[item.status] || TRANSFER_STATUS_MAP.draft;
            return (
              <View style={styles.transferCard}>
                <View style={styles.transferHeader}>
                  <Text style={styles.transferCode}>{item.transferCode}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusCfg.color }]}>
                    <Text style={styles.statusText}>{t(statusCfg.label)}</Text>
                  </View>
                </View>
                <View style={styles.transferRow}>
                  <Text style={styles.transferLabel}>{t("inventory.transfers.fromWarehouse")}:</Text>
                  <Text style={styles.transferValue}>{item.fromWarehouseId?.slice(0, 8)}…</Text>
                </View>
                <View style={styles.transferRow}>
                  <Text style={styles.transferLabel}>{t("inventory.transfers.toWarehouse")}:</Text>
                  <Text style={styles.transferValue}>{item.toWarehouseId?.slice(0, 8)}…</Text>
                </View>
                <Text style={styles.transferDate}>
                  {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                </Text>
                {item.status === "draft" && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleTransferAction(item.id, "approve")}>
                    <Text style={styles.actionButtonText}>{t("inventory.transfers.approve")}</Text>
                  </TouchableOpacity>
                )}
                {item.status === "approved" && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: "#f59e0b" }]}
                    onPress={() => handleTransferAction(item.id, "ship")}>
                    <Text style={styles.actionButtonText}>{t("inventory.transfers.ship")}</Text>
                  </TouchableOpacity>
                )}
                {item.status === "shipped" && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: "#10b981" }]}
                    onPress={() => handleTransferAction(item.id, "receive")}>
                    <Text style={styles.actionButtonText}>{t("inventory.transfers.receive")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListFooterComponent={
            <TouchableOpacity style={styles.addButton} onPress={() => setShowTransferModal(true)}>
              <Text style={styles.addButtonText}>+ {t("inventory.transfers.add")}</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* Lot Modal */}
      {showLotModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("inventory.lots.add")}</Text>

            {/* Product search */}
            <TextInput
              value={productSearch}
              onChangeText={searchProducts}
              placeholder={t("products.searchPlaceholder")}
              style={styles.input}
            />
            {products.length > 0 && (
              <View style={styles.dropdown}>
                {products.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => {
                      setSelectedProduct(p);
                      setProductSearch(p.name);
                      setProducts([]);
                    }}
                    style={styles.dropdownItem}>
                    <Text style={styles.dropdownName}>{p.name}</Text>
                    <Text style={styles.dropdownSku}>{p.sku} · {t("inventory.stock")}: {p.stock}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {selectedProduct && (
              <View style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>{selectedProduct.name}</Text>
                <TouchableOpacity onPress={() => { setSelectedProduct(null); setProductSearch(""); }}>
                  <Text style={styles.selectedChipRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            <TextInput
              value={lotNumber}
              onChangeText={setLotNumber}
              placeholder={t("inventory.lots.lotNumber")}
              style={styles.input}
            />
            <TextInput
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder={t("inventory.lots.expiryDate")}
              style={styles.input}
            />
            <TextInput
              value={lotQuantity}
              onChangeText={setLotQuantity}
              placeholder={t("inventory.lots.quantity")}
              keyboardType="numeric"
              style={styles.input}
            />

            {/* Warehouse picker */}
            <Text style={styles.pickerLabel}>{t("inventory.lots.warehouse")}</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedWarehouse}
                onValueChange={(value) => setSelectedWarehouse(value)}
                style={styles.picker}>
                <Picker.Item label={t("inventory.transfers.fromWarehouse")} value="" />
                {warehouses.map((wh) => (
                  <Picker.Item key={wh.id} label={wh.name} value={wh.id} />
                ))}
              </Picker>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowLotModal(false)}>
                <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (!selectedProduct || !lotNumber.trim()) && styles.disabledButton]}
                onPress={handleCreateLot}>
                <Text style={styles.saveButtonText}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("inventory.transfers.add")}</Text>

            <Text style={styles.pickerLabel}>{t("inventory.transfers.fromWarehouse")}</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={fromWh}
                onValueChange={setFromWh}
                style={styles.picker}>
                <Picker.Item label={t("inventory.transfers.fromWarehouse")} value="" />
                {warehouses.map((wh) => (
                  <Picker.Item key={wh.id} label={wh.name} value={wh.id} />
                ))}
              </Picker>
            </View>

            <Text style={styles.pickerLabel}>{t("inventory.transfers.toWarehouse")}</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={toWh}
                onValueChange={setToWh}
                style={styles.picker}>
                <Picker.Item label={t("inventory.transfers.toWarehouse")} value="" />
                {warehouses.filter((wh) => wh.id !== fromWh).map((wh) => (
                  <Picker.Item key={wh.id} label={wh.name} value={wh.id} />
                ))}
              </Picker>
            </View>

            <TextInput
              value={transferNotes}
              onChangeText={setTransferNotes}
              placeholder={t("inventory.reason")}
              style={styles.input}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowTransferModal(false)}>
                <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (!fromWh || !toWh) && styles.disabledButton]}
                onPress={handleCreateTransfer}>
                <Text style={styles.saveButtonText}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  loadingText: { marginTop: 8, color: "#9ca3af", fontSize: 14 },
  emptyText: { color: "#6b7280", fontSize: 14 },
  header: { padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  headerSub: { fontSize: 13, color: "#6b7280", marginTop: 2 },

  // Summary list (horizontal)
  summaryList: { padding: 12, gap: 10 },
  summaryCard: {
    width: 140, padding: 14, backgroundColor: "#fff", borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  summaryValue: { fontSize: 20, fontWeight: "700", color: "#111827" },
  summaryLabel: { fontSize: 11, color: "#6b7280", marginTop: 2 },

  // Summary detail
  summaryDetail: { padding: 16 },
  summaryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  summaryIcon: { fontSize: 20, marginRight: 12 },
  summaryDetailLabel: { flex: 1, fontSize: 14, color: "#374151" },
  summaryDetailValue: { fontSize: 15, fontWeight: "600", color: "#111827" },

  // Tabs
  tabRow: {
    flexDirection: "row", backgroundColor: "#e5e7eb", padding: 4, borderRadius: 10,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: "#6366f1" },
  tabText: { fontSize: 11, color: "#6b7280", fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "700" },

  // List
  list: { padding: 12 },
  lowStockCard: {
    backgroundColor: "#fff", borderRadius: 10, padding: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  outOfStockCard: { borderWidth: 1, borderColor: "#fecaca" },
  lowStockLeft: { flex: 1, marginRight: 8 },
  productName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  productSku: { fontSize: 11, color: "#9ca3af", fontFamily: "monospace" },
  lowStockRight: { alignItems: "flex-end", gap: 3 },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  stockText: { fontSize: 11, fontWeight: "700" },
  minStock: { fontSize: 10, color: "#9ca3af" },

  // Lot cards
  lotCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 8 },
  expiredCard: { borderWidth: 1, borderColor: "#fecaca" },
  lotHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lotNumber: { fontSize: 14, fontWeight: "700", fontFamily: "monospace", color: "#111827" },
  expiredBadge: { fontSize: 10, color: "#dc2626", fontWeight: "700" },
  lotRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  lotLabel: { fontSize: 12, color: "#6b7280" },
  lotValue: { fontSize: 13, fontWeight: "600", color: "#111827", marginLeft: 4 },
  zeroQuantity: { color: "#dc2626" },
  expiryText: { fontSize: 11, color: "#6b7280", marginTop: 6 },

  // Transfer cards
  transferCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 8 },
  transferHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  transferCode: { fontSize: 13, fontWeight: "700", fontFamily: "monospace", color: "#3b82f6" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  transferRow: { flexDirection: "row", marginTop: 8, alignItems: "center" },
  transferLabel: { fontSize: 11, color: "#6b7280", width: 100 },
  transferValue: { fontSize: 12, color: "#111827", fontWeight: "500" },
  transferDate: { fontSize: 10, color: "#9ca3af", marginTop: 6, textAlign: "right" },
  actionButton: {
    marginTop: 10, paddingVertical: 8, borderRadius: 8,
    backgroundColor: "#3b82f6", alignItems: "center",
  },
  actionButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // Add buttons
  addButton: {
    backgroundColor: "#eff6ff", paddingVertical: 14, borderRadius: 10,
    alignItems: "center", marginTop: 8,
  },
  addButtonText: { color: "#3b82f6", fontSize: 14, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "100%",
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827", marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8,
    padding: 10, fontSize: 14, marginBottom: 10, color: "#111827",
  },
  dropdown: { backgroundColor: "#f9fafb", borderRadius: 8, marginBottom: 8 },
  dropdownItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  dropdownName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  dropdownSku: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  selectedChip: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#eff6ff", padding: 8, borderRadius: 8, marginBottom: 8,
  },
  selectedChipText: { fontSize: 13, color: "#2563eb", fontWeight: "600" },
  selectedChipRemove: { fontSize: 16, color: "#6b7280" },
  pickerLabel: { fontSize: 12, color: "#374151", marginBottom: 4, fontWeight: "500" },
  pickerWrapper: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, marginBottom: 10, overflow: "hidden" },
  picker: { height: 40 },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelButton: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: "#d1d5db", alignItems: "center",
  },
  cancelButtonText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  saveButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#3b82f6", alignItems: "center" },
  disabledButton: { backgroundColor: "#93c5fd" },
  saveButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});