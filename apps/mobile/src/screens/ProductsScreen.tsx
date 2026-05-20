import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Image,
  Modal, ScrollView, Alert,
} from 'react-native';
import { useTranslation } from '@smart-erp/i18n';
import { api, type PaginatedResponse } from '../lib/api';
import { formatVND } from '@smart-erp/utils';

interface Product {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  price: string;
  cost: string | null;
  stock: number;
  minStock: number | null;
  unit: string | null;
  category: string | null;
  isActive: boolean;
}

type ProductDraft = {
  name: string;
  sku: string;
  imageUrl: string;
  category: string;
  price: string;
  stock: string;
};

const emptyDraft: ProductDraft = {
  name: '',
  sku: '',
  imageUrl: '',
  category: '',
  price: '',
  stock: '0',
};

export default function ProductsScreen() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);

  const fetchProducts = async (p = 1, s = search, append = false) => {
    try {
      const params = new URLSearchParams({ page: p.toString(), limit: '20' });
      if (s.trim()) params.set('search', s.trim());
      const data = await api.get<PaginatedResponse<Product>>(`/products?${params}`);
      setProducts((prev) => append ? [...prev, ...data.items] : data.items);
      setHasMore(p < data.totalPages);
      setIsOffline(false);
    } catch {
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

  const closeCreate = () => {
    setCreateOpen(false);
    setDraft(emptyDraft);
  };

  const createProduct = async () => {
    if (!draft.name.trim()) {
      Alert.alert(t('common.error'), t('validation.required', { field: t('products.name') }));
      return;
    }
    const price = Number(draft.price);
    if (!Number.isFinite(price) || price < 0) {
      Alert.alert(t('common.error'), t('products.price'));
      return;
    }

    setSaving(true);
    try {
      await api.post<Product>('/products', {
        name: draft.name.trim(),
        sku: draft.sku.trim() || undefined,
        imageUrl: draft.imageUrl.trim() || undefined,
        category: draft.category.trim() || undefined,
        price,
        stock: Number(draft.stock) || 0,
        isActive: true,
      });
      closeCreate();
      setPage(1);
      setLoading(true);
      await fetchProducts(1, search);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message ?? t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: Product }) => {
    const isLow = item.stock <= (item.minStock ?? 0);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.imageFallbackText}>IMG</Text>
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.productSku}>{item.sku}</Text>
            {item.category ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.category}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.price}>{formatVND(item.price)}</Text>
            <Text style={[styles.stock, isLow && styles.stockLow]}>
              {isLow ? `${t('inventory.lowStock')} · ` : ''}{item.stock} {item.unit ?? ''}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>{t('sync.status.offline')}</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{t('products.title')}</Text>
          <Text style={styles.subtitle}>{products.length} {t('common.products')}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateOpen(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

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
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563eb" />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>{t('common.noData')}</Text></View>}
          ListFooterComponent={hasMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#2563eb" /> : null}
        />
      )}

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={closeCreate}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('products.add')}</Text>
              <TouchableOpacity onPress={closeCreate} style={styles.closeBtn}>
                <Text style={styles.closeText}>x</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>{t('products.name')}</Text>
              <TextInput
                style={styles.input}
                value={draft.name}
                onChangeText={(name) => setDraft((prev) => ({ ...prev, name }))}
                placeholder="Tên sản phẩm"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>{t('products.sku')}</Text>
              <TextInput
                style={styles.input}
                value={draft.sku}
                onChangeText={(sku) => setDraft((prev) => ({ ...prev, sku }))}
                placeholder="Tự tạo nếu để trống"
                autoCapitalize="characters"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>{t('products.category')}</Text>
              <TextInput
                style={styles.input}
                value={draft.category}
                onChangeText={(category) => setDraft((prev) => ({ ...prev, category }))}
                placeholder="Danh mục"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Ảnh sản phẩm</Text>
              <TextInput
                style={styles.input}
                value={draft.imageUrl}
                onChangeText={(imageUrl) => setDraft((prev) => ({ ...prev, imageUrl }))}
                placeholder="https://example.com/product.jpg"
                autoCapitalize="none"
                placeholderTextColor="#9ca3af"
              />

              <View style={styles.inlineFields}>
                <View style={styles.inlineField}>
                  <Text style={styles.label}>{t('products.price')}</Text>
                  <TextInput
                    style={styles.input}
                    value={draft.price}
                    onChangeText={(price) => setDraft((prev) => ({ ...prev, price }))}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={styles.inlineField}>
                  <Text style={styles.label}>{t('products.stock')}</Text>
                  <TextInput
                    style={styles.input}
                    value={draft.stock}
                    onChangeText={(stock) => setDraft((prev) => ({ ...prev, stock }))}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={createProduct} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('actions.save')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  offlineBanner: { backgroundColor: '#fef3c7', padding: 8 },
  offlineText: { color: '#92400e', textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: -2 },
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  searchInput: { flex: 1, height: 42, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 12, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  searchBtn: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  productImage: { width: 58, height: 58, borderRadius: 12, backgroundColor: '#e5e7eb' },
  imageFallback: { width: 58, height: 58, borderRadius: 12, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { fontSize: 11, color: '#0369a1', fontWeight: '800' },
  cardInfo: { flex: 1, marginHorizontal: 12 },
  cardRight: { alignItems: 'flex-end', maxWidth: 120 },
  productName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  productSku: { fontSize: 11, color: '#64748b', marginTop: 3, fontFamily: 'monospace' },
  price: { fontSize: 14, fontWeight: '800', color: '#2563eb' },
  stock: { fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'right' },
  stockLow: { color: '#dc2626', fontWeight: '700' },
  tag: { marginTop: 7, alignSelf: 'flex-start', backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 8, color: '#94a3b8', fontSize: 14 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#475569', fontWeight: '800', fontSize: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  inlineFields: { flexDirection: 'row', gap: 10 },
  inlineField: { flex: 1 },
  saveBtn: { marginTop: 16, backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#93c5fd' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
