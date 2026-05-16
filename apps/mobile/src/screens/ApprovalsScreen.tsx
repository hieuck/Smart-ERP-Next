import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../lib/api';
import { useTranslation } from '@smart-erp/i18n';

interface ApprovalRequest {
  id: string;
  documentType: string;
  documentId: string;
  status: string;
  requestedBy: string;
  createdAt: string;
}

export default function ApprovalsScreen() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await api.get('/approvals/pending');
      setRequests(res.data || []);
    } catch (error) {
      console.error('Failed to fetch pending approvals', error);
      Alert.alert(t('common.error'), 'Could not load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = (requestId: string, action: 'approve' | 'reject') => {
    Alert.alert(
      action === 'approve' ? 'Approve Request' : 'Reject Request',
      'Are you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.post(`/approvals/requests/${requestId}/${action}`, {
                comments: action === 'approve' ? 'Approved via Mobile' : 'Rejected via Mobile',
              });
              Alert.alert('Success', `Request ${action}d`);
              fetchPending();
            } catch (error) {
              Alert.alert('Error', `Failed to ${action} request`);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ApprovalRequest }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.docType}>{item.documentType.toUpperCase()}</Text>
        <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
      </View>
      <Text style={styles.requestedBy}>Requested by: {item.requestedBy}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.rejectButton]}
          onPress={() => handleAction(item.id, 'reject')}
        >
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.approveButton]}
          onPress={() => handleAction(item.id, 'approve')}
        >
          <Text style={styles.buttonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Approvals</Text>
      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={fetchPending}
        refreshing={loading}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending requests found.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  list: { paddingBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  docType: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  date: { fontSize: 12, color: '#9ca3af' },
  requestedBy: { fontSize: 16, color: '#374151', marginBottom: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  button: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  approveButton: { backgroundColor: '#059669' },
  rejectButton: { backgroundColor: '#dc2626' },
  buttonText: { color: '#fff', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { marginTop: 40, alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 16 },
});
