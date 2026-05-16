import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useTranslation } from '@smart-erp/i18n';
import { api } from '../lib/api';
import { formatVND } from '@smart-erp/utils';
import { ActivityList } from '../components/ActivityList';
import { QuickActions } from '../components/QuickActions';
import { syncService } from '../lib/sync-service';
import { BiChart } from '../components/BiChart';

interface DashboardData {
  todayRevenue: number;
  todayOrders: number;
  totalCustomers: number;
  lowStockCount: number;
  pendingApprovals: number;
  recentOrders: {
    id: string;
    code: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
  revenueChart: { date: string; revenue: number }[];
  metrics?: {
    predictedNextMonth: number;
    revenueTrend: number;
  };
  insights: { type: string; severity: string; message: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#2563eb', processing: '#d97706', delivered: '#059669',
  cancelled: '#dc2626', draft: '#6b7280', shipped: '#7c3aed',
};

interface DashboardScreenProps {
  user: any;
}

export default function DashboardScreen({ user }: DashboardScreenProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchLastSync = async () => {
    const ts = await syncService.getLastSyncTime();
    if (ts) setLastSync(new Date(ts));
  };

  const fetchDashboard = useCallback(async () => {
    try {
      const json = await api.get<DashboardData>('/insights/dashboard');
      let pendingCount = 0;
      try {
        const pendingRes = await api.get<{ total: number }>('/approvals?status=pending&limit=1');
        pendingCount = pendingRes.total ?? 0;
      } catch (err) { /* ignore */ }
      setData({ ...json, pendingApprovals: pendingCount });
      await fetchLastSync();
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
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const stats = data ?? {
    todayRevenue: 0, todayOrders: 0, totalCustomers: 0, lowStockCount: 0, pendingApprovals: 0,
    recentOrders: [], insights: [],
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />}
    >
      <View style={styles.welcomeRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.welcomeText}>{t('dashboard.welcome')}</Text>
          <Text style={styles.userName} numberOfLines={1}>{user?.name ?? user?.email}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('dashboard.sectionTitle')}</Text>

      <View style={styles.statsGrid}>
        {[
          { label: t('dashboard.todayRevenue'), value: formatVND(stats.todayRevenue), color: '#3b82f6' },
          { label: t('dashboard.todayOrders'), value: stats.todayOrders.toString(), color: '#10b981' },
          { label: t('dashboard.pendingApprovals'), value: stats.pendingApprovals.toString(), color: '#f59e0b', danger: stats.pendingApprovals > 0 },
          { label: t('dashboard.lowStock'), value: stats.lowStockCount.toString(), color: stats.lowStockCount > 0 ? '#ef4444' : '#10b981', danger: stats.lowStockCount > 0 },
        ].map((card) => (
          <View key={card.label} style={[styles.statCard, { borderLeftColor: card.color }]}>
            <Text style={styles.statLabel}>{card.label}</Text>
            <Text style={[styles.statValue, card.danger && { color: card.color }]}>{card.value}</Text>
          </View>
        ))}
      </View>

      {stats.revenueChart && stats.revenueChart.length > 0 && (
        <BiChart 
          data={stats.revenueChart} 
          title={t('dashboard.revenueTrend', 'Xu hướng Doanh thu (7 ngày)')} 
        />
      )}

      {stats.metrics?.predictedNextMonth && (
        <View style={styles.aiPredictionCard}>
          <View style={styles.aiIcon}>
            <Text style={{ fontSize: 20 }}>🤖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>Dự báo AI (Tháng tới)</Text>
            <Text style={styles.aiValue}>{formatVND(stats.metrics.predictedNextMonth)}</Text>
            <Text style={styles.aiHint}>Dựa trên xu hướng tăng trưởng {stats.metrics.revenueTrend}%</Text>
          </View>
        </View>
      )}

      {stats.insights.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('dashboard.insights')}</Text>
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
          <Text style={styles.sectionTitle}>{t('dashboard.recentOrders')}</Text>
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
                      {t(`orders.status.${order.status}`, { defaultValue: order.status })}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <QuickActions />
      <ActivityList />

      {lastSync && (
        <View style={styles.lastSyncContainer}>
          <Text style={styles.lastSyncText}>
            {t('sync.lastSync')}: {lastSync.toLocaleString('vi-VN')}
          </Text>
        </View>
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
  lastSyncContainer: { marginTop: 12, paddingHorizontal: 16, alignItems: 'flex-end' },
  lastSyncText: { fontSize: 11, color: '#9ca3af' },
  aiPredictionCard: {
    backgroundColor: '#1e1b4b',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: { color: '#a5b4fc', fontSize: 12, fontWeight: '600' },
  aiValue: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  aiHint: { color: '#818cf8', fontSize: 11, marginTop: 4 },
});