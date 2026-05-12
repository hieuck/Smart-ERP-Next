import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const PRODUCTS_CACHE_KEY = 'cached_products';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function getProducts(page = 1, search = '', limit = 20) {
  const cacheKey = `${PRODUCTS_CACHE_KEY}_${page}_${search}_${limit}`;
  try {
    const res = await api.get('/products', { params: { page, limit, search: search || undefined } });
    const freshData = res.data.items;
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      data: freshData,
      timestamp: Date.now(),
    }));
    return freshData;
  } catch (err) {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    }
    throw err;
  }
}