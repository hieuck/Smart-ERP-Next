import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { api, type PaginatedResponse } from '../lib/api';
import { formatVND } from '@smart-erp/utils';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: string;
  cost: string | null;
  stock: number;
  minStock: number | null;
  unit: string | null;
  category: string | null;
  isActive: boolean;
}

export default function ProductsScreen() {
  const { t } = useTranslation('common');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const fetchProducts = async (p = 1, s = search, append = false) => {
    try {
      const data = await getProducts(p, s, 20);
      setProducts((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length === 20);
      setIsOffline(false);
    } catch (err) {
      setIsOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchProducts(1, search); }, []);

  const handleSearch = () => { setPage(1); setLoading(true); fetchProducts(1, search); };
  const handleRefresh = () => { setRefreshing(true); setPage(1); fetchProducts(1, search); };
  const handleLoadMore = () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetchProducts(next, search, true);
  };

  const renderItem = ({ item }: { item: Product }) => {
    const isLow = item.stock <= (item.minStock ?? 0);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.productSku}>{item.sku}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.price}>{formatVND(item.price)}</Text>
            <Text style={[styles.stock, isLow && styles.stockLow]}>
              {isLow ? t('inventory.lowStock') : ''} {t('products.stock')}: {item.stock}
            </Text>
          </View>
        </View>
        {item.category && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.category}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={{ backgroundColor: '#fef3c7', padding: 8 }}>
          <Text style={{ color: '#92400e', textAlign: 'center' }}>{t('common.offline_mode')}</Text>
        </View>
      )}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('products.searchPlaceholder')}
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>{t('actions.search')}</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>{t('common.noData')}</Text></View>}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 12 },
  cardRight: { alignItems: 'flex-end' },
  productName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  productSku: { fontSize: 11, color: '#9ca3af', marginTop: 2, fontFamily: 'monospace' },
  price: { fontSize: 15, fontWeight: '700', color: '#3b82f6' },
  stock: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  stockLow: { color: '#ef4444', fontWeight: '600' },
  tag: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, color: '#6b7280' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 8, color: '#9ca3af', fontSize: 14 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
});
