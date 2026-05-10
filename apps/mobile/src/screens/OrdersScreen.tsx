import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { api, type PaginatedResponse } from '../lib/api';
import { formatVND } from '@smart-erp/utils';

interface Order {
  id: string;
  code: string;
  status: string;
  channel: string;
  total: string;
  paidAmount: string | null;
  debtAmount: string | null;
  paymentStatus: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Nháp',      color: '#6b7280', bg: '#f3f4f6' },
  confirmed: { label: 'Xác nhận',  color: '#2563eb', bg: '#dbeafe' },
  processing:{ label: 'Xử lý',     color: '#d97706', bg: '#fef3c7' },
  shipped:   { label: 'Giao vận',  color: '#7c3aed', bg: '#ede9fe' },
  delivered: { label: 'Đã giao',   color: '#059669', bg: '#d1fae5' },
  cancelled: { label: 'Đã hủy',    color: '#dc2626', bg: '#fee2e2' },
};

const CHANNEL_LABELS: Record<string, string> = {
  pos: 'Tại quầy', online: 'Online', phone: 'Điện thoại', wholesale: 'Bán sỉ',
};

const STATUS_FILTERS = [
  { key: '', label: 'Tất cả' },
  { key: 'confirmed', label: 'Xác nhận' },
  { key: 'processing', label: 'Xử lý' },
  { key: 'delivered', label: 'Đã giao' },
  { key: 'cancelled', label: 'Đã hủy' },
];

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = useCallback(async (p = 1, status = statusFilter, append = false) => {
    try {
      const params = new URLSearchParams({ page: p.toString(), limit: '20' });
      if (status) params.set('status', status);
      const data = await api.get<PaginatedResponse<Order>>(`/orders?${params}`);
      setOrders((prev) => append ? [...prev, ...data.items] : data.items);
      setHasMore(p < data.totalPages);
    } catch (err) {
      console.error('Orders fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchOrders(1, statusFilter);
  }, [statusFilter]);

  const handleRefresh = () => { setRefreshing(true); setPage(1); fetchOrders(1, statusFilter); };
  const handleLoadMore = () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetchOrders(next, statusFilter, true);
  };

  const renderItem = ({ item }: { item: Order }) => {
    const statusInfo = STATUS_LABELS[item.status] ?? { label: item.status, color: '#6b7280', bg: '#f3f4f6' };
    const hasDebt = parseFloat(item.debtAmount ?? '0') > 0;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.code}>{item.code}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>
        <View style={styles.cardMid}>
          <Text style={styles.channel}>{CHANNEL_LABELS[item.channel] ?? item.channel}</Text>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.totalLabel}>Tổng tiền</Text>
            <Text style={styles.total}>{formatVND(item.total)}</Text>
          </View>
          {hasDebt && (
            <View style={styles.debtBadge}>
              <Text style={styles.debtText}>Nợ: {formatVND(item.debtAmount)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity key={f.key} onPress={() => setStatusFilter(f.key)}
            style={[styles.chip, statusFilter === f.key && styles.chipActive]}>
            <Text style={[styles.chipText, statusFilter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Không có đơn hàng nào</Text></View>}
          ListFooterComponent={hasMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#3b82f6" /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  list: { padding: 12, gap: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  code: { fontSize: 15, fontWeight: '700', color: '#2563eb', fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardMid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  channel: { fontSize: 12, color: '#6b7280' },
  date: { fontSize: 12, color: '#9ca3af' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  totalLabel: { fontSize: 11, color: '#9ca3af' },
  total: { fontSize: 18, fontWeight: '700', color: '#111827' },
  debtBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  debtText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 8, color: '#9ca3af', fontSize: 14 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
});
