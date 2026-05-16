import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTranslation } from '@smart-erp/i18n';
import { api } from '../lib/api';

interface ProductionOrder {
  id: string;
  orderCode: string;
  productName: string;
  quantity: number;
  status: string;
  startDate?: string;
  completedAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  in_progress: '#2563eb',
  completed: '#059669',
  cancelled: '#dc2626',
};

const STATUS_ICONS: Record<string, string> = {
  draft: '\u23F3',
  in_progress: '\u25B6\uFE0F',
  completed: '\u2705',
  cancelled: '\u274C',
};

export default function ManufacturingScreen() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res: any = await api.get('/manufacturing/orders');
      setOrders(res.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filteredOrders = activeFilter === 'all'
    ? orders
    : orders.filter(o => o.status === activeFilter);

  const inProgressCount = orders.filter(o => o.status === 'in_progress').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const draftCount = orders.filter(o => o.status === 'draft').length;

  const FILTERS = [
    { key: 'all', label: t('orders.statusAll') || 'All' },
    { key: 'draft', label: t('manufacturing.status.draft') },
    { key: 'in_progress', label: t('manufacturing.status.in_progress') },
    { key: 'completed', label: t('manufacturing.status.completed') },
  ];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{t('actions.processing') || 'Loading...'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <Text style={styles.title}>{t('manufacturing.title')}</Text>
      <Text style={styles.subtitle}>{t('manufacturing.subtitle')}</Text>

      {/* Stat Cards Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: '#6366f1' }]}>
          <Text style={styles.statValue}>{orders.length}</Text>
          <Text style={styles.statLabel}>{t('manufacturing.stats.totalOrders')}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#2563eb' }]}>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>{inProgressCount}</Text>
          <Text style={styles.statLabel}>{t('manufacturing.stats.inProgress')}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#059669' }]}>
          <Text style={[styles.statValue, { color: '#059669' }]}>{completedCount}</Text>
          <Text style={styles.statLabel}>{t('manufacturing.stats.completedToday')}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#6b7280' }]}>
          <Text style={[styles.statValue, { color: '#6b7280' }]}>{draftCount}</Text>
          <Text style={styles.statLabel}>{t('manufacturing.status.draft')}</Text>
        </View>
      </ScrollView>

      {/* Create Button */}
      <TouchableOpacity style={styles.addBtn}>
        <Text style={styles.addBtnText}>+ {t('manufacturing.createOrder')}</Text>
      </TouchableOpacity>

      {/* Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setActiveFilter(f.key)}
            style={[
              styles.filterPill,
              activeFilter === f.key ? styles.filterPillActive : null,
            ]}
          >
            <Text style={[
              styles.filterPillText,
              activeFilter === f.key ? styles.filterPillTextActive : null,
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{'\uD83C\uDFED'}</Text>
          <Text style={styles.emptyText}>{t('common.noData') || 'No production orders'}</Text>
        </View>
      ) : (
        filteredOrders.map((order) => (
          <TouchableOpacity key={order.id} style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
              <View style={styles.codeWrap}>
                <Text style={styles.orderCode}>{order.orderCode}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[order.status] || '#6b7280') + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLORS[order.status] || '#6b7280' }]}>
                  {STATUS_ICONS[order.status] || ''} {t(`manufacturing.status.${order.status}`)}
                </Text>
              </View>
            </View>

            <Text style={styles.productName}>{order.productName}</Text>

            <View style={styles.cardFooter}>
              <View style={styles.footerItem}>
                <Text style={styles.footerLabel}>{t('manufacturing.quantity')}</Text>
                <Text style={styles.footerValue}>{Number(order.quantity).toLocaleString()}</Text>
              </View>
              {order.startDate ? (
                <View style={styles.footerItem}>
                  <Text style={styles.footerLabel}>{t('projects.startDate') || 'Start'}</Text>
                  <Text style={styles.footerValue}>
                    {new Date(order.startDate).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Progress indicator for in_progress orders */}
            {order.status === 'in_progress' ? (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '65%' }]} />
              </View>
            ) : null}
          </TouchableOpacity>
        ))
      )}

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 16 },

  // Stats
  statsRow: { marginBottom: 16 },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginRight: 10,
    minWidth: 120,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },

  // Create button
  addBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Filter pills
  filterRow: { marginBottom: 16 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#2563eb',
  },
  filterPillText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filterPillTextActive: { color: '#fff' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 15 },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeWrap: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderCode: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace', color: '#1d4ed8' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  productName: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 10 },

  // Card footer
  cardFooter: { flexDirection: 'row', marginTop: 12, gap: 20 },
  footerItem: {},
  footerLabel: { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' },
  footerValue: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 1 },

  // Progress bar
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },

  bottomPad: { height: 40 },
});