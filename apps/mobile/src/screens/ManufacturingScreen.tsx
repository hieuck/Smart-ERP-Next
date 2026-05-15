import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from '@smart-erp/i18n';
import { api } from '../lib/api';

interface ProductionOrder {
  id: string;
  orderCode: string;
  productName: string;
  quantity: number;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  in_progress: '#2563eb',
  completed: '#059669',
  cancelled: '#dc2626',
};

export default function ManufacturingScreen() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/manufacturing/orders');
      setOrders(res.data || []);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('manufacturing.title')}</Text>
      <TouchableOpacity style={styles.addBtn}>
        <Text style={styles.addBtnText}>{t('manufacturing.createOrder')}</Text>
      </TouchableOpacity>

      {orders.length === 0 ? (
        <Text style={styles.empty}>No production orders</Text>
      ) : orders.map((order) => (
        <View key={order.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.orderCode}>{order.orderCode}</Text>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[order.status] + '20' }]}>
              <Text style={[styles.badgeText, { color: STATUS_COLORS[order.status] }]}>
                {t(`manufacturing.status.${order.status}`)}
              </Text>
            </View>
          </View>
          <Text style={styles.productName}>{order.productName}</Text>
          <Text style={styles.qty}>Qty: {order.quantity}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  addBtn: { backgroundColor: '#2563eb', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCode: { fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  productName: { fontSize: 14, color: '#374151', marginTop: 4 },
  qty: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});