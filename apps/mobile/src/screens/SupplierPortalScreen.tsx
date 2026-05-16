import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { api } from '../lib/api';
import { formatVND } from '@smart-erp/utils';

export default function SupplierPortalScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      // In real app, the backend would resolve the supplierId from the user token
      const supplierId = 'dummy-supplier-id'; 
      const [ordersRes, perfRes] = await Promise.all([
        api.get(`/suppliers/collaboration/orders`),
        api.get(`/suppliers/collaboration/performance`)
      ]);
      setOrders(ordersRes || []);
      setPerformance(perfRes);
    } catch (err) {
      console.error('Fetch supplier portal data failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmShipment = (poId: string) => {
    Alert.confirm(
      'Xác nhận Giao hàng',
      'Bạn có chắc chắn muốn xác nhận đã gửi hàng cho đơn này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              await api.post(`/suppliers/collaboration/orders/${poId}/confirm`);
              Alert.alert('Thành công', 'Đã xác nhận giao hàng. Kho sẽ được thông báo.');
              fetchData();
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể xác nhận giao hàng');
            }
          }
        }
      ]
    );
  };

  const renderOrder = ({ item }: { item: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderCode}>{item.orderCode}</Text>
        <Text style={[styles.orderStatus, { color: item.status === 'received' ? '#059669' : '#d97706' }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.orderTotal}>{formatVND(item.totalAmount)}</Text>
      <Text style={styles.orderDate}>Ngày dự kiến: {new Date(item.expectedDate).toLocaleDateString('vi-VN')}</Text>
      
      {item.status === 'pending' && (
        <TouchableOpacity style={styles.shipBtn} onPress={() => handleConfirmShipment(item.id)}>
          <Text style={styles.shipBtnText}>🚚 Xác nhận đã giao</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trung tâm Nhà cung cấp</Text>

      {performance && (
        <View style={styles.perfCard}>
          <View style={styles.perfItem}>
            <Text style={styles.perfVal}>{performance.onTimeDeliveryRate}%</Text>
            <Text style={styles.perfLabel}>Đúng hạn</Text>
          </View>
          <View style={styles.perfItem}>
            <Text style={styles.perfVal}>{performance.qualityScore}/100</Text>
            <Text style={styles.perfLabel}>Chất lượng</Text>
          </View>
          <View style={styles.perfItem}>
            <Text style={styles.perfVal}>{performance.totalOrders}</Text>
            <Text style={styles.perfLabel}>Tổng đơn</Text>
          </View>
        </View>
      )}

      <Text style={styles.subtitle}>Đơn mua hàng (PO)</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={fetchData}
          refreshing={loading}
          ListEmptyComponent={<Text style={styles.empty}>Chưa có đơn hàng nào.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  subtitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 },
  perfCard: { flexDirection: 'row', backgroundColor: '#1e1b4b', borderRadius: 16, padding: 16, marginBottom: 24, justifyContent: 'space-between' },
  perfItem: { alignItems: 'center' },
  perfVal: { color: '#fff', fontSize: 18, fontWeight: '800' },
  perfLabel: { color: '#9ca3af', fontSize: 10, marginTop: 4 },
  list: { paddingBottom: 20 },
  orderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderCode: { fontSize: 14, fontWeight: '700', color: '#111827' },
  orderStatus: { fontSize: 11, fontWeight: '800' },
  orderTotal: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
  orderDate: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  shipBtn: { backgroundColor: '#4f46e5', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  shipBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 50 },
});
