import React, { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initI18n, useTranslation } from '@smart-erp/i18n';
import { syncService } from '@smart-erp/sync';

// Khởi tạo i18n với tiếng Việt mặc định
initI18n('vi');

export default function App() {
  const { t } = useTranslation();

  useEffect(() => {
    // Kích hoạt xử lý hàng đợi sync khi có mạng
    syncService.processQueue().catch(console.error);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>{t('welcome')}</Text>
      <Text style={styles.subtitle}>{t('offline_mode')}</Text>
      <Text style={styles.syncText}>{t('sync')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  syncText: {
    fontSize: 14,
    color: '#007AFF',
  },
});