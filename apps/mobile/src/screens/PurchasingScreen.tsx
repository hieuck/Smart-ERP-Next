import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
  ScrollView,
} from 'react-native';
import { useTranslation } from '@smart-erp/i18n';
import { api, type PaginatedResponse } from '../lib/api';
import { formatVND } from '@smart-erp/utils';

interface Supplier {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
}

interface PurchaseOrder {
  id: string;
  code: string;
  supplierName: string;
  supplierId: string;
  status: 'draft' | 'confirmed' | 'received' | 'cancelled';
  expectedDate: string | null;
  receivedDate: string | null;
  total: number;
  createdAt: string;
  items: PurchaseOrderItem[];
}

type POStatus = 'all' | 'draft' | 'confirmed' | 'received' | 'cancelled';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Nháp',        color: '#6b7280', bg: '#f3f4f6' },
  confirmed: { label: 'Đã xác nhận', color: '#2563eb', bg: '#dbeafe' },
  received:  { label: 'Đã nhận',     color: '#059669', bg: '#d1fae5' },
  cancelled: { label: 'Đã hủy',      color: '#dc2626', bg: '#fee2e2' },
};

export default function PurchasingScreen() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<POStatus>('all');
  const [showModal, setShowModal] = useState(false);
  const [searchSupplier, setSearchSupplier] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [modalItems, setModalItems] = useState<PurchaseOrderItem[]>([]);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await api.get<PaginatedResponse<PurchaseOrder>>('/purchasing');
      setOrders(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error('Purchasing fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await api.get<PaginatedResponse<Supplier>>('/suppliers');
      setSuppliers(Array.isArray(data) ? data : data.items || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchOrders(); fetchSuppliers(); }, []);

  const filteredOrders = activeFilter === 'all'
    ? orders
    : orders.filter((o) => o.status === activeFilter);

  const supplierSearchResults = suppliers.filter((s) =>
    !searchSupplier || s.name.toLowerCase().includes(searchSupplier.toLowerCase())
  );

  const addItem = () => {
    setModalItems([...modalItems, { productId: '', productName: '', quantity: 1, unitPrice: 0 }]);
  };

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const updated = [...modalItems];
    updated[index] = { ...updated[index], [field]: value };
    setModalItems(updated);
  };

  const removeItem = (index: number) => {
    setModalItems(modalItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedSupplier || modalItems.length === 0) {
      Alert.alert(t('common.error'), t('purchasing.selectSupplierAndItems'));
      return;
    }
    try {
      await api.post('/purchasing', {
        supplierId: selectedSupplier.id,
        items: modalItems.filter((i) => i.productId && i.quantity > 0),
      });
      setShowModal(false);
      setSelectedSupplier(null);
      setModalItems([]);
      setSearchSupplier('');
      fetchOrders();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('purchasing.createError'));
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await api.patch(`/purchasing/${id}/receive`);
      fetchOrders();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('purchasing.receiveError'));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.patch(`/purchasing/${id}/cancel`);
      fetchOrders();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('purchasing.cancelError'));
    }
  };

  const subtotal = modalItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice - (item.discountAmount || 0), 0
  );
  const tax = modalItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * ((item.taxRate || 0) / 100), 0
  );
  const total = subtotal + tax;

  const renderItem = ({ item }: { item: PurchaseOrder }) => {
    const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.draft;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderCode}>{item.code}</Text>
            <Text style={styles.supplierName}>{item.supplierName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{t(statusInfo.label)}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('purchasing.items')}:</Text>
            <Text style={styles.value}>{item.items.length}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('purchasing.total')}:</Text>
            <Text style={styles.value}>{formatVND(item.total)}</Text>
          </View>
          {item.expectedDate && (
            <View style={styles.row}>
              <Text style={styles.label}>{t('purchasing.expectedDate')}:</Text>
              <Text style={styles.value}>{new Date(item.expectedDate).toLocaleDateString('vi-VN')}</Text>
            </View>
          )}
          {item.receivedDate && (
            <View style={styles.row}>
              <Text style={styles.label}>{t('purchasing.receivedAt')}:</Text>
              <Text style={styles.value}>{new Date(item.receivedDate).toLocaleDateString('vi-VN')}</Text>
            </View>
          )}
        </View>
        {item.status === 'draft' && (
          <View style={styles.cardActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]} onPress={() => handleReceive(item.id)}>
              <Text style={styles.actionBtnText}>{t('purchasing.confirmReceive')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]} onPress={() => handleCancel(item.id)}>
              <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>{t('purchasing.cancel')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === 'confirmed' && (
          <View style={styles.cardActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => handleReceive(item.id)}>
              <Text style={styles.actionBtnText}>{t('purchasing.confirmReceive')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('purchasing.title')}</Text>
        <Text style={styles.headerSub}>{t('purchasing.subtitle', { count: orders.length })}</Text>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {(['all', 'draft', 'confirmed', 'received', 'cancelled'] as POStatus[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setActiveFilter(f)}
            style={[styles.filterBtn, activeFilter === f && styles.filterActive]}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f === 'all' ? t('purchasing.all') : t(`purchasing.${f}` as any)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchOrders} tintColor="#3b82f6" />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>{t('purchasing.empty')}</Text></View>}
          ListFooterComponent={orders.length > 0 && <Text style={styles.footerText}>{orders.length} {t('purchasing.orders')}</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create PO Modal */}
      {showModal && (
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.modalTitle}>{t('purchasing.add')}</Text>

            {/* Supplier search */}
            <Text style={styles.fieldLabel}>{t('suppliers.title')}</Text>
            <TextInput
              value={searchSupplier}
              onChangeText={(txt) => {
                setSearchSupplier(txt);
                if (!selectedSupplier || !txt.includes(selectedSupplier.name)) setSelectedSupplier(null);
              }}
              placeholder={t('suppliers.searchPlaceholder')}
              style={styles.input}
            />
            {searchSupplier && supplierSearchResults.length > 0 && (
              <View style={styles.dropdown}>
                {supplierSearchResults.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => { setSelectedSupplier(s); setSearchSupplier(s.name); }}
                    style={styles.dropdownItem}>
                    <Text style={styles.dropdownName}>{s.name}</Text>
                    <Text style={styles.dropdownSku}>{s.code}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {selectedSupplier && (
              <View style={styles.chip}>
                <Text>{selectedSupplier.name}</Text>
                <TouchableOpacity onPress={() => { setSelectedSupplier(null); setSearchSupplier(''); }}>
                  <Text style={{ color: '#dc2626' }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Items */}
            <Text style={styles.fieldLabel}>{t('purchasing.items')}</Text>
            {modalItems.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <TextInput
                  value={item.productName}
                  onChangeText={(txt) => updateItem(index, 'productName', txt)}
                  placeholder={t('products.searchPlaceholder')}
                  style={[styles.input, { flex: 2 }]}
                />
                <TextInput
                  value={String(item.quantity)}
                  onChangeText={(txt) => updateItem(index, 'quantity', parseInt(txt) || 0)}
                  placeholder="SL"
                  keyboardType="numeric"
                  style={[styles.input, { flex: 1, marginLeft: 8 }]}
                />
                <TextInput
                  value={String(item.unitPrice)}
                  onChangeText={(txt) => updateItem(index, 'unitPrice', parseFloat(txt) || 0)}
                  placeholder={t('products.price')}
                  keyboardType="numeric"
                  style={[styles.input, { flex: 1.5, marginLeft: 8 }]}
                />
                <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
                  <Text style={{ color: '#dc2626' }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.row}>
              <TouchableOpacity style={[styles.addBtn, { flex: 1 }]} onPress={addItem}>
                <Text style={styles.addBtnText}>+ {t('purchasing.addItem')}</Text>
              </TouchableOpacity>
            </View>

            {/* Summary */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text>{t('products.price')} ({t('purchasing.subtotal')})</Text>
                <Text style={styles.summaryValue}>{formatVND(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text>{t('purchasing.tax')}</Text>
                <Text style={styles.summaryValue}>{formatVND(tax)}</Text>
              </View>
              <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, marginTop: 4 }]}>
                <Text style={{ fontWeight: '700' }}>{t('purchasing.total')}</Text>
                <Text style={[styles.summaryValue, { fontWeight: '700' }]}>{formatVND(total)}</Text>
              </View>
            </View>

            {/* Expected date */}
            <Text style={styles.fieldLabel}>{t('purchasing.expectedDate')}</Text>
            <TextInput
              placeholder="YYYY-MM-DD"
              style={styles.input}
            />

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (!selectedSupplier || modalItems.length === 0) && styles.disabledButton]}
                onPress={handleSubmit}>
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 8, color: '#9ca3af', fontSize: 14 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  // Filters
  filterRow: { flexDirection: 'row', padding: 8, gap: 6, backgroundColor: '#fff' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6' },
  filterActive: { backgroundColor: '#eff6ff' },
  filterText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#2563eb', fontWeight: '700' },

  // List
  list: { padding: 12 },
  footerText: { textAlign: 'center', padding: 8, color: '#9ca3af', fontSize: 12 },

  // Card
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderCode: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace', color: '#2563eb' },
  supplierName: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardBody: { marginTop: 10, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 12, color: '#6b7280', flex: 1 },
  value: { fontSize: 12, fontWeight: '600', color: '#111827' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // FAB
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', padding: 0 },
  modalContent: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 8, color: '#111827' },
  dropdown: { backgroundColor: '#f9fafb', borderRadius: 8, marginBottom: 8 },
  dropdownItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  dropdownName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  dropdownSku: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eff6ff', padding: 10, borderRadius: 8, marginBottom: 8 },

  // Items
  itemRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  removeBtn: { padding: 8 },
  addBtn: { paddingVertical: 10, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  addBtnText: { color: '#3b82f6', fontWeight: '600', fontSize: 13 },

  // Summary
  summaryBox: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  // Buttons
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16, paddingBottom: 20 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#3b82f6', alignItems: 'center' },
  saveButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  disabledButton: { backgroundColor: '#93c5fd' },
});