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
import { useTranslation } from '@smart-erp/i18n';
import { formatVND } from '@smart-erp/utils';

interface Suggestion {
  id: string;
  productName: string;
  suggestedQuantity: string;
  currentStock: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: string;
}

export default function ScmScreen() {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/scm/suggestions');
      setSuggestions(res || []);
    } catch (error) {
      console.error('Failed to fetch suggestions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/scm/suggestions/${id}/approve`, {});
      Alert.alert('Thành công', 'Đã duyệt gợi ý nhập hàng. Đơn mua hàng nháp (Draft PO) đã được khởi tạo.');
      fetchSuggestions();
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể duyệt gợi ý');
    }
  };

  const runAIEngine = async () => {
    try {
      setLoading(true);
      await api.post('/scm/suggestions/run', {});
      fetchSuggestions();
      Alert.alert('AI Engine', 'Đã hoàn tất phân tích dự báo nhu cầu.');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể chạy AI engine');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Suggestion }) => {
    const priorityColor = 
      item.priority === 'critical' ? '#dc2626' : 
      item.priority === 'high' ? '#d97706' : '#2563eb';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.productName}>{item.productName}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {item.priority.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.reason}>{item.reason}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Tồn hiện tại</Text>
            <Text style={styles.statValue}>{item.currentStock}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Gợi ý nhập</Text>
            <Text style={styles.statValue}>{item.suggestedQuantity}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item.id)}>
          <Text style={styles.approveBtnText}>Duyệt nhập hàng</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gợi ý Nhập hàng (AI)</Text>
        <TouchableOpacity style={styles.aiBtn} onPress={runAIEngine}>
          <Text style={styles.aiBtnText}>🤖 Chạy AI</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={suggestions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={fetchSuggestions}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Chưa có gợi ý nhập hàng mới.</Text>
            </View>
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
  aiBtn: { backgroundColor: '#1e1b4b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  aiBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  list: { paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  productName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  priorityText: { fontSize: 10, fontWeight: '800' },
  reason: { fontSize: 13, color: '#6b7280', marginBottom: 12, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  stat: { flex: 1 },
  statLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '700', color: '#374151' },
  approveBtn: { backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#9ca3af' },
});
