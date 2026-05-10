import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { api } from '../lib/api';
import { formatVND } from '@smart-erp/utils';

interface DashboardData {
  todayRevenue: number;
  todayOrders: number;
  totalCustomers: number;
  lowStockCount: number;
  recentOrders: {
    id: string;
    code: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
  insights: { type: string; severity: string; message: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#2563eb', processing: '#d97706', delivered: '#059669',
  cancelled: '#dc2626', draft: '#6b7280', shipped: '#7c3aed',
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Xác nhận', processing: 'Xử lý', delivered: 'Đã giao',
  cancelled: 'Đã hủy', draft: 'Nháp', shipped: 'Giao vận',
};

interface DashboardScreenProps {
  user: any;
}

export default function DashboardScreen({ user }: DashboardScreenProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const json = await api.get<DashboardData>('/insights/dashboard');
      setData(json);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, []);

  const handleRefresh = () => { setRefreshing(true); fetchDashboard(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  const stats = data ?? {
    todayRevenue: 0, todayOrders: 0, totalCustomers: 0, lowStockCount: 0,
    recentOrders: [], insights: [],
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />}
    >
      {/* Welcome */}
      <View style={styles.welcomeRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.welcomeText}>Xin chào,</Text>
          <Text style={styles.userName} numberOfLines={1}>{user?.name ?? user?.email}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Tổng quan hôm nay</Text>

      <View style={styles.statsGrid}>
        {[
          { label: 'Doanh thu', value: formatVND(stats.todayRevenue), color: '#3b82f6' },
          { label: 'Đơn hàng', value: stats.todayOrders.toString(), color: '#10b981' },
          { label: 'Khách hàng', value: stats.totalCustomers.toLocaleString('vi-VN'), color: '#8b5cf6' },
          {
            label: 'Sắp hết hàng',
            value: stats.lowStockCount.toString(),
            color: stats.lowStockCount > 0 ? '#ef4444' : '#10b981',
            danger: stats.lowStockCount > 0,
          },
        ].map((card) => (
          <View key={card.label} style={[styles.statCard, { borderLeftColor: card.color }]}>
            <Text style={styles.statLabel}>{card.label}</Text>
            <Text style={[styles.statValue, card.danger && { color: card.color }]}>{card.value}</Text>
          </View>
        ))}
      </View>

      {stats.insights.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Nhận xét</Text>
          <View style={styles.insightsContainer}>
            {stats.insights.map((insight, i) => (
              <View key={i} style={[
                styles.insightCard,
                insight.severity === 'high' && styles.insightHigh,
                insight.severity === 'medium' && styles.insightMedium,
              ]}>
                <Text style={styles.insightText}>{insight.message}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {stats.recentOrders.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Đơn hàng gần đây</Text>
          <View style={styles.ordersContainer}>
            {stats.recentOrders.map((order) => (
              <View key={order.id} style={styles.orderRow}>
                <View>
                  <Text style={styles.orderCode}>{order.code}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.createdAt).toLocaleString('vi-VN', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderTotal}>{formatVND(order.total)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[order.status] ?? '#6b7280'}20` }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] ?? '#6b7280' }]}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 8, color: '#9ca3af', fontSize: 14 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#2563eb' },
  welcomeText: { fontSize: 12, color: '#6b7280' },
  userName: { fontSize: 15, fontWeight: '600', color: '#111827', maxWidth: 200 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  statsGrid: { paddingHorizontal: 16, gap: 8 },
  statCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  statLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  insightsContainer: { paddingHorizontal: 16, gap: 8 },
  insightCard: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#10b981' },
  insightHigh: { backgroundColor: '#fef2f2', borderLeftColor: '#ef4444' },
  insightMedium: { backgroundColor: '#fffbeb', borderLeftColor: '#f59e0b' },
  insightText: { fontSize: 13, color: '#374151', lineHeight: 18 },
  ordersContainer: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, overflow: 'hidden' },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderCode: { fontSize: 13, fontWeight: '700', color: '#2563eb', fontFamily: 'monospace' },
  orderDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  orderTotal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '600' },
});
