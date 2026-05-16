import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../lib/api';

interface Trip {
  id: string;
  tripNumber: string;
  status: string;
  startDate: string;
}

interface Stop {
  id: string;
  sequence: number;
  status: string;
  orderId: string;
}

export default function TmsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tms/trips');
      setTrips(res || []);
    } catch (error) {
      console.error('Failed to fetch TMS trips', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleConfirmDelivery = (stopId: string) => {
    Alert.prompt(
      'Xác nhận Giao hàng (PoD)',
      'Nhập tên người ký nhận hàng:',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận Giao',
          onPress: async (signatureName) => {
            if (!signatureName) return;
            try {
              await api.patch(`/tms/stops/${stopId}/confirm`, { 
                signature: signatureName,
                podUrl: 'https://cdn-icons-png.flaticon.com/512/3502/3502601.png' // Dummy signature image
              });
              Alert.alert('Thành công', 'Đã xác nhận giao hàng và cập nhật PoD.');
              fetchTrips();
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể xác nhận giao hàng');
            }
          }
        }
      ]
    );
  };

  const renderTrip = ({ item }: { item: Trip }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.tripNumber}>{item.tripNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? '#ecfdf5' : '#fff7ed' }]}>
            <Text style={[styles.statusText, { color: item.status === 'completed' ? '#059669' : '#d97706' }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.date}>Bắt đầu: {item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : 'N/A'}</Text>
        
        <TouchableOpacity style={styles.viewStopsBtn} onPress={() => {
          // In real case, navigate to TripDetail screen
          Alert.alert('Chi tiết lộ trình', 'Dự kiến 3 điểm dừng: Hà Nội -> Hà Nam -> Nam Định.');
        }}>
          <Text style={styles.viewStopsText}>Xem lộ trình ➔</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Giao nhận (TMS)</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={() => Alert.alert('Quét mã vận đơn', 'Tính năng đang khởi tạo...')}>
          <Text style={styles.scanBtnText}>📷 Quét mã</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{trips.filter(t => t.status === 'in_transit').length}</Text>
          <Text style={styles.statLabel}>Đang đi</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{trips.filter(t => t.status === 'planned').length}</Text>
          <Text style={styles.statLabel}>Chờ đi</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTrip}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={fetchTrips}
          refreshing={loading}
          ListEmptyComponent={
            <Text style={styles.empty}>Chưa có chuyến hàng nào.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  scanBtn: { backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  scanBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', elevation: 1 },
  statVal: { fontSize: 18, fontWeight: '800', color: '#059669' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  list: { paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tripNumber: { fontSize: 14, fontWeight: '800', color: '#111827' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },
  date: { fontSize: 12, color: '#6b7280', marginBottom: 16 },
  viewStopsBtn: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12 },
  viewStopsText: { fontSize: 13, color: '#059669', fontWeight: '600', textAlign: 'right' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 50 },
});
