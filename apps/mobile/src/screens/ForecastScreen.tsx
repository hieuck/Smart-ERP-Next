import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { api } from '../lib/api';

interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number | null;
}

interface Forecast {
  product_id: string;
  predicted_daily_demand: { date: string; quantity: number }[];
  suggested_order_quantity: number;
  confidence_lower: { date: string; quantity: number }[];
  confidence_upper: { date: string; quantity: number }[];
}

export default function ForecastScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [forecasts, setForecasts] = useState<Record<string, Forecast>>({});
  const [loading, setLoading] = useState(true);
  const [forecasting, setForecasting] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products', { params: { limit: 50 } });
      setProducts(res.data.items || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi', 'Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const runForecast = async (productId: string) => {
    setForecasting(productId);
    try {
      const forecastRes = await api.post('/ai/forecast', {
        product_id: productId,
        lookahead_days: 14,
      });

      setForecasts((prev) => ({
        ...prev,
        [productId]: forecastRes.data,
      }));
    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi', 'Không thể dự báo');
    } finally {
      setForecasting(null);
    }
  };

  const getStatus = (stock: number, minStock: number) => {
    if (stock <= 0) return { label: 'Hết hàng', color: '#dc2626' };
    if (stock <= minStock) return { label: 'Sắp hết', color: '#f59e0b' };
    return { label: 'Bình thường', color: '#10b981' };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.productList}>
        {products.map((product) => {
          const min = product.minStock ?? 0;
          const status = getStatus(product.stock, min);
          const hasForecast = !!forecasts[product.id];
          const isForecasting = forecasting === product.id;

          return (
            <TouchableOpacity
              key={product.id}
              style={[styles.productCard, selectedProduct === product.id && styles.selectedCard]}
              onPress={() => {
                setSelectedProduct(product.id);
                if (!hasForecast && !isForecasting) runForecast(product.id);
              }}
            >
              <View style={styles.productHeader}>
                <View>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productSku}>{product.sku}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
              <View style={styles.productFooter}>
                <Text style={styles.stockText}>Tồn: {product.stock}</Text>
                {isForecasting && <ActivityIndicator size="small" color="#3b82f6" />}
                {hasForecast && !isForecasting && (
                  <Text style={styles.suggestedText}>
                    Gợi ý: {forecasts[product.id].suggested_order_quantity}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedProduct && forecasts[selectedProduct] && (
        <ScrollView style={styles.detailPanel}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>
              {products.find(p => p.id === selectedProduct)?.name}
            </Text>
            <Text style={styles.suggestedOrder}>
              Gợi ý đặt hàng: {forecasts[selectedProduct].suggested_order_quantity}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Dự báo 7 ngày tới</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Ngày</Text>
              <Text style={styles.tableHeaderCell}>Dự báo</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.6 }]}>Thấp</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.6 }]}>Cao</Text>
            </View>
            {forecasts[selectedProduct].predicted_daily_demand.slice(0, 7).map((day, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{day.date}</Text>
                <Text style={styles.tableCell}>{day.quantity}</Text>
                <Text style={[styles.tableCell, { flex: 0.6 }]}>
                  {forecasts[selectedProduct].confidence_lower[idx]?.quantity ?? '—'}
                </Text>
                <Text style={[styles.tableCell, { flex: 0.6 }]}>
                  {forecasts[selectedProduct].confidence_upper[idx]?.quantity ?? '—'}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, color: '#9ca3af', fontSize: 14 },
  productList: { flex: 1 },
  productCard: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  selectedCard: { borderWidth: 2, borderColor: '#3b82f6' },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  productSku: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  stockText: { fontSize: 12, color: '#6b7280' },
  suggestedText: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  detailPanel: { flex: 1.5, backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, marginTop: 8 },
  detailHeader: { marginBottom: 16 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  suggestedOrder: { fontSize: 14, color: '#3b82f6', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginVertical: 8, color: '#374151' },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', paddingVertical: 8, paddingHorizontal: 8 },
  tableHeaderCell: { flex: 1, fontWeight: '600', fontSize: 12, color: '#6b7280' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  tableCell: { flex: 1, fontSize: 12, color: '#111827' },
});