import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api';

interface ReorderSuggestion {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  reorderQuantity: number;
  suggestedOrderQuantity: number;
}

export default function ReorderPointsScreen() {
  const { t } = useTranslation('common');
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/inventory/reorder-suggestions');
      setSuggestions(res.data);
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tải gợi ý');
    } finally {
      setLoading(false);
    }
  };

  const updateReorderPoints = async (productId: string, minStock?: number, reorderQuantity?: number) => {
    setUpdating(productId);
    try {
      await apiClient.patch(`/products/${productId}/reorder-points`, {
        minStock,
        reorderQuantity,
      });
      await fetchSuggestions(); // refresh list
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('inventory.reorderPoints')}</Text>
      {suggestions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('inventory.noReorderSuggestions')}</Text>
        </View>
      ) : (
        suggestions.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.sku}>{item.sku}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('inventory.stock')}:</Text>
              <Text style={styles.value}>{item.stock}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('inventory.reorderPoint')}:</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(item.minStock ?? 0)}
                onChangeText={(text) => {
                  const val = parseInt(text) || 0;
                  updateReorderPoints(item.id, val, item.reorderQuantity);
                }}
                editable={updating !== item.id}
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('inventory.reorderQuantity')}:</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(item.reorderQuantity ?? 0)}
                onChangeText={(text) => {
                  const val = parseInt(text) || 0;
                  updateReorderPoints(item.id, item.minStock, val);
                }}
                editable={updating !== item.id}
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('inventory.suggestedOrder')}:</Text>
              <Text style={[styles.value, styles.suggested]}>
                {item.suggestedOrderQuantity > 0 ? item.suggestedOrderQuantity : '—'}
              </Text>
            </View>
            {updating === item.id && (
              <ActivityIndicator size="small" style={styles.inlineLoader} />
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1e293b',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  sku: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  label: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  suggested: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 100,
    textAlign: 'right',
    fontSize: 14,
    color: '#0f172a',
  },
  inlineLoader: {
    marginTop: 12,
  },
});
