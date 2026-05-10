import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { api, type PaginatedResponse } from '../lib/api';
import { formatVND } from '@smart-erp/utils';

interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  customerGroup: string | null;
  currentDebt: string | null;
  totalPurchased: string | null;
  loyaltyPoints: string | null;
}

const GROUP_LABELS: Record<string, { label: string; color: string }> = {
  retail:    { label: 'Bán lẻ', color: '#6b7280' },
  wholesale: { label: 'Bán sỉ', color: '#2563eb' },
  vip:       { label: 'VIP',    color: '#d97706' },
};

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchCustomers = useCallback(async (p = 1, s = search, append = false) => {
    try {
      const params = new URLSearchParams({ page: p.toString(), limit: '20' });
      if (s) params.set('search', s);
      const data = await api.get<PaginatedResponse<Customer>>(`/customers?${params}`);
      setCustomers((prev) => append ? [...prev, ...data.items] : data.items);
      setHasMore(p < data.totalPages);
    } catch (err) {
      console.error('Customers fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => { fetchCustomers(1, search); }, []);

  const handleSearch = () => { setPage(1); setLoading(true); fetchCustomers(1, search); };
  const handleRefresh = () => { setRefreshing(true); setPage(1); fetchCustomers(1, search); };
  const handleLoadMore = () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetchCustomers(next, search, true);
  };

  const renderItem = ({ item }: { item: Customer }) => {
    const groupInfo = GROUP_LABELS[item.customerGroup ?? ''];
    const hasDebt = parseFloat(item.currentDebt ?? '0') > 0;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.code}>{item.code}</Text>
          </View>
          {groupInfo && (
            <View style={[styles.groupBadge, { borderColor: groupInfo.color }]}>
              <Text style={[styles.groupText, { color: groupInfo.color }]}>{groupInfo.label}</Text>
            </View>
          )}
        </View>
        {item.phone && <Text style={styles.contact}>📞 {item.phone}</Text>}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Tổng mua</Text>
            <Text style={styles.statValue}>{formatVND(item.totalPurchased)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Công nợ</Text>
            <Text style={[styles.statValue, hasDebt && styles.debtValue]}>{formatVND(item.currentDebt)}</Text>
          </View>
          {item.loyaltyPoints && parseFloat(item.loyaltyPoints) > 0 && (
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Điểm</Text>
              <Text style={[styles.statValue, { color: '#d97706' }]}>
                {parseFloat(item.loyaltyPoints).toLocaleString('vi-VN')}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm theo tên, SĐT, mã KH..."
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Tìm</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Không có khách hàng nào</Text></View>}
          ListFooterComponent={hasMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#3b82f6" /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  searchInput: { flex: 1, height: 40, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' },
  searchBtn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: 12, gap: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
  cardInfo: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  code: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', marginTop: 1 },
  groupBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  groupText: { fontSize: 11, fontWeight: '600' },
  contact: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  stats: { flexDirection: 'row', gap: 16 },
  stat: {},
  statLabel: { fontSize: 10, color: '#9ca3af' },
  statValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  debtValue: { color: '#dc2626' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 8, color: '#9ca3af', fontSize: 14 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
});
